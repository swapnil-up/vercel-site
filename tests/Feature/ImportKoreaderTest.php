<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use PDO;
use Tests\TestCase;

class ImportKoreaderTest extends TestCase
{
    use RefreshDatabase;

    private array $tempDirs = [];

    protected function tearDown(): void
    {
        foreach ($this->tempDirs as $dir) {
            File::deleteDirectory($dir);
        }

        parent::tearDown();
    }

    public function test_it_creates_book_markdown_with_stats_and_inferred_status(): void
    {
        $db = $this->makeDatabase();
        $out = $this->makeDir('out');

        $this->insertBook($db, 1, 'The Phoenix Project', 'Gene Kim', 400, 400, 36000, 23, 5, 'en', '2026-10-14 10:00:00');
        $this->insertPageStat($db, 1, 1, '2026-10-12 09:00:00', 600);
        $this->insertPageStat($db, 1, 400, '2026-10-14 10:00:00', 600);
        $this->insertPageStat($db, 1, 400, '2026-10-14 10:20:00', 600);

        $this->artisan('koreader:import', [
            'path' => $db,
            '--dir' => $out,
        ])->assertSuccessful();

        $file = $out.'/the-phoenix-project.md';
        $this->assertFileExists($file);

        $contents = File::get($file);

        $this->assertStringContainsString("title: 'The Phoenix Project'", $contents);
        $this->assertStringContainsString("author: 'Gene Kim'", $contents);
        $this->assertStringContainsString('status: finished', $contents);
        $this->assertStringContainsString("'2026-10-12'", $contents);
        $this->assertStringContainsString("'2026-10-14'", $contents);
        $this->assertStringContainsString('total_read_time: 36000', $contents);
        $this->assertStringContainsString('estimated_read_time: 37080', $contents);
        $this->assertStringContainsString('progress: 1.0', $contents);
        $this->assertStringContainsString('read_pages: 400', $contents);
        $this->assertStringContainsString('reading_days: 2', $contents);
        $this->assertStringContainsString('sessions: 2', $contents);
        $this->assertStringContainsString('highlights: 23', $contents);
        $this->assertStringContainsString('daily:', $contents);
        $this->assertStringContainsString('seconds: 600', $contents);
    }

    public function test_it_groups_duplicate_title_and_author_rows(): void
    {
        $db = $this->makeDatabase();
        $out = $this->makeDir('out');

        $this->insertBook($db, 1, 'A Book', 'An Author', 100, 50, 1800, 1, 0, 'en', '2026-10-01 10:00:00');
        $this->insertBook($db, 2, 'A Book', 'An Author', 100, 50, 1800, 2, 1, 'en', '2026-10-02 10:00:00');

        $this->insertPageStat($db, 1, 1, '2026-10-01 10:00:00', 300);
        $this->insertPageStat($db, 2, 51, '2026-10-02 10:00:00', 300);

        $this->artisan('koreader:import', [
            'path' => $db,
            '--dir' => $out,
        ])->assertSuccessful();

        $this->assertFileExists($out.'/a-book.md');
        $this->assertFileDoesNotExist($out.'/a-book-2.md');

        $contents = File::get($out.'/a-book.md');

        $this->assertStringContainsString('total_read_time: 3600', $contents);
        $this->assertStringContainsString('read_pages: 100', $contents);
        $this->assertStringContainsString('highlights: 3', $contents);
        $this->assertStringContainsString('notes: 1', $contents);
    }

    public function test_existing_files_are_skipped_unless_forced(): void
    {
        $db = $this->makeDatabase();
        $out = $this->makeDir('out');
        $path = $out.'/a-book.md';

        File::put($path, "hand edited\n");

        $this->insertBook($db, 1, 'A Book', 'An Author', 100, 100, 3600, 0, 0, 'en', '2026-10-01 10:00:00');

        $this->artisan('koreader:import', [
            'path' => $db,
            '--dir' => $out,
        ])->assertSuccessful();

        $this->assertSame("hand edited\n", File::get($path));

        $this->artisan('koreader:import', [
            'path' => $db,
            '--dir' => $out,
            '--force' => true,
            '--status' => 'reading',
        ])->assertSuccessful();

        $this->assertNotSame("hand edited\n", File::get($path));
        $this->assertStringContainsString('status: reading', File::get($path));
    }

    public function test_dry_run_does_not_write_files(): void
    {
        $db = $this->makeDatabase();
        $out = $this->makeDir('out');

        $this->insertBook($db, 1, 'A Book', 'An Author', 100, 100, 3600, 0, 0, 'en', '2026-10-01 10:00:00');

        $this->artisan('koreader:import', [
            'path' => $db,
            '--dir' => $out,
            '--dry-run' => true,
        ])->assertSuccessful();

        $this->assertFileDoesNotExist($out.'/a-book.md');
    }

    public function test_missing_database_exits_with_error(): void
    {
        $this->artisan('koreader:import', [
            'path' => '/definitely/not/a/statistics.sqlite3',
        ])->assertExitCode(1);
    }

    private function makeDatabase(): string
    {
        $dir = $this->makeDir('koreader');
        $path = $dir.'/statistics.sqlite3';

        $pdo = new PDO('sqlite:'.$path);
        $pdo->exec('CREATE TABLE book (
            id integer PRIMARY KEY autoincrement,
            title text,
            authors text,
            notes integer,
            last_open integer,
            highlights integer,
            pages integer,
            series text,
            language text,
            md5 text,
            total_read_time integer,
            total_read_pages integer
        )');
        $pdo->exec('CREATE TABLE page_stat_data (
            id_book integer,
            page integer NOT NULL DEFAULT 0,
            start_time integer NOT NULL DEFAULT 0,
            duration integer NOT NULL DEFAULT 0,
            total_pages integer NOT NULL DEFAULT 0
        )');

        return $path;
    }

    private function insertBook(
        string $db,
        int $id,
        string $title,
        string $author,
        int $pages,
        int $readPages,
        int $totalTime,
        int $highlights,
        int $notes,
        string $language,
        string $lastOpen
    ): void {
        $pdo = new PDO('sqlite:'.$db);
        $statement = $pdo->prepare('INSERT INTO book (id, title, authors, notes, last_open, highlights, pages, series, language, md5, total_read_time, total_read_pages)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([
            $id,
            $title,
            $author,
            $notes,
            strtotime($lastOpen),
            $highlights,
            $pages,
            'N/A',
            $language,
            'md5-'.$id,
            $totalTime,
            $readPages,
        ]);
    }

    private function insertPageStat(string $db, int $bookId, int $page, string $startTime, int $duration): void
    {
        $pdo = new PDO('sqlite:'.$db);
        $statement = $pdo->prepare('INSERT INTO page_stat_data (id_book, page, start_time, duration, total_pages) VALUES (?, ?, ?, ?, ?)');
        $statement->execute([$bookId, $page, strtotime($startTime), $duration, 100]);
    }

    private function makeDir(string $name): string
    {
        $dir = sys_get_temp_dir().'/koreader-import-test-'.uniqid().'/'.$name;
        File::ensureDirectoryExists($dir);
        $this->tempDirs[] = dirname($dir);

        return $dir;
    }
}
