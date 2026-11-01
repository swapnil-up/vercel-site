<?php

namespace Tests\Feature;

use App\Models\Book;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ImportBooksTest extends TestCase
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

    public function test_it_imports_books_with_frontmatter_and_koreader_stats(): void
    {
        $books = $this->makeDir('books');

        File::put($books.'/the-phoenix-project.md', <<<'MD'
---
title: The Phoenix Project
author: Gene Kim
recommended_by: A colleague at work
status: finished
started: 2026-10-01
finished: 2026-10-14
cover: https://example.com/cover.jpg
tags: [engineering, fiction]
stats:
  total_read_time: 28440
  read_pages: 380
  total_pages: 400
  sessions: 14
  highlights: 23
  notes: 5
  reading_days: 12
---

**What I thought** about this book.
MD);

        config(['content.sources' => [
            'books' => [
                'type' => 'books',
                'path' => $books,
                'prefix' => 'books',
                'tag' => 'books',
            ],
        ]]);

        $this->artisan('content:import')->assertSuccessful();

        $book = Book::where('slug', 'the-phoenix-project')->firstOrFail();

        $this->assertSame('Gene Kim', $book->author);
        $this->assertSame('A colleague at work', $book->recommended_by);
        $this->assertSame('finished', $book->status);
        $this->assertSame('2026-10-01', $book->started_on->format('Y-m-d'));
        $this->assertSame('2026-10-14', $book->finished_on->format('Y-m-d'));
        $this->assertSame('https://example.com/cover.jpg', $book->cover_url);
        $this->assertContains('engineering', $book->tags);
        $this->assertContains('books', $book->tags);
        $this->assertSame(28440, $book->stats['total_read_time']);
        $this->assertSame(380, $book->stats['read_pages']);
        $this->assertSame(14, $book->stats['sessions']);
        $this->assertStringContainsString('<strong>What I thought</strong>', $book->thoughts_html);
        $this->assertSame('books/the-phoenix-project.md', $book->source_path);
    }

    public function test_invalid_book_status_falls_back_to_finished(): void
    {
        $books = $this->makeDir('books');
        File::put($books.'/a-book.md', "---\ntitle: A Book\nstatus: readish\n---\n\nNotes.");

        config(['content.sources' => [
            'books' => ['type' => 'books', 'path' => $books, 'prefix' => 'books', 'tag' => 'books'],
        ]]);

        $this->artisan('content:import')->assertSuccessful();

        $this->assertDatabaseHas('books', ['slug' => 'a-book', 'status' => 'finished']);
    }

    public function test_duplicate_book_slugs_abort_without_writing(): void
    {
        $first = $this->makeDir('first');
        $second = $this->makeDir('second');

        File::put($first.'/same.md', "---\ntitle: Same\n---\n\nFirst.");
        File::put($second.'/same.md', "---\ntitle: Same\n---\n\nSecond.");

        config(['content.sources' => [
            'first' => ['type' => 'books', 'path' => $first, 'prefix' => 'first', 'tag' => 'books'],
            'second' => ['type' => 'books', 'path' => $second, 'prefix' => 'second', 'tag' => 'books'],
        ]]);

        $this->artisan('content:import')->assertExitCode(1);

        $this->assertDatabaseCount('books', 0);
    }

    public function test_prune_only_removes_books_from_the_imported_source(): void
    {
        Book::factory()->create([
            'slug' => 'stale-book',
            'source_path' => 'books/stale-book.md',
        ]);

        Book::factory()->create([
            'slug' => 'db-only-book',
            'source_path' => null,
        ]);

        $books = $this->makeDir('books');
        File::put($books.'/fresh-book.md', "---\ntitle: Fresh Book\n---\n\nNotes.");

        config(['content.sources' => [
            'books' => ['type' => 'books', 'path' => $books, 'prefix' => 'books', 'tag' => 'books'],
        ]]);

        $this->artisan('content:import', ['--prune' => true])->assertSuccessful();

        $this->assertDatabaseHas('books', ['slug' => 'fresh-book']);
        $this->assertDatabaseHas('books', ['slug' => 'db-only-book']);
        $this->assertDatabaseMissing('books', ['slug' => 'stale-book']);
    }

    public function test_dry_run_does_not_write_books(): void
    {
        $books = $this->makeDir('books');
        File::put($books.'/a-book.md', "---\ntitle: A Book\n---\n\nNotes.");

        config(['content.sources' => [
            'books' => ['type' => 'books', 'path' => $books, 'prefix' => 'books', 'tag' => 'books'],
        ]]);

        $this->artisan('content:import', ['--dry-run' => true])->assertSuccessful();

        $this->assertDatabaseCount('books', 0);
    }

    private function makeDir(string $name): string
    {
        $dir = sys_get_temp_dir().'/books-import-test-'.uniqid().'/'.$name;
        File::ensureDirectoryExists($dir);
        $this->tempDirs[] = dirname($dir);

        return $dir;
    }
}
