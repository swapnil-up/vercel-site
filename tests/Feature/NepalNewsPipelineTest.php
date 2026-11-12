<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Services\NepalArticleSelector;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class NepalNewsPipelineTest extends TestCase
{
    private string $database;

    protected function setUp(): void
    {
        parent::setUp();

        $this->database = tempnam(sys_get_temp_dir(), 'nepal-news-');

        config([
            'database.connections.nepal_news.database' => $this->database,
            'nepal.groq.key' => 'test-key',
            'nepal.groq.model' => 'llama-3.3-70b-versatile',
            'nepal.groq.throttle_seconds' => 0,
            'nepal.data_repo.token' => 'test-token',
        ]);

        DB::purge('nepal_news');

        $this->artisan('migrate', [
            '--database' => 'nepal_news',
            '--path' => 'database/migrations_nepal_news',
            '--force' => true,
        ])->assertSuccessful();
    }

    protected function tearDown(): void
    {
        DB::purge('nepal_news');
        @unlink($this->database);

        parent::tearDown();
    }

    private function article(array $attributes = []): Article
    {
        return Article::create(array_merge([
            'source' => 'kathmandu-post',
            'source_url' => 'https://example.com/' . Str::random(8),
            'title' => 'A story',
            'body' => 'Body text',
            'published_at' => '2026-11-08 10:00:00',
        ], $attributes));
    }

    public function test_selector_dedupes_the_same_story_across_outlets(): void
    {
        $selector = app(NepalArticleSelector::class);

        $articles = collect([
            new Article([
                'source' => 'nepali-times',
                'title' => 'Nepal tallies the cost of its disaster',
                'published_at' => '2026-09-14 09:00:00',
            ]),
            new Article([
                'source' => 'kathmandu-post',
                'title' => 'Nepal tallies cost of its disaster',
                'published_at' => '2026-09-14 08:00:00',
            ]),
            new Article([
                'source' => 'online-khabar',
                'title' => 'Budget speech draws criticism from unions',
                'published_at' => '2026-09-13 08:00:00',
            ]),
        ]);

        $result = $selector->select($articles, 10);

        $this->assertSame(3, $result['considered']);
        $this->assertSame(1, $result['duplicates']);
        $this->assertSame(2, $result['selected']->count());
    }

    public function test_selector_drops_filtered_titles_before_ranking(): void
    {
        $selector = app(NepalArticleSelector::class);

        $articles = collect([
            new Article(['source' => 'online-khabar', 'title' => 'Your horoscope for today', 'published_at' => '2026-09-14 09:00:00']),
            new Article(['source' => 'online-khabar', 'title' => 'Photos of the day from Kathmandu', 'published_at' => '2026-09-14 08:00:00']),
            new Article(['source' => 'online-khabar', 'title' => 'Parliament passes the budget', 'published_at' => '2026-09-14 07:00:00']),
        ]);

        $result = $selector->select($articles, 10);

        $this->assertSame(2, $result['excluded']);
        $this->assertSame(1, $result['selected']->count());
        $this->assertSame('Parliament passes the budget', $result['selected']->first()->title);
    }

    public function test_selector_caps_the_batch_and_reports_the_overflow(): void
    {
        $selector = app(NepalArticleSelector::class);

        $headlines = [
            'Budget speech draws criticism from unions',
            'Earthquake damages homes in Jajarkot',
            'Marriott opens new hotel in Kathmandu',
            'Floods displace families across the Terai',
            'Election commission announces poll dates',
            'Central bank raises interest rates again',
            'Trekkers rescued from the Annapurna circuit',
            'New highway opens in Karnali province',
            'Tiger population rises in Chitwan park',
            'Schools reopen after monsoon damage',
        ];

        $articles = collect($headlines)->map(fn (string $title, int $i) => new Article([
            'source' => 'kathmandu-post',
            'title' => $title,
            'published_at' => '2026-09-14 0' . ($i % 10) . ':00:00',
        ]));

        $result = $selector->select($articles, 3);

        $this->assertSame(3, $result['selected']->count());
        $this->assertSame(7, $result['overflow']);
    }

    private function feed(string $title = '', string $link = ''): string
    {
        $item = $title === '' ? '' : "<item>
            <title>{$title}</title>
            <link>{$link}</link>
            <description>Some body text</description>
            <pubDate>Mon, 09 Nov 2026 10:00:00 +0545</pubDate>
        </item>";

        return '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>'
            . '<title>Feed</title>' . $item . '</channel></rss>';
    }

    public function test_scrape_imports_feed_items(): void
    {
        Http::fake([
            '*kathmandupost.com/*' => Http::response($this->feed('Budget passes', 'https://kathmandupost.com/budget')),
            '*nepalitimes.com/*' => Http::response($this->feed('Mustang roads', 'https://nepalitimes.com/mustang')),
            '*english.onlinekhabar.com/*' => Http::response($this->feed('Gold price up', 'https://english.onlinekhabar.com/gold')),
        ]);

        $this->artisan('nepal:scrape')->assertSuccessful();

        $this->assertSame(3, Article::count());
    }

    public function test_scrape_fails_when_every_feed_is_empty(): void
    {
        Http::fake([
            '*kathmandupost.com/*' => Http::response($this->feed()),
            '*nepalitimes.com/*' => Http::response($this->feed()),
            '*english.onlinekhabar.com/*' => Http::response($this->feed()),
        ]);

        $this->artisan('nepal:scrape')->assertExitCode(1);
    }

    public function test_queue_export_and_import_round_trip_without_duplicating(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'nepal-queue-') . '.json';
        $this->article(['title' => 'Round trip story']);

        $this->artisan('nepal:queue', ['action' => 'export', 'path' => $path])->assertSuccessful();

        Article::query()->delete();

        $this->artisan('nepal:queue', ['action' => 'import', 'path' => $path])->assertSuccessful();
        $this->assertSame(1, Article::count());

        $this->artisan('nepal:queue', ['action' => 'import', 'path' => $path])->assertSuccessful();
        $this->assertSame(1, Article::count());

        @unlink($path);
    }

    public function test_queue_export_can_limit_to_unprocessed_and_recent(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'nepal-queue-') . '.json';

        $this->article(['title' => 'Recent unprocessed', 'published_at' => now()->subDay()]);
        $this->article(['title' => 'Old unprocessed', 'published_at' => now()->subMonth()]);
        $this->article(['title' => 'Recent processed', 'published_at' => now()->subDay(), 'processed_at' => now()]);

        $this->artisan('nepal:queue', [
            'action' => 'export',
            'path' => $path,
            '--unprocessed' => true,
            '--days' => 14,
        ])->assertSuccessful();

        $exported = json_decode((string) file_get_contents($path), true);

        $this->assertCount(1, $exported);
        $this->assertSame('Recent unprocessed', $exported[0]['title']);

        @unlink($path);
    }

    public function test_process_aborts_when_the_model_is_not_available(): void
    {
        Http::fake([
            '*api.groq.com/openai/v1/models' => Http::response(['data' => [['id' => 'llama-3.1-8b-instant']]]),
            '*api.groq.com/openai/v1/chat/completions' => Http::response('', 200),
        ]);

        $this->article();

        $this->artisan('nepal:process')->assertExitCode(1);

        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'chat/completions'));
    }

    public function test_process_stops_after_one_fatal_model_error(): void
    {
        $calls = 0;

        Http::fake([
            '*api.groq.com/openai/v1/models' => Http::response(['data' => [['id' => 'llama-3.3-70b-versatile']]]),
            '*api.groq.com/openai/v1/chat/completions' => function () use (&$calls) {
                $calls++;

                return Http::response([
                    'error' => ['message' => 'The model does not exist', 'code' => 'model_not_found'],
                ], 404);
            },
        ]);

        $this->article(['title' => 'First story']);
        $this->article(['title' => 'Second story']);

        $this->artisan('nepal:process')->assertExitCode(1);

        $this->assertSame(1, $calls);
    }

    public function test_process_records_the_model_output(): void
    {
        Http::fake([
            '*api.groq.com/openai/v1/models' => Http::response(['data' => [['id' => 'llama-3.3-70b-versatile']]]),
            '*api.groq.com/openai/v1/chat/completions' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'summary' => 'A summary',
                            'category' => 'politics',
                            'sentiment' => 'neutral',
                            'entities' => [['type' => 'ORG', 'name' => 'Parliament']],
                            'keywords' => ['budget', 'parliament'],
                            'importance_score' => 7,
                        ]),
                    ],
                ]],
                'usage' => ['total_tokens' => 421],
            ]),
        ]);

        $article = $this->article(['title' => 'Budget passes']);

        $this->artisan('nepal:process')->assertExitCode(0);

        $fresh = $article->fresh();

        $this->assertNotNull($fresh->processed_at);
        $this->assertSame('politics', $fresh->category);
        $this->assertSame(7, $fresh->importance_score);
        $this->assertSame(['budget', 'parliament'], $fresh->keywords_json);
    }

    public function test_publish_merges_the_new_batch_into_the_existing_index(): void
    {
        Http::fake([
            'raw.githubusercontent.com/*' => Http::response([
                'articles' => [[
                    'id' => 1,
                    'source' => 'kathmandu-post',
                    'title' => 'An old story',
                    'slug' => '2026-09-01-an-old-story',
                    'published_at' => '2026-09-01T00:00:00+00:00',
                    'file' => 'articles/2026-09-01-an-old-story.md',
                ]],
            ]),
            'api.github.com/*' => fn ($request) => $request->method() === 'GET'
                ? Http::response('', 404)
                : Http::response(['content' => []], 201),
        ]);

        $this->article([
            'title' => 'Fresh story',
            'published_at' => '2026-11-08 10:00:00',
            'processed_at' => now(),
            'category' => 'politics',
            'sentiment' => 'neutral',
            'summary' => 'Fresh summary',
        ]);

        $index = null;

        $this->artisan('nepal:publish')->assertSuccessful();

        Http::assertSent(function ($request) use (&$index) {
            if ($request->method() !== 'PUT' || ! str_contains($request->url(), 'index.json')) {
                return false;
            }

            $index = json_decode(base64_decode($request->data()['content']), true);

            return true;
        });

        $this->assertNotNull($index);
        $this->assertEqualsCanonicalizing(
            ['2026-09-01-an-old-story', '2026-11-08-fresh-story'],
            array_column($index['articles'], 'slug'),
        );
        // Newest first.
        $this->assertSame('2026-11-08-fresh-story', $index['articles'][0]['slug']);
    }

    public function test_publish_fails_when_nothing_was_processed(): void
    {
        Http::fake();

        $this->article(['processed_at' => null]);

        $this->artisan('nepal:publish')->assertExitCode(1);
    }
}
