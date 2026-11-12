<?php

namespace App\Console\Commands;

use App\Models\Article;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NepalScrape extends Command
{
    protected $signature = 'nepal:scrape';

    protected $description = 'Scrape Nepali English news from RSS feeds';

    private array $sources = [
        'kathmandu-post' => [
            'rss_url' => 'https://kathmandupost.com/rss',
            'type' => 'rss',
        ],
        'nepali-times' => [
            'rss_url' => 'https://www.nepalitimes.com/feed',
            'type' => 'rss',
        ],
        'online-khabar' => [
            'rss_url' => 'https://english.onlinekhabar.com/feed',
            'type' => 'rss',
        ],
        // THT and myRepublica have Cloudflare/CloudFront protection.
        // 'himalayan-times' => [
        //     'rss_url' => 'https://www.thehimalayantimes.com/rss',
        //     'type' => 'rss',
        // ],
        // 'myrepublica' => [
        //     'url' => 'https://myrepublica.nagariknetwork.com/latest-news',
        //     'type' => 'html',
        // ],
    ];

    public function handle(): int
    {
        $totalNew = 0;
        $totalSeen = 0;

        foreach ($this->sources as $sourceName => $config) {
            $this->info("Scraping {$sourceName}...");

            try {
                $result = match ($config['type']) {
                    'rss' => $this->scrapeRss($sourceName, $config['rss_url']),
                    'html' => $this->scrapeHtml($sourceName, $config['url']),
                    default => ['new' => 0, 'seen' => 0],
                };

                $totalNew += $result['new'];
                $totalSeen += $result['seen'];
                $this->info("  → {$result['new']} new from {$sourceName} ({$result['seen']} in feed)");
            } catch (\Exception $e) {
                $this->error("  ✗ Failed to scrape {$sourceName}: {$e->getMessage()}");
                Log::error("Nepal scrape failed for {$sourceName}", [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("Total scraped: {$totalNew} new articles ({$totalSeen} seen)");

        // Every feed failing or coming back empty is a real failure: without it
        // the weekly run would import an empty queue and still look green.
        // Re-running against an existing database is not a failure, hence the
        // seen check rather than the new-article count.
        if ($totalSeen === 0) {
            $this->error('No articles found in any feed.');

            return 1;
        }

        return 0;
    }

    /**
     * @return array{new: int, seen: int}
     */
    private function scrapeRss(string $sourceName, string $rssUrl): array
    {
        $response = Http::timeout(30)
            ->withHeaders([
                'User-Agent' => 'NepalNewsBot/1.0 (personal news aggregator)',
                'Accept' => 'application/rss+xml, application/xml, text/xml',
            ])
            ->get($rssUrl);

        if (! $response->successful()) {
            throw new \RuntimeException("HTTP {$response->status()} from {$rssUrl}");
        }

        $xml = simplexml_load_string($response->body());

        if ($xml === false) {
            throw new \RuntimeException("Failed to parse XML from {$rssUrl}");
        }

        $new = 0;
        $seen = 0;

        foreach ($xml->channel->item as $item) {
            $title = trim((string) ($item->title ?? ''));
            $url = trim((string) ($item->link ?? ''));
            $description = trim((string) ($item->description ?? ''));

            if ($title === '' || $url === '') {
                continue;
            }

            $seen++;

            $article = Article::updateOrCreate(
                ['source_url' => $url],
                [
                    'source' => $sourceName,
                    'title' => $title,
                    'body' => $description,
                    'published_at' => $this->parseDate($item),
                ]
            );

            if ($article->wasRecentlyCreated) {
                $new++;
            }
        }

        return ['new' => $new, 'seen' => $seen];
    }

    /**
     * @return array{new: int, seen: int}
     */
    private function scrapeHtml(string $sourceName, string $url): array
    {
        // Placeholder for HTML scraping — implement when adding THT/myRepublica
        $this->warn("  HTML scraping not yet implemented for {$sourceName}");

        return ['new' => 0, 'seen' => 0];
    }

    private function parseDate(\SimpleXMLElement $item): ?string
    {
        // RSS uses pubDate format: "Mon, 25 Aug 2026 10:30:00 +0545"
        $dateStr = trim((string) ($item->pubDate ?? ''));

        if ($dateStr === '') {
            return now()->toDateTimeString();
        }

        $parsed = date_create($dateStr);

        return $parsed ? $parsed->format('Y-m-d H:i:s') : now()->toDateTimeString();
    }
}
