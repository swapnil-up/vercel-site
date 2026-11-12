<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Reads the published Nepal News index and article files from the
 * nepal-news-data repository. Cached briefly so the index, the sitemap
 * and the article page do not each hit GitHub on every request.
 */
class NepalNewsFeed
{
    private const CACHE_KEY = 'nepal_news_index';

    private const CACHE_SECONDS = 300;

    private string $repoUrl = 'https://raw.githubusercontent.com/swapnil-up/nepal-news-data/main';

    /**
     * @return array<int, array<string, mixed>>
     */
    public function articles(): array
    {
        try {
            $cached = cache()->get(self::CACHE_KEY);
            if ($cached) {
                return $cached;
            }
        } catch (\Throwable $e) {
            // Cache not available, continue without it.
        }

        try {
            $response = Http::timeout(10)->get("{$this->repoUrl}/index.json");
        } catch (\Throwable $e) {
            return [];
        }

        if (! $response->successful()) {
            return [];
        }

        $data = $response->json('articles', []);

        try {
            cache()->put(self::CACHE_KEY, $data, self::CACHE_SECONDS);
        } catch (\Throwable $e) {
            // Cache not available, continue without it.
        }

        return $data;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function article(string $slug): ?array
    {
        $meta = collect($this->articles())->firstWhere('slug', $slug);

        if (! $meta) {
            return null;
        }

        try {
            $response = Http::timeout(10)->get("{$this->repoUrl}/{$meta['file']}");
        } catch (\Throwable $e) {
            return null;
        }

        if (! $response->successful()) {
            return null;
        }

        $content = $response->body();
        $body = $content;
        $frontmatter = [];

        if (preg_match('/^---\n(.+?)\n---\n(.+)$/s', $content, $matches)) {
            $frontmatter = $this->parseFrontmatter($matches[1]);
            $body = trim($matches[2]);
        }

        return array_merge($meta, $frontmatter, ['body' => $body]);
    }

    /**
     * @return array<string, mixed>
     */
    private function parseFrontmatter(string $yaml): array
    {
        $result = [];
        $lines = explode("\n", $yaml);
        $currentKey = null;
        $currentArray = null;

        foreach ($lines as $line) {
            $line = rtrim($line);

            if ($line === '' || $line[0] === '#') {
                continue;
            }

            if (preg_match('/^  - (.+)$/', $line, $m)) {
                if ($currentArray !== null) {
                    $val = trim($m[1]);
                    $decoded = json_decode($val, true);
                    $result[$currentArray][] = $decoded ?? $this->yamlUnquote($val);
                }

                continue;
            }

            if (preg_match('/^(\w[\w_]*):\s*(.*)$/', $line, $m)) {
                $currentKey = $m[1];
                $value = trim($m[2]);

                if ($value === '') {
                    $result[$currentKey] = [];
                    $currentArray = $currentKey;
                } else {
                    $result[$currentKey] = $this->yamlUnquote($value);
                    $currentArray = null;
                }
            }
        }

        return $result;
    }

    private function yamlUnquote(string $value): mixed
    {
        if ($value === 'null') {
            return null;
        }
        if ($value === 'true') {
            return true;
        }
        if ($value === 'false') {
            return false;
        }
        if (is_numeric($value)) {
            return $value + 0;
        }

        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            return substr($value, 1, -1);
        }

        return $value;
    }
}
