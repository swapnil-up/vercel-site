<?php

namespace App\Console\Commands;

use App\Models\Article;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class NepalPublish extends Command
{
    protected $signature = 'nepal:publish';

    protected $description = 'Publish processed articles to the GitHub data repo, merging the rolling index';

    public function handle(): int
    {
        $token = (string) config('nepal.data_repo.token', '');

        if ($token === '') {
            $this->error('GITHUB_TOKEN not set');

            return 1;
        }

        $articles = Article::processed()
            ->orderBy('published_at', 'desc')
            ->get();

        if ($articles->isEmpty()) {
            $this->error('No processed articles to publish.');

            return 1;
        }

        $files = [];
        $fresh = [];

        foreach ($articles as $article) {
            $slug = $this->slugify($article);
            $path = "articles/{$slug}.md";

            $frontmatter = [
                'id' => $article->id,
                'source' => $article->source,
                'source_url' => $article->source_url,
                'title' => $article->title,
                'published_at' => $article->published_at?->toIso8601String(),
                'category' => $article->category,
                'sentiment' => $article->sentiment,
                'importance_score' => $article->importance_score,
                'keywords' => $article->keywords_json ?? [],
                'entities' => $article->entities_json ?? [],
                'summary' => $article->summary,
            ];

            $files[$path] = $this->buildFrontmatter($frontmatter) . "\n\n" . ($article->body ?? '');

            $fresh[] = [
                'id' => $article->id,
                'source' => $article->source,
                'title' => $article->title,
                'slug' => $slug,
                'summary' => $article->summary,
                'category' => $article->category,
                'sentiment' => $article->sentiment,
                'importance_score' => $article->importance_score,
                'published_at' => $article->published_at?->toIso8601String(),
                'keywords' => $article->keywords_json ?? [],
                'file' => $path,
            ];
        }

        // The index is the site's archive, so it is merged with what is already
        // published rather than rebuilt from this run's batch alone.
        $index = array_slice($this->mergeIndex($fresh), 0, max(1, (int) config('nepal.publish.index_cap', 300)));

        $files['index.json'] = json_encode([
            'articles' => $index,
            'count' => count($index),
            'last_updated' => now()->toIso8601String(),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        $uploaded = 0;

        foreach ($files as $path => $content) {
            if ($this->uploadFile($path, $content, $token)) {
                $this->info("  ✓ {$path}");
                $uploaded++;
            } else {
                $this->error("  ✗ {$path}");
            }

            // Rate limit: GitHub allows 5000 req/hour, be conservative
            usleep(100_000);
        }

        $this->info(sprintf(
            'Published %d/%d files (%d new, %d in index).',
            $uploaded,
            count($files),
            $articles->count(),
            count($index),
        ));

        return $uploaded === count($files) ? 0 : 1;
    }

    /**
     * Merge this run's entries into the published index, newest first.
     *
     * @param  array<int, array<string, mixed>>  $fresh
     * @return array<int, array<string, mixed>>
     */
    private function mergeIndex(array $fresh): array
    {
        $bySlug = [];

        foreach ($this->fetchExistingIndex() as $entry) {
            if (isset($entry['slug'])) {
                $bySlug[$entry['slug']] = $entry;
            }
        }

        foreach ($fresh as $entry) {
            $bySlug[$entry['slug']] = $entry;
        }

        $merged = array_values($bySlug);

        usort($merged, fn ($a, $b) => ($b['published_at'] ?? '') <=> ($a['published_at'] ?? ''));

        return $merged;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchExistingIndex(): array
    {
        try {
            $response = Http::timeout(15)->get($this->rawIndexUrl());
        } catch (\Throwable $e) {
            return [];
        }

        if (! $response->successful()) {
            return [];
        }

        $articles = $response->json('articles', []);

        return is_array($articles) ? $articles : [];
    }

    private function rawIndexUrl(): string
    {
        return sprintf(
            'https://raw.githubusercontent.com/%s/%s/%s/index.json',
            config('nepal.data_repo.owner'),
            config('nepal.data_repo.repo'),
            config('nepal.data_repo.branch'),
        );
    }

    private function uploadFile(string $path, string $content, string $token): bool
    {
        $apiUrl = sprintf(
            'https://api.github.com/repos/%s/%s/contents/%s',
            config('nepal.data_repo.owner'),
            config('nepal.data_repo.repo'),
            $path,
        );

        // Get existing file SHA (needed for updates)
        $sha = null;
        $existing = Http::withHeaders([
            'Authorization' => "Bearer {$token}",
            'Accept' => 'application/vnd.github.v3+json',
        ])->get($apiUrl);

        if ($existing->successful()) {
            $sha = $existing->json('sha');
        }

        // Create or update
        $payload = [
            'message' => 'Update ' . basename($path),
            'content' => base64_encode($content),
            'branch' => config('nepal.data_repo.branch'),
            'committer' => [
                'name' => 'github-actions[bot]',
                'email' => '41898282+github-actions[bot]@users.noreply.github.com',
            ],
        ];

        if ($sha) {
            $payload['sha'] = $sha;
        }

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$token}",
            'Accept' => 'application/vnd.github.v3+json',
        ])->put($apiUrl, $payload);

        return $response->successful() || $response->status() === 201;
    }

    private function slugify(Article $article): string
    {
        $date = $article->published_at?->format('Y-m-d') ?? date('Y-m-d');
        $slug = Str::slug($article->title);

        return "{$date}-{$slug}";
    }

    private function buildFrontmatter(array $data): string
    {
        $lines = ['---'];

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $lines[] = "{$key}:";
                foreach ($value as $item) {
                    if (is_array($item)) {
                        $lines[] = '  - ' . json_encode($item);
                    } else {
                        $lines[] = '  - ' . $this->yamlValue($item);
                    }
                }
            } else {
                $lines[] = "{$key}: " . $this->yamlValue($value);
            }
        }

        $lines[] = '---';

        return implode("\n", $lines);
    }

    private function yamlValue(mixed $value): string
    {
        if ($value === null) {
            return 'null';
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_numeric($value)) {
            return (string) $value;
        }

        $str = (string) $value;
        if (in_array(strtolower($str), ['true', 'false', 'null', 'yes', 'no']) || str_contains($str, ':')) {
            return '"' . $str . '"';
        }

        return $str;
    }
}
