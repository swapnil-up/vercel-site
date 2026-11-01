<?php

namespace App\Http\Controllers;

use App\Models\Book;
use Illuminate\Support\Str;
use Inertia\Inertia;

class BookController extends Controller
{
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
        $book = Book::where('slug', $slug)
            ->where('is_draft', false)
            ->firstOrFail();

        $bookUrl = route('books.show', $book->slug);
        $stats = $this->stats($book);

        return Inertia::render('Books/Show', [
            'book' => [
                'title' => $book->title,
                'slug' => $book->slug,
                'author' => $book->author,
                'recommended_by' => $book->recommended_by,
                'thoughts_html' => $book->thoughts_html,
                'status' => $book->status,
                'started_on' => $book->started_on?->format('M d, Y'),
                'finished_on' => $book->finished_on?->format('M d, Y'),
                'cover_url' => $book->cover_url,
                'tags' => $book->tags ?? [],
                'stats' => $stats,
            ],
            'meta' => [
                'title' => $book->title.' — Swapnil Upadhyay',
                'description' => Str::limit(
                    trim(strip_tags($book->thoughts_html ?? $book->thoughts ?? '')),
                    160
                ) ?: 'A book note by Swapnil Upadhyay',
                'url' => $bookUrl,
                'image' => $book->cover_url,
            ],
            'ldjson' => [
                '@context' => 'https://schema.org',
                '@graph' => [
                    [
                        '@type' => 'Book',
                        'name' => $book->title,
                        'author' => $book->author ? [
                            '@type' => 'Person',
                            'name' => $book->author,
                        ] : null,
                        'image' => $book->cover_url,
                        'url' => $bookUrl,
                    ],
                    [
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
                                'name' => $book->title,
                                'item' => $bookUrl,
                            ],
                        ],
                    ],
                ],
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function card(Book $book): array
    {
        return [
            'id' => $book->id,
            'title' => $book->title,
            'slug' => $book->slug,
            'author' => $book->author,
            'status' => $book->status,
            'finished_on' => $book->finished_on?->format('M Y'),
            'cover_url' => $book->cover_url,
            'tags' => $book->tags ?? [],
            'excerpt' => Str::limit(
                trim(preg_replace('/\s+/u', ' ', strip_tags($book->thoughts_html ?? $book->thoughts ?? ''))),
                180
            ),
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
        $pages = (int) ($raw['read_pages'] ?? 0);
        $totalPages = (int) ($raw['total_pages'] ?? 0);
        $days = (int) ($raw['reading_days'] ?? 0);

        return [
            'total_read_time' => $time ?: null,
            'total_read_time_label' => $time > 0 ? $this->duration($time) : null,
            'read_pages' => $pages ?: null,
            'total_pages' => $totalPages ?: null,
            'sessions' => isset($raw['sessions']) ? (int) $raw['sessions'] : null,
            'highlights' => isset($raw['highlights']) ? (int) $raw['highlights'] : null,
            'notes' => isset($raw['notes']) ? (int) $raw['notes'] : null,
            'reading_days' => $days ?: null,
            'pages_per_day' => $days > 0 ? round($pages / $days, 1) : null,
            'minutes_per_page' => $pages > 0 && $time > 0 ? round(($time / 60) / $pages, 1) : null,
            'pages_per_hour' => $time > 0 && $pages > 0 ? round($pages / ($time / 3600), 1) : null,
            'language' => $raw['language'] ?? null,
            'series' => $raw['series'] ?? null,
        ];
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
