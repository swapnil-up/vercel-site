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
        $totalScraped = 0;

        foreach ($this->sources as $sourceName => $config) {
            $this->info("Scraping {$sourceName}...");

            try {
                $count = match ($config['type']) {
                    'rss' => $this->scrapeRss($sourceName, $config['rss_url']),
                    'html' => $this->scrapeHtml($sourceName, $config['url']),
                    default => 0,
                };

                $totalScraped += $count;
                $this->info("  → {$count} articles from {$sourceName}");
            } catch (\Exception $e) {
                $this->error("  ✗ Failed to scrape {$sourceName}: {$e->getMessage()}");
                Log::error("Nepal scrape failed for {$sourceName}", [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("Total scraped: {$totalScraped} articles");
        return 0;
    }

    private function scrapeRss(string $sourceName, string $rssUrl): int
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

        $count = 0;

        foreach ($xml->channel->item as $item) {
            $title = trim((string) ($item->title ?? ''));
            $url = trim((string) ($item->link ?? ''));
            $description = trim((string) ($item->description ?? ''));

            if ($title === '' || $url === '') {
                continue;
            }

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
                $count++;
            }
        }

        return $count;
    }

    private function scrapeHtml(string $sourceName, string $url): int
    {
        // Placeholder for HTML scraping — implement when adding THT/myRepublica
        $this->warn("  HTML scraping not yet implemented for {$sourceName}");
        return 0;
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
