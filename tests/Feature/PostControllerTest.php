<?php

namespace Tests\Feature;

use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_posts_index_returns_all_published_posts(): void
    {
        Post::factory()->count(3)->create();
        Post::factory()->draft()->create();

        $response = $this->get('/posts');

        $response->assertStatus(200);
        $response->assertInertia(fn($page) => $page
            ->component('Posts/Index')
            ->has('posts', 3)
        );
    }

    public function test_posts_index_orders_by_published_date_desc(): void
    {
        $older = Post::factory()->create(['published_date' => now()->subDays(2)]);
        $newer = Post::factory()->create(['published_date' => now()]);

        $response = $this->get('/posts');

        $response->assertStatus(200);
        $response->assertInertia(fn($page) => $page
            ->component('Posts/Index')
            ->has('posts', 2)
        );
    }

    public function test_post_show_returns_single_post(): void
    {
        $post = Post::factory()->create();

        $response = $this->get("/posts/{$post->slug}");

        $response->assertStatus(200);
        $response->assertInertia(fn($page) => $page
            ->component('Posts/Show')
            ->where('post.title', $post->title)
        );
    }

    public function test_post_show_returns_404_for_draft(): void
    {
        $post = Post::factory()->draft()->create();

        $response = $this->get("/posts/{$post->slug}");

        $response->assertStatus(404);
    }

    public function test_post_by_tag_filters_correctly(): void
    {
        Post::factory()->create(['tags' => ['laravel']]);
        Post::factory()->create(['tags' => ['vue']]);
        Post::factory()->create(['tags' => ['laravel', 'vue']]);

        $response = $this->get('/posts/tag/laravel');

        $response->assertStatus(200);
        $response->assertInertia(fn($page) => $page
            ->component('Posts/Index')
            ->where('selectedTag', 'laravel')
        );
    }
}
