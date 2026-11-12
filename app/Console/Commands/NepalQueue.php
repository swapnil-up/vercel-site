<?php

namespace App\Console\Commands;

use App\Models\Article;
use Illuminate\Console\Command;

/**
 * Moves scraped articles between runs as JSON. The daily scrape produces a
 * batch, the weekly run imports the week's batches, and whatever is left
 * unprocessed is exported again to carry into the next week.
 */
class NepalQueue extends Command
{
    protected $signature = 'nepal:queue
        {action : export or import}
        {path : JSON file to write or read}
        {--unprocessed : Export only articles that have not been processed}
        {--days= : Export only articles published within this many days}';

    protected $description = 'Export scraped articles to JSON, or import them back into the queue';

    public function handle(): int
    {
        return match ($this->argument('action')) {
            'export' => $this->export(),
            'import' => $this->import(),
            default => $this->unknownAction(),
        };
    }

    private function export(): int
    {
        $path = $this->argument('path');

        $query = Article::query();

        if ($this->option('unprocessed')) {
            $query->unprocessed();
        }

        if ($this->option('days') !== null) {
            $query->where('published_at', '>=', now()->subDays((int) $this->option('days')));
        }

        $articles = $query->orderBy('published_at')->get()->map(fn (Article $article) => [
            'source' => $article->source,
            'source_url' => $article->source_url,
            'title' => $article->title,
            'body' => $article->body,
            'published_at' => $article->published_at?->toDateTimeString(),
        ])->all();

        $encoded = json_encode($articles, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        if ($encoded === false || file_put_contents($path, $encoded) === false) {
            $this->error("Could not write {$path}");

            return 1;
        }

        $this->info('Exported ' . count($articles) . " articles to {$path}");

        return 0;
    }

    private function import(): int
    {
        $path = $this->argument('path');

        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return 1;
        }

        $articles = json_decode((string) file_get_contents($path), true);

        if (! is_array($articles)) {
            $this->error("Not a JSON array: {$path}");

            return 1;
        }

        $added = 0;
        $skipped = 0;

        foreach ($articles as $row) {
            $url = $row['source_url'] ?? null;

            if (! is_string($url) || $url === '') {
                continue;
            }

            $article = Article::firstOrCreate(
                ['source_url' => $url],
                [
                    'source' => $row['source'] ?? 'unknown',
                    'title' => $row['title'] ?? '',
                    'body' => $row['body'] ?? null,
                    'published_at' => $row['published_at'] ?? null,
                ]
            );

            if ($article->wasRecentlyCreated) {
                $added++;
            } else {
                $skipped++;
            }
        }

        $this->info("Imported {$path}: {$added} added, {$skipped} already queued");

        return 0;
    }

    private function unknownAction(): int
    {
        $this->error("Unknown action '{$this->argument('action')}'. Use export or import.");

        return 1;
    }
}
