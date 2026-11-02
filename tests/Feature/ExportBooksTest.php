<?php

namespace Tests\Feature;

use App\Models\Book;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ExportBooksTest extends TestCase
{
    use RefreshDatabase;

    private string $outputDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->outputDir = sys_get_temp_dir().'/books-export-test-'.uniqid();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->outputDir);

        parent::tearDown();
    }

    public function test_books_export_to_markdown_with_frontmatter(): void
    {
        Book::factory()->create([
            'slug' => 'a-book',
            'title' => 'A Book',
            'author' => 'An Author',
            'source_path' => 'books/a-book.md',
            'hidden' => true,
            'stats' => ['total_read_time' => 3600, 'read_pages' => 20],
        ]);

        $this->artisan('content:export', [
            '--type' => 'books',
            '--source' => ['books'],
            '--dir' => $this->outputDir,
        ])->assertSuccessful();

        $path = $this->outputDir.'/a-book.md';

        $this->assertFileExists($path);

        $contents = File::get($path);

        $this->assertStringContainsString("title: 'A Book'", $contents);
        $this->assertStringContainsString("author: 'An Author'", $contents);
        $this->assertStringContainsString('status: finished', $contents);
        $this->assertStringContainsString('total_read_time: 3600', $contents);
        $this->assertStringContainsString('hidden: true', $contents);
    }

    public function test_books_source_filter_preserves_subfolders(): void
    {
        Book::factory()->create(['slug' => 'nested-book', 'source_path' => 'books/2026/nested-book.md']);
        Book::factory()->create(['slug' => 'other-book', 'source_path' => 'other/other-book.md']);

        $this->artisan('content:export', [
            '--type' => 'books',
            '--source' => ['books'],
            '--dir' => $this->outputDir,
        ])->assertSuccessful();

        $this->assertFileExists($this->outputDir.'/2026/nested-book.md');
        $this->assertFileDoesNotExist($this->outputDir.'/other-book.md');
    }

    public function test_only_missing_never_overwrites_existing_books(): void
    {
        Book::factory()->create(['slug' => 'a-book', 'source_path' => 'books/a-book.md']);

        $this->artisan('content:export', [
            '--type' => 'books',
            '--source' => ['books'],
            '--dir' => $this->outputDir,
        ])->assertSuccessful();

        $path = $this->outputDir.'/a-book.md';
        File::put($path, "hand edited\n");

        $this->artisan('content:export', [
            '--type' => 'books',
            '--source' => ['books'],
            '--dir' => $this->outputDir,
            '--only-missing' => true,
        ])->assertSuccessful();

        $this->assertSame("hand edited\n", File::get($path));
    }
}
