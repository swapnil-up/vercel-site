<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class NepalNewsController extends Controller
{
    private string $repoUrl = 'https://raw.githubusercontent.com/swapnil-up/nepal-news-data/main';

    public function index(Request $request): Response
    {
        $articles = $this->fetchIndex();

        // Apply filters
        if ($request->filled('category')) {
            $articles = collect($articles)->where('category', $request->input('category'))->values()->all();
        }

        if ($request->filled('source')) {
            $articles = collect($articles)->where('source', $request->input('source'))->values()->all();
        }

        if ($request->filled('sentiment')) {
            $articles = collect($articles)->where('sentiment', $request->input('sentiment'))->values()->all();
        }

        if ($request->filled('days')) {
            $since = now()->subDays((int) $request->input('days'));
            $articles = collect($articles)->filter(function ($a) use ($since) {
                return isset($a['published_at']) && \Carbon\Carbon::parse($a['published_at'])->gte($since);
            })->values()->all();
        }

        // Sort by published_at desc
        usort($articles, fn ($a, $b) => ($b['published_at'] ?? '') <=> ($a['published_at'] ?? ''));

        // Paginate
        $page = (int) $request->input('page', 1);
        $perPage = 30;
        $total = count($articles);
        $paginated = array_slice($articles, ($page - 1) * $perPage, $perPage);

        $categories = collect($articles)->pluck('category')->filter()->unique()->values()->all();
        $sources = collect($articles)->pluck('source')->filter()->unique()->values()->all();

        return Inertia::render('NepalNews/Index', [
            'articles' => [
                'data' => $paginated,
                'current_page' => $page,
                'last_page' => (int) ceil($total / $perPage),
                'total' => $total,
            ],
            'categories' => $categories,
            'sources' => $sources,
            'filters' => $request->only(['category', 'source', 'sentiment', 'days']),
        ]);
    }

    public function show(string $slug): Response
    {
        $article = $this->fetchArticle($slug);

        if (! $article) {
            abort(404);
        }

        return Inertia::render('NepalNews/Show', [
            'article' => $article,
        ]);
    }

    public function api(Request $request): JsonResponse
    {
        $articles = $this->fetchIndex();

        if ($request->filled('category')) {
            $articles = collect($articles)->where('category', $request->input('category'))->values()->all();
        }

        if ($request->filled('source')) {
            $articles = collect($articles)->where('source', $request->input('source'))->values()->all();
        }

        if ($request->filled('from')) {
            $from = $request->input('from');
            $articles = collect($articles)->filter(fn ($a) => ($a['published_at'] ?? '') >= $from)->values()->all();
        }

        $limit = min((int) $request->input('limit', 50), 100);
        $articles = array_slice($articles, 0, $limit);

        return response()->json([
            'count' => count($articles),
            'articles' => $articles,
        ]);
    }

    private function fetchIndex(): array
    {
        $cacheKey = 'nepal_news_index';

        try {
            $cached = cache()->get($cacheKey);
            if ($cached) {
                return $cached;
            }
        } catch (\Throwable $e) {
            // Cache not available, continue without it
        }

        $response = Http::timeout(10)
            ->get("{$this->repoUrl}/index.json");

        if (! $response->successful()) {
            return [];
        }

        $data = $response->json('articles', []);

        try {
            cache()->put($cacheKey, $data, 300);
        } catch (\Throwable $e) {
            // Cache not available, continue without it
        }

        return $data;
    }

    private function fetchArticle(string $slug): ?array
    {
        $index = $this->fetchIndex();
        $meta = collect($index)->firstWhere('slug', $slug);

        if (! $meta) {
            return null;
        }

        $response = Http::timeout(10)
            ->get("{$this->repoUrl}/{$meta['file']}");

        if (! $response->successful()) {
            return null;
        }

        $content = $response->body();

        // Parse frontmatter
        $body = $content;
        $frontmatter = [];

        if (preg_match('/^---\n(.+?)\n---\n(.+)$/s', $content, $matches)) {
            $frontmatter = $this->parseFrontmatter($matches[1]);
            $body = trim($matches[2]);
        }

        return array_merge($meta, $frontmatter, ['body' => $body]);
    }

    private function parseFrontmatter(string $yaml): array
    {
        // Simple YAML parser for frontmatter
        $result = [];
        $lines = explode("\n", $yaml);
        $currentKey = null;
        $currentArray = null;

        foreach ($lines as $line) {
            $line = rtrim($line);

            if ($line === '' || $line[0] === '#') {
                continue;
            }

            // Array item
            if (preg_match('/^  - (.+)$/', $line, $m)) {
                if ($currentArray !== null) {
                    $val = trim($m[1]);
                    // Try JSON decode for objects
                    $decoded = json_decode($val, true);
                    $result[$currentArray][] = $decoded ?? $this->yamlUnquote($val);
                }
                continue;
            }

            // Key: value
            if (preg_match('/^(\w[\w_]*):\s*(.*)$/', $line, $m)) {
                $currentKey = $m[1];
                $value = trim($m[2]);

                if ($value === '' || $value === null) {
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
        if ($value === 'null') return null;
        if ($value === 'true') return true;
        if ($value === 'false') return false;
        if (is_numeric($value)) return $value + 0;

        // Remove surrounding quotes
        if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
            return substr($value, 1, -1);
        }

        return $value;
    }
}
