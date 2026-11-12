<?php

namespace Tests\Feature;

use App\Models\Book;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BookControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_books_index_returns_published_books_only(): void
    {
        Book::factory()->count(3)->create();
        Book::factory()->draft()->create();

        $response = $this->get('/books');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Books/Index')
            ->has('books', 3)
        );
    }

    public function test_book_show_returns_a_single_book_with_stats(): void
    {
        $book = Book::factory()->create([
            'title' => 'The Phoenix Project',
            'stats' => [
                'total_read_time' => 36000,
                'estimated_read_time' => 39600,
                'progress' => 0.9375,
                'read_pages' => 300,
                'total_pages' => 320,
                'reading_days' => 10,
                'daily' => [
                    ['date' => '2026-10-01', 'seconds' => 3600],
                    ['date' => '2026-10-02', 'seconds' => 1800],
                ],
            ],
        ]);

        $response = $this->get("/books/{$book->slug}");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Books/Show')
            ->where('book.title', 'The Phoenix Project')
            ->where('book.stats.total_read_time_label', '10h')
            ->where('book.stats.estimated_read_time_label', '11h')
            ->where('book.stats.progress', 94)
            ->has('book.stats.daily', 2)
            ->where('book.stats.percent_per_hour', 9.4)
            ->has('ldjson.@graph', 2)
        );
    }

    public function test_book_show_derives_timeline_rows_from_the_day_stats(): void
    {
        $book = Book::factory()->create([
            'stats' => [
                'total_read_time' => 7200,
                'read_pages' => 500,
                'total_pages' => 500,
                'reading_days' => 3,
                'longest_session' => 5400,
                'days' => [
                    ['date' => '2026-10-01', 'seconds' => 1800, 'page_from' => 1, 'page_to' => 100, 'sessions' => 1],
                    ['date' => '2026-10-02', 'seconds' => 3600, 'page_from' => 101, 'page_to' => 300, 'sessions' => 2],
                    ['date' => '2026-10-04', 'seconds' => 1800, 'page_from' => 301, 'page_to' => 500, 'sessions' => 1],
                ],
            ],
        ]);

        $this->get("/books/{$book->slug}")
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Books/Show')
                ->has('book.stats.days', 3)
                ->where('book.stats.days.0.percent_from', 0)
                ->where('book.stats.days.0.percent', 20)
                ->where('book.stats.days.2.percent', 100)
                ->where('book.stats.days.1.percent_from', 20)
                ->where('book.stats.days.2.sessions', 1)
                ->has('book.stats.daily', 3)
                ->where('book.stats.daily.0.seconds', 1800)
                ->where('book.stats.percent_per_hour', 50)
                ->where('book.stats.best_day.date', '2026-10-02')
                ->where('book.stats.best_day.seconds', 3600)
                ->where('book.stats.streak', 2)
                ->where('book.stats.longest_gap', 1)
                ->where('book.stats.longest_session', 5400)
                ->where('book.stats.longest_session_label', '1h 30m')
            );
    }

    public function test_book_show_falls_back_to_daily_seconds_when_no_day_rows_are_stored(): void
    {
        $book = Book::factory()->create([
            'stats' => [
                'total_read_time' => 3600,
                'daily' => [
                    ['date' => '2026-10-01', 'seconds' => 3600],
                ],
            ],
        ]);

        $this->get("/books/{$book->slug}")
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Books/Show')
                ->where('book.stats.days', [])
                ->has('book.stats.daily', 1)
                ->where('book.stats.streak', null)
                ->where('book.stats.best_day', null)
                ->where('book.stats.percent_per_hour', null)
            );
    }

    public function test_book_show_returns_404_for_draft(): void
    {
        $book = Book::factory()->draft()->create();

        $this->get("/books/{$book->slug}")->assertStatus(404);
    }

    public function test_hidden_books_appear_in_the_index_with_details_redacted(): void
    {
        Book::factory()->create(['title' => 'Visible Book', 'finished_on' => now()->addWeek()]);
        Book::factory()->hidden()->create([
            'title' => 'Secret Book',
            'author' => 'Nobody',
            'tags' => ['secret'],
            'cover_url' => 'https://example.com/cover.jpg',
            'thoughts' => 'Secret thoughts',
            'finished_on' => now(),
        ]);

        $this->get('/books')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Books/Index')
                ->has('books', 2)
                ->where('books.0.title', 'Visible Book')
                ->where('books.1.hidden', true)
                ->where('books.1.title', 'Title withheld')
                ->where('books.1.author', null)
                ->where('books.1.slug', null)
                ->where('books.1.cover_url', null)
                ->where('books.1.tags', [])
                ->where('books.1.excerpt', null)
                ->where('books.1.status', 'finished')
                ->where('books.1.stats.total_read_time_label', '10h')
            );
    }

    public function test_hidden_book_is_served_by_id_with_stats_and_no_identifying_details(): void
    {
        $hidden = Book::factory()->hidden()->create([
            'title' => 'Secret Book',
            'author' => 'Nobody',
            'tags' => ['secret'],
            'cover_url' => 'https://example.com/cover.jpg',
            'recommended_by' => 'Someone',
            'thoughts_html' => '<p>Secret thoughts</p>',
        ]);

        $this->get("/books/{$hidden->id}")
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Books/Show')
                ->where('book.hidden', true)
                ->where('book.title', 'Title withheld')
                ->where('book.author', null)
                ->where('book.slug', null)
                ->where('book.cover_url', null)
                ->where('book.tags', [])
                ->where('book.thoughts_html', null)
                ->where('book.recommended_by', null)
                ->where('book.stats.total_read_time_label', '10h')
                ->where('meta.title', 'Title withheld — Swapnil Upadhyay')
                ->where('meta.image', null)
                ->where('ldjson.@graph', fn ($graph) => count($graph) === 1
                    && $graph[0]['@type'] === 'BreadcrumbList'
                    && $graph[0]['itemListElement'][2]['name'] === 'Title withheld')
            );
    }

    public function test_hidden_book_is_not_reachable_by_its_slug(): void
    {
        $hidden = Book::factory()->hidden()->create(['title' => 'Secret Book']);

        $this->get("/books/{$hidden->slug}")
            ->assertStatus(404)
            ->assertDontSee('Secret Book');

        Http::fake(['*/index.json' => Http::response(['articles' => []])]);

        $this->get('/sitemap.xml')
            ->assertStatus(200)
            ->assertDontSee('/books/'.$hidden->id)
            ->assertDontSee('/books/'.$hidden->slug);
    }

    public function test_hidden_books_are_excluded_from_sitemap(): void
    {
        Http::fake(['*/index.json' => Http::response(['articles' => []])]);

        Book::factory()->create(['slug' => 'visible-book']);
        Book::factory()->hidden()->create(['slug' => 'secret-book']);

        $this->get('/sitemap.xml')
            ->assertStatus(200)
            ->assertSee('/books/visible-book')
            ->assertDontSee('/books/secret-book');
    }
}
