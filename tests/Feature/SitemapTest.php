<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SitemapTest extends TestCase
{
    use RefreshDatabase;

    private function fakeFeed(): void
    {
        Http::fake([
            '*/index.json' => Http::response([
                'articles' => [
                    [
                        'slug' => '2026-09-21-a-story',
                        'title' => 'A story',
                        'file' => 'articles/a-story.md',
                        'published_at' => '2026-09-21T01:58:10+00:00',
                    ],
                ],
            ]),
        ]);
    }

    public function test_sitemap_includes_nepal_news_index_and_articles(): void
    {
        $this->fakeFeed();

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertSee('/nepal-news', false)
            ->assertSee('/nepal-news/2026-09-21-a-story', false);
    }

    public function test_sitemap_still_renders_when_the_news_feed_is_unavailable(): void
    {
        Http::fake([
            '*/index.json' => Http::response('', 500),
        ]);

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertSee('/nepal-news', false);
    }
}
