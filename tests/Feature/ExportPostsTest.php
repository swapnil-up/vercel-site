<?php

namespace Tests\Feature;

use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ExportPostsTest extends TestCase
{
    use RefreshDatabase;

    private string $outputDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->outputDir = sys_get_temp_dir().'/posts-export-test-'.uniqid();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->outputDir);

        parent::tearDown();
    }

    public function test_source_filter_exports_only_matching_posts_and_preserves_subfolders(): void
    {
        Post::factory()->create(['slug' => 'published-post', 'source_path' => 'published/published-post.md']);
        Post::factory()->create(['slug' => 'course-post', 'source_path' => 'published/courses/course-post.md']);
        Post::factory()->create(['slug' => 'til-post', 'source_path' => 'til/til-post.md']);

        $this->artisan('posts:export', [
            '--source' => ['published'],
            '--dir' => $this->outputDir,
        ])->assertSuccessful();

        $this->assertFileExists($this->outputDir.'/published-post.md');
        $this->assertFileExists($this->outputDir.'/courses/course-post.md');
        $this->assertFileDoesNotExist($this->outputDir.'/til-post.md');
    }

    public function test_only_missing_never_overwrites_existing_files(): void
    {
        Post::factory()->create(['slug' => 'published-post', 'source_path' => 'published/published-post.md']);

        $this->artisan('posts:export', [
            '--source' => ['published'],
            '--dir' => $this->outputDir,
        ])->assertSuccessful();

        $path = $this->outputDir.'/published-post.md';
        $original = File::get($path);
        File::put($path, "hand edited\n");

        $this->artisan('posts:export', [
            '--source' => ['published'],
            '--dir' => $this->outputDir,
            '--only-missing' => true,
        ])->assertSuccessful();

        $this->assertSame("hand edited\n", File::get($path));
        $this->assertNotSame($original, File::get($path));
    }

    public function test_db_only_exports_posts_without_a_canonical_source(): void
    {
        Post::factory()->create(['slug' => 'orphan-post', 'source_path' => null]);
        Post::factory()->create(['slug' => 'legacy-post', 'source_path' => 'posts/legacy-post.md']);
        Post::factory()->create(['slug' => 'til-post', 'source_path' => 'til/til-post.md']);

        $this->artisan('posts:export', [
            '--db-only' => true,
            '--dir' => $this->outputDir,
        ])->assertSuccessful();

        $this->assertFileExists($this->outputDir.'/orphan-post.md');
        $this->assertFileExists($this->outputDir.'/legacy-post.md');
        $this->assertFileDoesNotExist($this->outputDir.'/til-post.md');
    }
}
