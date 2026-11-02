<?php

namespace App\Console\Commands;

use App\Models\Book;
use App\Models\Post;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Yaml\Yaml;

class ExportContent extends Command
{
    protected $signature = 'content:export
        {--dir= : Output directory (defaults to posts/ for posts and the configured books source for books)}
        {--source=* : Only export records whose source_path starts with this prefix}
        {--type=all : What to export: posts, books, or all}
        {--db-only : Only export posts with no canonical source (source_path is null or under posts/)}
        {--only-missing : Skip files that already exist instead of overwriting}
        {--dry-run : Preview what would be exported without writing}';

    protected $description = 'Export database posts and books back to markdown files';

    public function handle()
    {
        $type = (string) ($this->option('type') ?: 'all');

        if (! in_array($type, ['all', 'posts', 'books'], true)) {
            $this->error("Invalid --type '{$type}'. Use posts, books, or all.");

            return 1;
        }

        $dryRun = (bool) $this->option('dry-run');
        $exported = 0;

        if ($type === 'all' || $type === 'posts') {
            $exported += $this->exportPosts($dryRun);
        }

        if ($type === 'all' || $type === 'books') {
            $exported += $this->exportBooks($dryRun, $type === 'books');
        }

        if ($exported === 0) {
            return 1;
        }

        $verb = $dryRun ? 'would be written' : 'written';
        $this->info("Done. {$exported} file(s) {$verb}.");

        return 0;
    }

    private function exportPosts(bool $dryRun): int
    {
        $outputDir = $this->option('dir') ?: getcwd().'/posts';
        $prefixes = $this->prefixes();
        $posts = Post::all();

        if (! empty($prefixes)) {
            $posts = $posts->filter(fn (Post $post) => $this->matchesPrefix($post->source_path, $prefixes));
        }

        if ($this->option('db-only')) {
            $posts = $posts->filter(function (Post $post) {
                $source = str_replace('\\', '/', $post->source_path ?? '');

                return $source === '' || str_starts_with($source, 'posts/');
            });
        }

        if ($posts->isEmpty()) {
            $this->warn('No posts matched the selected filters.');

            return 0;
        }

        if (! $dryRun) {
            File::ensureDirectoryExists($outputDir);
        }

        $this->info("Exporting {$posts->count()} post(s) to: {$outputDir}");
        $count = 0;

        foreach ($posts as $post) {
            $relativePath = $this->relativePath($post->source_path, $post->slug, $prefixes);
            $frontmatter = [
                'title' => $post->title,
                'date' => $post->published_date->format('Y-m-d'),
            ];

            if ($post->content_updated_at) {
                $frontmatter['updated'] = $post->content_updated_at->format('Y-m-d');
            }

            if ($post->description) {
                $frontmatter['description'] = $post->description;
            }

            if ($post->tags && count($post->tags) > 0) {
                $frontmatter['tags'] = $post->tags;
            }

            if ($post->is_draft) {
                $frontmatter['draft'] = true;
            }

            if ($post->series) {
                $frontmatter['series'] = $post->series;
            }

            if ($post->series_order !== null) {
                $frontmatter['series_order'] = (int) $post->series_order;
            }

            if ($this->writeFile($outputDir, $relativePath, $frontmatter, $post->content, $dryRun)) {
                $count++;
            }
        }

        return $count;
    }

    private function exportBooks(bool $dryRun, bool $booksOnly): int
    {
        $outputDir = $this->option('dir') ?: $this->booksSourcePath();
        $prefixes = $this->prefixes();
        $books = Book::all();

        if (! empty($prefixes)) {
            $books = $books->filter(fn (Book $book) => $this->matchesPrefix($book->source_path, $prefixes));
        }

        if ($books->isEmpty()) {
            $this->warn('No books matched the selected filters.');

            return 0;
        }

        if (! $outputDir) {
            $this->error('No output directory configured for books and --dir was not provided.');

            return 0;
        }

        if (! $dryRun) {
            File::ensureDirectoryExists($outputDir);
        }

        $this->info("Exporting {$books->count()} book(s) to: {$outputDir}");
        $count = 0;

        foreach ($books as $book) {
            $relativePath = $booksOnly
                ? $this->relativePath($book->source_path, $book->slug, $prefixes)
                : $book->slug.'.md';

            $frontmatter = ['title' => $book->title];

            if ($book->author) {
                $frontmatter['author'] = $book->author;
            }

            $frontmatter['slug'] = $book->slug;
            $frontmatter['status'] = $book->status;

            if ($book->started_on) {
                $frontmatter['started'] = $book->started_on->format('Y-m-d');
            }

            if ($book->finished_on) {
                $frontmatter['finished'] = $book->finished_on->format('Y-m-d');
            }

            if ($book->cover_url) {
                $frontmatter['cover'] = $book->cover_url;
            }

            if ($book->tags && count($book->tags) > 0) {
                $frontmatter['tags'] = $book->tags;
            }

            if ($book->recommended_by) {
                $frontmatter['recommended_by'] = $book->recommended_by;
            }

            if ($book->stats && count($book->stats) > 0) {
                $frontmatter['stats'] = $book->stats;
            }

            if ($book->is_draft) {
                $frontmatter['draft'] = true;
            }

            if ($book->hidden) {
                $frontmatter['hidden'] = true;
            }

            if ($this->writeFile($outputDir, $relativePath, $frontmatter, $book->thoughts ?? '', $dryRun)) {
                $count++;
            }
        }

        return $count;
    }

    private function writeFile(string $outputDir, string $relativePath, array $frontmatter, string $body, bool $dryRun): bool
    {
        $filePath = $outputDir.'/'.$relativePath;
        $yaml = Yaml::dump($frontmatter, 4, 2);
        $content = "---\n{$yaml}---\n\n{$body}";

        if ($dryRun) {
            $this->line("  [dry-run] Would write: {$filePath}");

            return true;
        }

        if ($this->option('only-missing') && File::exists($filePath)) {
            $this->line("  Skipped (exists): {$relativePath}");

            return true;
        }

        if (File::exists($filePath)) {
            if (File::get($filePath) === $content) {
                $this->line("  Skipped (unchanged): {$relativePath}");

                return true;
            }

            $this->warn("  Overwriting: {$relativePath}");
        } else {
            $this->info("  Exported: {$relativePath}");
        }

        File::ensureDirectoryExists(dirname($filePath));
        File::put($filePath, $content);

        return true;
    }

    /**
     * @return array<int, string>
     */
    private function prefixes(): array
    {
        return array_values(array_filter(array_map(
            fn (string $prefix) => trim(str_replace('\\', '/', $prefix), '/'),
            (array) $this->option('source')
        )));
    }

    private function matchesPrefix(?string $sourcePath, array $prefixes): bool
    {
        $source = str_replace('\\', '/', $sourcePath ?? '');

        foreach ($prefixes as $prefix) {
            if (str_starts_with($source, $prefix.'/')) {
                return true;
            }
        }

        return false;
    }

    private function relativePath(?string $sourcePath, string $slug, array $prefixes): string
    {
        if (! empty($prefixes) && $sourcePath) {
            $source = str_replace('\\', '/', $sourcePath);

            foreach ($prefixes as $prefix) {
                if (str_starts_with($source, $prefix.'/')) {
                    return substr($source, strlen($prefix) + 1);
                }
            }
        }

        return $slug.'.md';
    }

    private function booksSourcePath(): ?string
    {
        foreach (config('content.sources', []) as $source) {
            if (($source['type'] ?? 'posts') === 'books' && ! empty($source['path'])) {
                return $source['path'];
            }
        }

        return null;
    }
}
