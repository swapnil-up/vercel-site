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
                'read_pages' => 300,
                'total_pages' => 320,
                'reading_days' => 10,
            ],
        ]);

        $response = $this->get("/books/{$book->slug}");

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Books/Show')
            ->where('book.title', 'The Phoenix Project')
            ->where('book.stats.total_read_time_label', '10h')
            ->where('book.stats.pages_per_hour', 30)
            ->has('ldjson.@graph', 2)
        );
    }

    public function test_book_show_returns_404_for_draft(): void
    {
        $book = Book::factory()->draft()->create();

        $this->get("/books/{$book->slug}")->assertStatus(404);
    }
}
