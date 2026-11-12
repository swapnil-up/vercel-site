<?php

namespace Tests\Feature;

use App\Models\Connection;
use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomePageTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_renders_the_journey_with_latest_posts(): void
    {
        Post::create([
            'title' => 'A newer note',
            'slug' => 'newer-note',
            'content' => 'Body',
            'content_html' => '<p>Body</p>',
            'description' => 'Newer description',
            'tags' => ['notes'],
            'published_date' => '2026-10-01',
            'is_draft' => false,
        ]);

        Post::create([
            'title' => 'An older note',
            'slug' => 'older-note',
            'content' => 'Body',
            'content_html' => '<p>Body</p>',
            'description' => 'Older description',
            'tags' => ['notes'],
            'published_date' => '2026-01-01',
            'is_draft' => false,
        ]);

        Post::create([
            'title' => 'A map',
            'slug' => 'a-map',
            'content' => 'Body',
            'content_html' => '<p>Body</p>',
            'description' => 'Map description',
            'tags' => ['moc'],
            'published_date' => '2026-11-01',
            'is_draft' => false,
        ]);

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Index')
                ->has('latestPosts', 2)
                ->where('latestPosts.0.slug', 'newer-note')
                ->where('latestPosts.1.slug', 'older-note')
                ->has('graphStats')
                ->has('meta')
            );
    }

    public function test_home_graph_stats_match_the_graph_page_counts(): void
    {
        $a = Post::factory()->create(['slug' => 'a-note']);
        $b = Post::factory()->create(['slug' => 'b-note']);

        Connection::create(['from_id' => $a->slug, 'to_id' => $b->slug, 'type' => 'mentions', 'weight' => 1]);
        Connection::create(['from_id' => $b->slug, 'to_id' => $a->slug, 'type' => 'mentions', 'weight' => 1]);
        // Dangling link: endpoint has no node, should not be counted.
        Connection::create(['from_id' => $a->slug, 'to_id' => 'missing-note', 'type' => 'mentions', 'weight' => 1]);

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('graphStats.notes', 2)
                ->where('graphStats.connections', 1)
            );

        $this->getJson('/data/graph')
            ->assertOk()
            ->assertJsonPath('stats.notes', 2)
            ->assertJsonPath('stats.links', 1);
    }

    public function test_home_excludes_drafts(): void
    {
        Post::create([
            'title' => 'Draft',
            'slug' => 'draft-note',
            'content' => 'Body',
            'content_html' => '<p>Body</p>',
            'published_date' => '2026-10-01',
            'is_draft' => true,
        ]);

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('latestPosts', 0));
    }
}
