<?php

namespace App\Console\Commands;

use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use PDO;
use PDOException;
use Symfony\Component\Yaml\Yaml;

class ImportKoreader extends Command
{
    protected $signature = 'koreader:import
        {path? : Path to KOReader statistics.sqlite3 (default: storage/koreader/statistics.sqlite3)}
        {--dir= : Output directory for book markdown (defaults to the configured books source)}
        {--match= : Only import books whose title or author contains this text}
        {--limit= : Only import the N most recently opened books}
        {--min-progress= : Only import books with at least this read fraction (0-1)}
        {--status= : Force status for generated books (want|reading|finished|abandoned)}
        {--force : Overwrite existing markdown files}
        {--dry-run : Preview what would be created without writing}';

    protected $description = 'Create book markdown notes from a KOReader statistics database';

    private const SESSION_GAP_SECONDS = 30 * 60;

    private const MAX_PAGE_SECONDS = 120;

    private const NEPAL_TIME_SQL = "'+5 hours', '+45 minutes'";

    public function handle(): int
    {
        $path = $this->argument('path') ?: storage_path('koreader/statistics.sqlite3');

        if (! is_file($path)) {
            $this->error("KOReader database not found: {$path}");
            $this->line('Download it with:');
            $this->line('  sftp -P 2222 root@<kindle-ip>');
            $this->line('  get /mnt/us/koreader/settings/statistics.sqlite3 storage/koreader/statistics.sqlite3');

            return 1;
        }

        try {
            $pdo = new PDO('sqlite:'.$path);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            $this->error('Could not open KOReader database: '.$e->getMessage());

            return 1;
        }

        $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type IN ('table', 'view')")
            ->fetchAll(PDO::FETCH_COLUMN);

        if (! in_array('book', $tables, true)) {
            $this->error('This does not look like a KOReader statistics database (no book table).');

            return 1;
        }

        $pageTable = in_array('page_stat', $tables, true)
            ? 'page_stat'
            : (in_array('page_stat_data', $tables, true) ? 'page_stat_data' : null);

        $timeColumn = $pageTable ? $this->timeColumn($pdo, $pageTable) : null;

        $books = $this->groupBooks($pdo, $pageTable, $timeColumn);

        $match = trim((string) $this->option('match'));
        if ($match !== '') {
            $needle = Str::lower($match);
            $books = $books->filter(fn (array $book) => Str::contains(Str::lower($book['title'].' '.$book['author']), $needle));
        }

        $minProgress = $this->option('min-progress');
        if ($minProgress !== null && $minProgress !== '') {
            $minProgress = (float) $minProgress;
            $books = $books->filter(fn (array $book) => $book['progress'] !== null && $book['progress'] >= $minProgress);
        }

        $books = $books->sortByDesc('last_open')->values();

        $forcedStatus = $this->option('status');

        if ($forcedStatus !== null && $forcedStatus !== '') {
            if (! in_array($forcedStatus, ['want', 'reading', 'finished', 'abandoned'], true)) {
                $this->error("Invalid --status '{$forcedStatus}'. Use want, reading, finished, or abandoned.");

                return 1;
            }

            $books = $books->map(function (array $book) use ($forcedStatus) {
                $book['status'] = $forcedStatus;
                $book['finished_on'] = $forcedStatus === 'finished'
                    ? $this->dateFromTimestamp($book['last_open'])
                    : null;

                return $book;
            });
        }

        $limit = $this->option('limit');
        if ($limit !== null && $limit !== '') {
            $books = $books->take(max(0, (int) $limit))->values();
        }

        if ($books->isEmpty()) {
            $this->warn('No books matched the selected filters.');

            return 0;
        }

        $outputDir = $this->option('dir') ?: $this->booksSourcePath();

        if (! $outputDir) {
            $this->error('No books output directory configured. Pass --dir=<path>.');

            return 1;
        }

        $dryRun = (bool) $this->option('dry-run');
        $created = 0;
        $skipped = 0;
        $usedSlugs = [];

        foreach ($books as $book) {
            $slug = $this->uniqueSlug(Str::slug($book['title']) ?: 'book', $usedSlugs);
            $usedSlugs[] = $slug;
            $filePath = rtrim($outputDir, '/').'/'.$slug.'.md';

            if (file_exists($filePath) && ! $this->option('force')) {
                $this->line("  Skipped (exists): {$slug}.md");
                $skipped++;

                continue;
            }

            $markdown = $this->markdown($book, $slug);

            if ($dryRun) {
                $this->line("  [dry-run] Would write: {$filePath}");
                $created++;

                continue;
            }

            if (! is_dir($outputDir)) {
                mkdir($outputDir, 0755, true);
            }

            file_put_contents($filePath, $markdown);
            $this->info("  Created: {$slug}.md");
            $created++;
        }

        $this->newLine();
        $this->info("Done. {$created} created, {$skipped} skipped.");

        if ($created > 0 && ! $dryRun) {
            $this->line('Next: fill in recommended_by and thoughts, then run `php artisan content:import --source=books`.');
        }

        return 0;
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function groupBooks(PDO $pdo, ?string $pageTable, ?string $timeColumn): Collection
    {
        $rows = $pdo->query('SELECT * FROM book ORDER BY last_open DESC')->fetchAll(PDO::FETCH_ASSOC);
        $groups = [];

        foreach ($rows as $row) {
            $title = $this->cleanText($row['title'] ?? '');
            $author = $this->cleanAuthors($row['authors'] ?? '');

            if ($title === '') {
                continue;
            }

            $key = Str::lower($title).'|'.Str::lower($author);

            $reading = $this->readingStats($pdo, $pageTable, $timeColumn, (int) $row['id']);

            $groups[$key] ??= [
                'title' => $title,
                'author' => $author,
                'pages' => 0,
                'read_pages' => 0,
                'total_read_time' => 0,
                'excess_read_time' => 0,
                'highlights' => 0,
                'notes' => 0,
                'series' => null,
                'language' => null,
                'last_open' => 0,
                'first_read' => null,
                'days' => [],
                'daily' => [],
                'sessions' => 0,
                'max_page' => 0,
            ];

            $group = &$groups[$key];

            $group['pages'] = max($group['pages'], (int) ($row['pages'] ?? 0));
            $group['read_pages'] += (int) ($row['total_read_pages'] ?? 0);
            $group['total_read_time'] += (int) ($row['total_read_time'] ?? 0);
            $group['excess_read_time'] += $reading['excess_read_time'];
            $group['highlights'] += (int) ($row['highlights'] ?? 0);
            $group['notes'] += (int) ($row['notes'] ?? 0);
            $group['last_open'] = max($group['last_open'], (int) ($row['last_open'] ?? 0));

            $series = $this->cleanText($row['series'] ?? '');
            if ($group['series'] === null && $series !== '' && Str::lower($series) !== 'n/a') {
                $group['series'] = $series;
            }

            $language = $this->cleanText($row['language'] ?? '');
            if ($group['language'] === null && $language !== '' && Str::lower($language) !== 'n/a') {
                $group['language'] = $language;
            }

            if ($reading['first_read'] !== null && ($group['first_read'] === null || $reading['first_read'] < $group['first_read'])) {
                $group['first_read'] = $reading['first_read'];
            }

            $group['days'] = array_values(array_unique(array_merge($group['days'], $reading['days'])));
            $group['sessions'] += $reading['sessions'];
            $group['max_page'] = max($group['max_page'], $reading['max_page']);

            foreach ($reading['daily'] as $day => $seconds) {
                $group['daily'][$day] = ($group['daily'][$day] ?? 0) + $seconds;
            }

            unset($group);
        }

        return collect($groups)->map(function (array $group) {
            $progress = null;

            if ($group['pages'] > 0) {
                $lastPage = $group['max_page'] > 0 ? $group['max_page'] : $group['read_pages'];
                $progress = min(1, $lastPage / $group['pages']);
            }

            $finished = $progress !== null && $progress >= 0.98;

            return [
                ...$group,
                'estimated_read_time' => $group['total_read_time'] + $group['excess_read_time'],
                'progress' => $progress,
                'status' => $finished ? 'finished' : 'reading',
                'started_on' => $group['first_read'],
                'finished_on' => $finished ? $this->dateFromTimestamp($group['last_open']) : null,
                'reading_days' => count($group['days']),
                'daily' => $this->dailyList($group['daily']),
            ];
        });
    }

    /**
     * @return array{first_read: ?string, days: array<int, string>, daily: array<string, int>, sessions: int, max_page: int, excess_read_time: int}
     */
    private function readingStats(PDO $pdo, ?string $pageTable, ?string $timeColumn, int $bookId): array
    {
        if (! $pageTable || ! $timeColumn) {
            return ['first_read' => null, 'days' => [], 'daily' => [], 'sessions' => 0, 'max_page' => 0, 'excess_read_time' => 0];
        }

        $nepalTime = self::NEPAL_TIME_SQL;
        $statement = $pdo->prepare("SELECT start_time, {$timeColumn} AS duration, page, date(start_time, 'unixepoch', {$nepalTime}) AS day FROM {$pageTable} WHERE id_book = ? ORDER BY start_time ASC");
        $statement->execute([$bookId]);
        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);

        if ($rows === []) {
            return ['first_read' => null, 'days' => [], 'daily' => [], 'sessions' => 0, 'max_page' => 0, 'excess_read_time' => 0];
        }

        $sessions = 1;
        $previous = null;
        $previousStart = null;
        $days = [];
        $daily = [];
        $maxPage = 0;
        $excess = 0;

        foreach ($rows as $row) {
            $start = (int) $row['start_time'];
            $day = (string) $row['day'];
            $duration = (int) ($row['duration'] ?? 0);

            $days[$day] = true;
            $daily[$day] = ($daily[$day] ?? 0) + $duration;
            $maxPage = max($maxPage, (int) ($row['page'] ?? 0));

            if ($previousStart !== null) {
                $actualGap = $start - $previousStart;

                if ($actualGap > self::MAX_PAGE_SECONDS && $actualGap <= self::SESSION_GAP_SECONDS) {
                    $excess += $actualGap - self::MAX_PAGE_SECONDS;
                }
            }

            if ($previous !== null && ($start - $previous) > self::SESSION_GAP_SECONDS) {
                $sessions++;
            }

            $previous = $start + $duration;
            $previousStart = $start;
        }

        return [
            'first_read' => $rows[0]['day'] ?? null,
            'days' => array_keys($days),
            'daily' => $daily,
            'sessions' => $sessions,
            'max_page' => $maxPage,
            'excess_read_time' => $excess,
        ];
    }

    private function timeColumn(PDO $pdo, string $pageTable): ?string
    {
        $columns = $pdo->query("PRAGMA table_info({$pageTable})")->fetchAll(PDO::FETCH_ASSOC);
        $names = array_column($columns, 'name');

        foreach (['duration', 'period'] as $candidate) {
            if (in_array($candidate, $names, true)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $book
     */
    private function markdown(array $book, string $slug): string
    {
        $frontmatter = [
            'title' => $book['title'],
        ];

        if ($book['author'] !== '') {
            $frontmatter['author'] = $book['author'];
        }

        $frontmatter['slug'] = $slug;
        $frontmatter['status'] = $book['status'];

        if ($book['started_on']) {
            $frontmatter['started'] = $book['started_on'];
        }

        if ($book['finished_on']) {
            $frontmatter['finished'] = $book['finished_on'];
        }

        $stats = [
            'total_read_time' => $book['total_read_time'],
            'estimated_read_time' => $book['estimated_read_time'],
            'progress' => $book['progress'] !== null ? round($book['progress'], 4) : null,
            'read_pages' => $book['read_pages'],
            'total_pages' => $book['pages'],
            'sessions' => $book['sessions'],
            'highlights' => $book['highlights'],
            'notes' => $book['notes'],
            'reading_days' => $book['reading_days'],
        ];

        if ($book['language']) {
            $stats['language'] = $book['language'];
        }

        if ($book['series']) {
            $stats['series'] = $book['series'];
        }

        if ($book['daily'] !== []) {
            $stats['daily'] = $book['daily'];
        }

        $stats = array_filter($stats, fn ($value) => $value !== null);
        $frontmatter['stats'] = $stats;

        $yaml = Yaml::dump($frontmatter, 4, 2);

        return "---\n{$yaml}---\n\n";
    }

    private function uniqueSlug(string $slug, array $used): string
    {
        $slug = Str::limit($slug, 180, '');
        $candidate = $slug;
        $suffix = 2;

        while (in_array($candidate, $used, true)) {
            $candidate = $slug.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }

    private function cleanText(?string $value): string
    {
        return trim(preg_replace('/\s+/u', ' ', (string) $value));
    }

    private function cleanAuthors(?string $value): string
    {
        $authors = preg_split('/[\r\n;]+/', (string) $value) ?: [];
        $authors = array_values(array_unique(array_filter(array_map(
            fn (string $author) => trim(preg_replace('/\s+/u', ' ', preg_replace('/,(?=\S)/', ', ', $author))),
            $authors
        ), fn (string $author) => $author !== '' && Str::lower($author) !== 'n/a')));

        return implode(', ', $authors);
    }

    private function dateFromTimestamp(int $timestamp): ?string
    {
        if ($timestamp <= 0) {
            return null;
        }

        return (new DateTimeImmutable('@'.$timestamp))
            ->setTimezone(new DateTimeZone('Asia/Kathmandu'))
            ->format('Y-m-d');
    }

    /**
     * @param  array<string, int>  $daily
     * @return array<int, array{date: string, seconds: int}>
     */
    private function dailyList(array $daily): array
    {
        ksort($daily);

        $items = [];

        foreach ($daily as $date => $seconds) {
            if ($seconds > 0) {
                $items[] = ['date' => $date, 'seconds' => $seconds];
            }
        }

        return $items;
    }

    private function booksSourcePath(): ?string
    {
        foreach (config('content.sources', []) as $source) {
            if (($source['type'] ?? 'posts') === 'books' && ! empty($source['path'])) {
                return $source['path'];
            }
        }

        return null;
    }
}
