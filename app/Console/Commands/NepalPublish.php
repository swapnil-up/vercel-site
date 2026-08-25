<?php

namespace App\Console\Commands;

use App\Models\Article;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class NepalPublish extends Command
{
    protected $signature = 'nepal:publish {--repo= : Path to local clone of data repo}';

    protected $description = 'Publish processed articles to GitHub data repo';

    private string $repoPath;

    public function handle(): int
    {
        $this->repoPath = $this->option('repo') ?? env('NEPAL_NEWS_REPO', '/tmp/nepal-news-data');

        if (! is_dir($this->repoPath . '/.git')) {
            $this->error("Not a git repo: {$this->repoPath}");
            return 1;
        }

        $articles = Article::processed()
            ->orderBy('published_at', 'desc')
            ->get();

        if ($articles->isEmpty()) {
            $this->info('No processed articles to publish.');
            return 0;
        }

        // Ensure directories exist
        File::makeDirectory($this->repoPath . '/articles', 0755, true, true);

        // Write each article as markdown with frontmatter
        $index = [];

        foreach ($articles as $article) {
            $slug = $this->slugify($article);
            $filename = "{$slug}.md";
            $filepath = $this->repoPath . '/articles/' . $filename;

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

            File::put($filepath, $content);

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
                'file' => "articles/{$filename}",
            ];
        }

        // Write index
        $indexData = [
            'articles' => $index,
            'count' => count($index),
            'last_updated' => now()->toIso8601String(),
        ];

        File::put(
            $this->repoPath . '/index.json',
            json_encode($indexData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        // Git commit and push
        $this->gitCommit($articles->count());

        $this->info("Published {$articles->count()} articles to data repo.");
        return 0;
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

        // Quote strings that could be misinterpreted
        $str = (string) $value;
        if (in_array(strtolower($str), ['true', 'false', 'null', 'yes', 'no']) || str_contains($str, ':')) {
            return '"' . $str . '"';
        }

        return $str;
    }

    private function gitCommit(int $count): void
    {
        $repo = $this->repoPath;

        exec("cd {$repo} && git add -A", $output, $exitCode);
        if ($exitCode !== 0) {
            $this->error('git add failed');
            return;
        }

        $timestamp = now()->format('Y-m-d H:i:s');
        exec("cd {$repo} && git commit -m 'Update: {$count} articles ({$timestamp})'", $output, $exitCode);

        if ($exitCode === 0) {
            exec("cd {$repo} && git push", $output, $exitCode);
            if ($exitCode !== 0) {
                $this->error('git push failed');
            }
        }
    }
}
