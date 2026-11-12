<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NotFoundTest extends TestCase
{
    use RefreshDatabase;

    public function test_unknown_routes_render_the_designed_404_page(): void
    {
        $this->get('/definitely-not-a-real-page')
            ->assertStatus(404)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Errors/404')
                ->where('meta.title', 'Page not found — Swapnil Upadhyay')
            );
    }

    public function test_missing_nepal_news_article_renders_the_404_page(): void
    {
        Http::fake(['*/index.json' => Http::response(['articles' => []])]);

        $this->get('/nepal-news/does-not-exist')
            ->assertStatus(404)
            ->assertInertia(fn (Assert $page) => $page->component('Errors/404'));
    }
}
