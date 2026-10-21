<?php

namespace Tests\Feature;

use App\Models\Connection;
use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostRelationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_post_page_separates_maps_from_backlinks(): void
    {
        $map = Post::factory()->create([
            'slug' => 'topic-map',
            'tags' => ['moc'],
            'source_path' => 'published/maps/topic-map.md',
        ]);
        $note = Post::factory()->create(['slug' => 'a-note']);
        $backlink = Post::factory()->create(['slug' => 'older-note']);

        Connection::create([
            'from_id' => $map->slug,
            'to_id' => $note->slug,
            'type' => 'mentions',
            'weight' => 1,
        ]);
        Connection::create([
            'from_id' => $backlink->slug,
            'to_id' => $note->slug,
            'type' => 'mentions',
            'weight' => 1,
        ]);

        $response = $this->get("/posts/{$note->slug}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Posts/Show')
            ->where('post.slug', $note->slug)
            ->has('maps', 1)
            ->where('maps.0.slug', $map->slug)
            ->has('backlinks', 1)
            ->where('backlinks.0.slug', $backlink->slug)
        );
    }

    public function test_node_endpoint_returns_maps_and_backlinks(): void
    {
        $map = Post::factory()->create([
            'slug' => 'topic-map',
            'tags' => ['moc'],
            'source_path' => 'published/maps/topic-map.md',
        ]);
        $note = Post::factory()->create(['slug' => 'a-note']);
        $backlink = Post::factory()->create(['slug' => 'older-note']);

        Connection::create([
            'from_id' => $map->slug,
            'to_id' => $note->slug,
            'type' => 'mentions',
            'weight' => 1,
        ]);
        Connection::create([
            'from_id' => $backlink->slug,
            'to_id' => $note->slug,
            'type' => 'mentions',
            'weight' => 1,
        ]);

        $response = $this->getJson("/data/node/article/{$note->slug}");

        $response->assertOk();
        $response->assertJsonPath('title', $note->title);
        $response->assertJsonPath('maps.0.slug', $map->slug);
        $response->assertJsonPath('backlinks.0.slug', $backlink->slug);
    }

    public function test_writing_index_separates_maps_and_feed_omits_them(): void
    {
        $map = Post::factory()->create([
            'slug' => 'topic-map',
            'title' => 'Topic Map',
            'tags' => ['moc'],
            'source_path' => 'published/maps/topic-map.md',
        ]);
        Post::factory()->create(['slug' => 'a-note', 'title' => 'A Note']);

        $this->get('/posts')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Posts/Index')
                ->has('posts', 1)
                ->has('maps', 1)
                ->where('maps.0.slug', $map->slug)
            );

        $this->get('/feed')
            ->assertOk()
            ->assertSee('A Note')
            ->assertDontSee('Topic Map');
    }
}
