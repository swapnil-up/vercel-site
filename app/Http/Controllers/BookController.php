<?php

namespace App\Http\Controllers;

use App\Models\Book;
use DateTimeImmutable;
use Illuminate\Support\Str;
use Inertia\Inertia;

class BookController extends Controller
{
    /**
     * Placeholder shown in place of a hidden book's title.
     */
    public const REDACTED_TITLE = 'Title withheld';

    public function index()
    {
        $books = Book::where('is_draft', false)
            ->orderByDesc('finished_on')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Book $book) => $this->card($book))
            ->values();

        return Inertia::render('Books/Index', [
            'books' => $books,
            'meta' => [
                'title' => 'Books — Swapnil Upadhyay',
                'description' => 'Books Swapnil Upadhyay has read, where they came from, and what he thought.',
            ],
        ]);
    }

    public function show(string $slug)
    {
        $book = $this->resolve($slug);
        $hidden = (bool) $book->hidden;

        // Hidden books live behind an opaque handle so the URL itself cannot
        // give the title away; their real slug stops resolving.
        $bookUrl = route('books.show', $hidden ? $book->id : $book->slug);
        $stats = $this->stats($book);

        $graph = [];

        if (! $hidden) {
            $graph[] = [
                '@type' => 'Book',
                'name' => $book->title,
                'author' => $book->author ? [
                    '@type' => 'Person',
                    'name' => $book->author,
                ] : null,
                'image' => $book->cover_url,
                'url' => $bookUrl,
            ];
        }

        $graph[] = [
            '@type' => 'BreadcrumbList',
            'itemListElement' => [
                [
                    '@type' => 'ListItem',
                    'position' => 1,
                    'name' => 'Home',
                    'item' => url('/'),
                ],
                [
                    '@type' => 'ListItem',
                    'position' => 2,
                    'name' => 'Books',
                    'item' => route('books.index'),
                ],
                [
                    '@type' => 'ListItem',
                    'position' => 3,
                    'name' => $hidden ? self::REDACTED_TITLE : $book->title,
                    'item' => $bookUrl,
                ],
            ],
        ];

        return Inertia::render('Books/Show', [
            'book' => [
                'id' => $book->id,
                'title' => $hidden ? self::REDACTED_TITLE : $book->title,
                'slug' => $hidden ? null : $book->slug,
                'author' => $hidden ? null : $book->author,
                'recommended_by' => $hidden ? null : $book->recommended_by,
                'thoughts_html' => $hidden ? null : $book->thoughts_html,
                'status' => $book->status,
                'started_on' => $book->started_on?->format('M d, Y'),
                'finished_on' => $book->finished_on?->format('M d, Y'),
                'cover_url' => $hidden ? null : $book->cover_url,
                'tags' => $hidden ? [] : ($book->tags ?? []),
                'hidden' => $hidden,
                'stats' => $stats,
            ],
            'meta' => [
                'title' => ($hidden ? self::REDACTED_TITLE : $book->title).' — Swapnil Upadhyay',
                'description' => $hidden
                    ? 'A book note by Swapnil Upadhyay'
                    : (Str::limit(
                        trim(strip_tags($book->thoughts_html ?? $book->thoughts ?? '')),
                        160
                    ) ?: 'A book note by Swapnil Upadhyay'),
                'url' => $bookUrl,
                'image' => $hidden ? null : $book->cover_url,
                'type' => 'article',
            ],
            'ldjson' => [
                '@context' => 'https://schema.org',
                '@graph' => $graph,
            ],
        ]);
    }

    /**
     * Visible books resolve by slug, hidden books only by their numeric id,
     * so a hidden book's slug cannot be used to fetch it.
     */
    private function resolve(string $slug): Book
    {
        $book = Book::where('slug', $slug)
            ->where('is_draft', false)
            ->where('hidden', false)
            ->first();

        if ($book) {
            return $book;
        }

        if (ctype_digit($slug)) {
            $hidden = Book::whereKey((int) $slug)
                ->where('is_draft', false)
                ->where('hidden', true)
                ->first();

            if ($hidden) {
                return $hidden;
            }
        }

        abort(404);
    }

    /**
     * @return array<string, mixed>
     */
    private function card(Book $book): array
    {
        $hidden = (bool) $book->hidden;

        return [
            'id' => $book->id,
            'title' => $hidden ? self::REDACTED_TITLE : $book->title,
            'slug' => $hidden ? null : $book->slug,
            'author' => $hidden ? null : $book->author,
            'status' => $book->status,
            'finished_on' => $book->finished_on?->format('M Y'),
            'cover_url' => $hidden ? null : $book->cover_url,
            'tags' => $hidden ? [] : ($book->tags ?? []),
            'excerpt' => $hidden ? null : Str::limit(
                trim(preg_replace('/\s+/u', ' ', strip_tags($book->thoughts_html ?? $book->thoughts ?? ''))),
                180
            ),
            'hidden' => $hidden,
            'stats' => $this->stats($book),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function stats(Book $book): array
    {
        $raw = $book->stats ?? [];

        $time = (int) ($raw['total_read_time'] ?? 0);
        $estimated = (int) ($raw['estimated_read_time'] ?? 0);
        $pages = (int) ($raw['read_pages'] ?? 0);
        $totalPages = (int) ($raw['total_pages'] ?? 0);
        $readingDays = (int) ($raw['reading_days'] ?? 0);
        $progress = $raw['progress'] ?? null;

        if ($progress === null && $pages > 0 && $totalPages > 0) {
            $progress = min(1, $pages / $totalPages);
        }

        $days = $this->dayRows(is_array($raw['days'] ?? null) ? $raw['days'] : [], $totalPages);
        $longestSession = (int) ($raw['longest_session'] ?? 0);

        return [
            'total_read_time' => $time ?: null,
            'total_read_time_label' => $time > 0 ? $this->duration($time) : null,
            'estimated_read_time' => $estimated ?: null,
            'estimated_read_time_label' => $estimated > 0 ? $this->duration($estimated) : null,
            'progress' => $progress !== null ? (int) round((float) $progress * 100) : null,
            'sessions' => isset($raw['sessions']) ? (int) $raw['sessions'] : null,
            'reading_days' => $readingDays ?: null,
            'read_pages' => $pages ?: null,
            'total_pages' => $totalPages ?: null,
            'percent_per_hour' => $progress !== null && $time > 0
                ? round((float) $progress * 100 / ($time / 3600), 1)
                : null,
            'days' => $days,
            'daily' => $days !== []
                ? array_map(fn (array $row) => ['date' => $row['date'], 'seconds' => $row['seconds']], $days)
                : $this->daily($raw['daily'] ?? []),
            'best_day' => $this->bestDay($days),
            'streak' => $days !== [] ? $this->streak($days) : null,
            'longest_gap' => $days !== [] ? $this->longestGap($days) : null,
            'longest_session' => $longestSession ?: null,
            'longest_session_label' => $longestSession > 0 ? $this->duration($longestSession) : null,
            'language' => $raw['language'] ?? null,
            'series' => $raw['series'] ?? null,
        ];
    }

    /**
     * Normalise the per-day rows stored by koreader:import into the shape the
     * timeline needs: how long was read, and where the day started and ended
     * as a percentage of the book. Page numbers themselves stay internal —
     * KOReader's pages shift with font size and screen, so they are unusable
     * between devices.
     *
     * @param  array<int, mixed>  $raw
     * @return array<int, array{date: string, seconds: int, page_from: ?int, page_to: ?int, sessions: ?int, percent: ?int, percent_from: ?int}>
     */
    private function dayRows(array $raw, int $totalPages): array
    {
        $rows = [];

        foreach ($raw as $entry) {
            if (! is_array($entry) || empty($entry['date'])) {
                continue;
            }

            $pageTo = (int) ($entry['page_to'] ?? 0);
            $pageFrom = (int) ($entry['page_from'] ?? 0);

            $rows[] = [
                'date' => (string) $entry['date'],
                'seconds' => (int) ($entry['seconds'] ?? 0),
                'page_from' => $pageFrom > 0 ? $pageFrom : null,
                'page_to' => $pageTo > 0 ? $pageTo : null,
                'sessions' => isset($entry['sessions']) ? (int) $entry['sessions'] : null,
                'percent' => $pageTo > 0 && $totalPages > 0
                    ? (int) round(min(1, $pageTo / $totalPages) * 100)
                    : null,
                'percent_from' => $pageTo > 0 && $totalPages > 0
                    ? (int) round(min(1, $pageFrom / $totalPages) * 100)
                    : null,
            ];
        }

        return $rows;
    }

    /**
     * @param  array<int, array{date: string, seconds: int}>  $days
     * @return array{date: string, seconds: int}|null
     */
    private function bestDay(array $days): ?array
    {
        $best = null;

        foreach ($days as $day) {
            if ($best === null || $day['seconds'] > $best['seconds']) {
                $best = $day;
            }
        }

        return $best ? ['date' => $best['date'], 'seconds' => $best['seconds']] : null;
    }

    /**
     * Longest run of consecutive reading days.
     *
     * @param  array<int, array{date: string}>  $days
     */
    private function streak(array $days): int
    {
        $best = 0;
        $run = 0;
        $previous = null;

        foreach ($this->sortedDays($days) as $day) {
            $current = new DateTimeImmutable($day['date']);
            $run = $previous !== null && (int) $previous->diff($current)->days === 1 ? $run + 1 : 1;
            $best = max($best, $run);
            $previous = $current;
        }

        return $best;
    }

    /**
     * Longest stretch without reading, in days (0 when the read was unbroken).
     *
     * @param  array<int, array{date: string}>  $days
     */
    private function longestGap(array $days): int
    {
        $gap = 0;
        $previous = null;

        foreach ($this->sortedDays($days) as $day) {
            $current = new DateTimeImmutable($day['date']);

            if ($previous !== null) {
                $gap = max($gap, (int) $previous->diff($current)->days - 1);
            }

            $previous = $current;
        }

        return $gap;
    }

    /**
     * @param  array<int, array{date: string}>  $days
     * @return array<int, array{date: string}>
     */
    private function sortedDays(array $days): array
    {
        usort($days, fn (array $a, array $b) => strcmp($a['date'], $b['date']));

        return $days;
    }

    /**
     * @return array<int, array{date: string, seconds: int}>
     */
    private function daily(mixed $raw): array
    {
        if (! is_array($raw)) {
            return [];
        }

        $items = [];

        if (array_is_list($raw)) {
            foreach ($raw as $entry) {
                if (is_array($entry) && isset($entry['date'], $entry['seconds'])) {
                    $items[(string) $entry['date']] = (int) $entry['seconds'];
                }
            }
        } else {
            foreach ($raw as $date => $seconds) {
                $items[(string) $date] = (int) $seconds;
            }
        }

        ksort($items);

        $daily = [];

        foreach ($items as $date => $seconds) {
            if ($seconds > 0) {
                $daily[] = ['date' => $date, 'seconds' => $seconds];
            }
        }

        return $daily;
    }

    private function duration(int $seconds): string
    {
        $hours = intdiv($seconds, 3600);
        $minutes = intdiv($seconds % 3600, 60);

        if ($hours > 0) {
            return $minutes > 0 ? "{$hours}h {$minutes}m" : "{$hours}h";
        }

        return $minutes > 0 ? "{$minutes}m" : "{$seconds}s";
    }
}
