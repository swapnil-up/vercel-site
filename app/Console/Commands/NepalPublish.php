<?php

namespace App\Console\Commands;

use App\Models\Article;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class NepalPublish extends Command
{
    protected $signature = 'nepal:publish';

    protected $description = 'Publish processed articles to GitHub data repo via API';

    private string $owner = 'swapnil-up';
    private string $repo = 'nepal-news-data';
    private string $branch = 'main';

    public function handle(): int
    {
        $token = env('GITHUB_TOKEN', '');

        if (! $token) {
            $this->error('GITHUB_TOKEN not set');
            return 1;
        }

        $articles = Article::processed()
            ->orderBy('published_at', 'desc')
            ->get();

        if ($articles->isEmpty()) {
            $this->info('No processed articles to publish.');
            return 0;
        }

        // Build index
        $index = [];
        $files = [];

        foreach ($articles as $article) {
            $slug = $this->slugify($article);
            $filename = "{$slug}.md";
            $path = "articles/{$filename}";

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

            $content = $this->buildFrontmatter($frontmatter) . "\n\n" . ($article->body ?? '');
            $files[$path] = $content;

            $index[] = [
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

        // Add index.json
        $indexData = [
            'articles' => $index,
            'count' => count($index),
            'last_updated' => now()->toIso8601String(),
        ];
        $files['index.json'] = json_encode($indexData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        // Upload each file
        $uploaded = 0;

        foreach ($files as $path => $content) {
            $success = $this->uploadFile($path, $content, $token);

            if ($success) {
                $this->info("  ✓ {$path}");
                $uploaded++;
            } else {
                $this->error("  ✗ {$path}");
            }

            // Rate limit: GitHub allows 5000 req/hour, be conservative
            usleep(100_000);
        }

        $this->info("Published {$uploaded}/" . count($files) . " files to GitHub.");
        return 0;
    }

    private function uploadFile(string $path, string $content, string $token): bool
    {
        $apiUrl = "https://api.github.com/repos/{$this->owner}/{$this->repo}/contents/{$path}";

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
            'branch' => $this->branch,
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
                        $lines[] = "  - " . json_encode($item);
                    } else {
                        $lines[] = "  - " . $this->yamlValue($item);
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
        if ($value === null) return 'null';
        if (is_bool($value)) return $value ? 'true' : 'false';
        if (is_numeric($value)) return (string) $value;

        $str = (string) $value;
        if (in_array(strtolower($str), ['true', 'false', 'null', 'yes', 'no']) || str_contains($str, ':')) {
            return '"' . $str . '"';
        }

        return $str;
    }
}
