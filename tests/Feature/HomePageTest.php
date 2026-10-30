<?php

namespace Tests\Feature;

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
