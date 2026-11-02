<?php

namespace Tests\Feature;

use App\Models\Book;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            ->missing('book.stats.pages_per_hour')
            ->has('ldjson.@graph', 2)
        );
    }

    public function test_book_show_returns_404_for_draft(): void
    {
        $book = Book::factory()->draft()->create();

        $this->get("/books/{$book->slug}")->assertStatus(404);
    }

    public function test_hidden_books_are_excluded_from_index_and_show(): void
    {
        Book::factory()->create(['title' => 'Visible Book']);
        $hidden = Book::factory()->hidden()->create(['title' => 'Secret Book']);

        $this->get('/books')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Books/Index')
                ->has('books', 1)
                ->where('books.0.title', 'Visible Book')
            );

        $this->get("/books/{$hidden->slug}")->assertStatus(404);
    }

    public function test_hidden_books_are_excluded_from_sitemap(): void
    {
        Book::factory()->create(['slug' => 'visible-book']);
        Book::factory()->hidden()->create(['slug' => 'secret-book']);

        $this->get('/sitemap.xml')
            ->assertStatus(200)
            ->assertSee('/books/visible-book')
            ->assertDontSee('/books/secret-book');
    }
}
