<?php

namespace Tests\Feature;

use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ImportPostsTest extends TestCase
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

    public function test_it_imports_all_configured_sources_when_no_paths_are_given(): void
    {
        $til = $this->makeDir('til');
        $published = $this->makeDir('published');

        File::put($til.'/some note.md', "# Some note\n\nDate: 2026-02-22\n\nBody.");
        File::put($published.'/an article.md', "---\ntitle: An Article\ndate: 2026-03-01\n---\n\nBody.");

        config(['content.sources' => [
            'til' => ['path' => $til, 'prefix' => 'til', 'tag' => 'TIL'],
            'published' => ['path' => $published, 'prefix' => 'published', 'tag' => 'articles'],
        ]]);

        $this->artisan('posts:import')->assertSuccessful();

        $this->assertDatabaseHas('posts', [
            'slug' => 'some-note',
            'source_path' => 'til/some note.md',
        ]);
        $this->assertDatabaseHas('posts', [
            'slug' => 'an-article',
            'source_path' => 'published/an article.md',
        ]);
    }

    public function test_missing_source_is_skipped_while_other_sources_still_import(): void
    {
        $til = $this->makeDir('til');
        File::put($til.'/now.md', "# Now\n\nDate: 2026-01-02\n\nCurrent status.");

        config(['content.sources' => [
            'til' => ['path' => $til, 'prefix' => 'til', 'tag' => 'TIL'],
            'missing' => ['path' => '/definitely/not/a/real/directory', 'prefix' => 'missing', 'tag' => 'missing'],
        ]]);

        $this->artisan('posts:import')->assertSuccessful();

        $this->assertDatabaseHas('posts', ['slug' => 'now']);
    }

    public function test_it_only_imports_notes_marked_publish_true_when_required(): void
    {
        $notes = $this->makeDir('notes');
        File::put($notes.'/public-note.md', "---\npublish: true\ntitle: Public\n---\n\nBody.");
        File::put($notes.'/private-note.md', "---\ntitle: Private\n---\n\nBody.");

        config(['content.sources' => [
            'notes' => [
                'path' => $notes,
                'prefix' => 'notes',
                'tag' => 'notes',
                'require_publish' => true,
            ],
        ]]);

        $this->artisan('posts:import')->assertSuccessful();

        $this->assertDatabaseHas('posts', ['slug' => 'public-note']);
        $this->assertDatabaseMissing('posts', ['slug' => 'private-note']);
    }

    public function test_duplicate_slugs_across_sources_abort_without_writing(): void
    {
        $first = $this->makeDir('first');
        $second = $this->makeDir('second');

        File::put($first.'/same.md', "# Same\n\nFrom first.");
        File::put($second.'/same.md', "# Same\n\nFrom second.");

        config(['content.sources' => [
            'first' => ['path' => $first, 'prefix' => 'first', 'tag' => 'first'],
            'second' => ['path' => $second, 'prefix' => 'second', 'tag' => 'second'],
        ]]);

        $this->artisan('posts:import')->assertExitCode(1);

        $this->assertDatabaseCount('posts', 0);
    }

    public function test_prune_only_removes_posts_from_the_imported_sources(): void
    {
        Post::factory()->create([
            'slug' => 'existing-post',
            'source_path' => 'posts/existing-post.md',
        ]);

        Post::factory()->create([
            'slug' => 'stale-article',
            'source_path' => 'articles/stale-article.md',
        ]);

        $articles = $this->makeDir('articles');
        File::put($articles.'/now.md', "# Now\n\nCurrent status.");

        config(['content.sources' => [
            'articles' => ['path' => $articles, 'prefix' => 'articles', 'tag' => 'articles'],
        ]]);

        $this->artisan('posts:import', ['--prune' => true])->assertSuccessful();

        $this->assertDatabaseHas('posts', ['slug' => 'existing-post']);
        $this->assertDatabaseHas('posts', ['slug' => 'now']);
        $this->assertDatabaseMissing('posts', ['slug' => 'stale-article']);
    }

    public function test_prune_does_not_touch_sources_whose_directory_is_missing(): void
    {
        Post::factory()->create([
            'slug' => 'published-post',
            'source_path' => 'published/published-post.md',
        ]);

        $til = $this->makeDir('til');
        File::put($til.'/note.md', "# Note\n\nBody.");

        config(['content.sources' => [
            'til' => ['path' => $til, 'prefix' => 'til', 'tag' => 'TIL'],
            'published' => ['path' => '/definitely/not/a/real/published', 'prefix' => 'published', 'tag' => 'articles'],
        ]]);

        $this->artisan('posts:import', ['--prune' => true])->assertSuccessful();

        $this->assertDatabaseHas('posts', ['slug' => 'published-post']);
    }

    public function test_it_uses_the_date_line_and_source_tag_when_frontmatter_is_absent(): void
    {
        $til = $this->makeDir('TIL');
        File::put($til.'/some useful note.md', "# some useful note\n\nDate: 2026-02-22 11:35\n\n---\n\nBody.");

        config(['content.sources' => [
            'til' => ['path' => $til, 'prefix' => 'til', 'tag' => 'TIL'],
        ]]);

        $this->artisan('posts:import')->assertSuccessful();

        $post = Post::where('slug', 'some-useful-note')->firstOrFail();

        $this->assertSame('2026-02-22', $post->published_date->format('Y-m-d'));
        $this->assertContains('TIL', $post->tags);
        $this->assertSame('til/some useful note.md', $post->source_path);
    }

    public function test_dry_run_does_not_write_posts(): void
    {
        $til = $this->makeDir('til');
        File::put($til.'/note.md', "# Note\n\nBody.");

        config(['content.sources' => [
            'til' => ['path' => $til, 'prefix' => 'til', 'tag' => 'TIL'],
        ]]);

        $this->artisan('posts:import', ['--dry-run' => true])->assertSuccessful();

        $this->assertDatabaseCount('posts', 0);
    }

    private function makeDir(string $name): string
    {
        $dir = sys_get_temp_dir().'/posts-import-test-'.uniqid().'/'.$name;
        File::ensureDirectoryExists($dir);
        $this->tempDirs[] = dirname($dir);

        return $dir;
    }
}
