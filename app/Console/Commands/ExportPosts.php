<?php

namespace App\Console\Commands;

use App\Models\Post;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Yaml\Yaml;

class ExportPosts extends Command
{
    protected $signature = 'posts:export
        {--dir= : Output directory for exported markdown files (default: posts/)}
        {--source=* : Only export posts whose source_path starts with this prefix}
        {--db-only : Only export posts with no canonical source (source_path is null or under posts/)}
        {--only-missing : Skip files that already exist instead of overwriting}
        {--dry-run : Preview what would be exported without writing}';

    protected $description = 'Export database posts back to markdown files';

    public function handle()
    {
        $outputDir = $this->option('dir');
        $dryRun = $this->option('dry-run');

        $posts = Post::all();

        if ($posts->isEmpty()) {
            $this->error('No posts found in the database.');
            return 1;
        }

        $prefixes = array_values(array_filter(array_map(
            fn (string $prefix) => trim(str_replace('\\', '/', $prefix), '/'),
            (array) $this->option('source')
        )));

        if (! empty($prefixes)) {
            $posts = $posts->filter(function (Post $post) use ($prefixes) {
                $source = str_replace('\\', '/', $post->source_path ?? '');

                foreach ($prefixes as $prefix) {
                    if (str_starts_with($source, $prefix.'/')) {
                        return true;
                    }
                }

                return false;
            });
        }

        if ($this->option('db-only')) {
            $posts = $posts->filter(function (Post $post) {
                $source = str_replace('\\', '/', $post->source_path ?? '');

                return $source === '' || str_starts_with($source, 'posts/');
            });
        }

        if ($posts->isEmpty()) {
            $this->error('No posts matched the selected filters.');
            return 1;
        }

        if (! $outputDir) {
            $outputDir = getcwd().'/posts';
        }

        if (! $dryRun) {
            File::ensureDirectoryExists($outputDir);
        }

        $this->info("Exporting {$posts->count()} posts to: {$outputDir}");

        $exported = 0;

        foreach ($posts as $post) {
            $relativePath = $this->relativePath($post, $prefixes);
            $filePath = $outputDir.'/'.$relativePath;

            $frontmatter = [];

            $frontmatter['title'] = $post->title;
            $frontmatter['date'] = $post->published_date->format('Y-m-d');

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

            $yaml = Yaml::dump($frontmatter, 4, 2);
            $content = "---\n{$yaml}---\n\n{$post->content}";

            if ($dryRun) {
                $this->line("  [dry-run] Would write: {$filePath}");
                $exported++;
                continue;
            }

            if ($this->option('only-missing') && File::exists($filePath)) {
                $this->line("  Skipped (exists): {$relativePath}");
                $exported++;
                continue;
            }

            if (File::exists($filePath)) {
                $existing = File::get($filePath);

                if ($existing === $content) {
                    $this->line("  Skipped (unchanged): {$relativePath}");
                    $exported++;
                    continue;
                }

                $this->warn("  Overwriting: {$relativePath}");
            } else {
                $this->info("  Exported: {$relativePath}");
            }

            File::ensureDirectoryExists(dirname($filePath));
            File::put($filePath, $content);
            $exported++;
        }

        $verb = $dryRun ? 'would be written to' : 'written to';
        $this->info("Done. {$exported} post(s) {$verb} {$outputDir}");

        return 0;
    }

    /**
     * Preserve subfolders when exporting a specific source, otherwise flatten to <slug>.md.
     */
    private function relativePath(Post $post, array $prefixes): string
    {
        if (! empty($prefixes) && $post->source_path) {
            $source = str_replace('\\', '/', $post->source_path);

            foreach ($prefixes as $prefix) {
                if (str_starts_with($source, $prefix.'/')) {
                    return substr($source, strlen($prefix) + 1);
                }
            }
        }

        return $post->slug.'.md';
    }
}
