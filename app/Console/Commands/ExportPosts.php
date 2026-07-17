<?php

namespace App\Console\Commands;

use App\Models\Post;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Yaml\Yaml;

class ExportPosts extends Command
{
    protected $signature = 'posts:export {--dir= : Output directory for exported markdown files (default: posts/)} {--dry-run : Preview what would be exported without writing}';

    protected $description = 'Export all posts from the database back to markdown files';

    public function handle()
    {
        $outputDir = $this->option('dir');
        $dryRun = $this->option('dry-run');

        $posts = Post::all();

        if ($posts->isEmpty()) {
            $this->error('No posts found in the database.');
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
            $filename = $post->slug.'.md';
            $filePath = $outputDir.'/'.$filename;

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

            if (File::exists($filePath)) {
                $existing = File::get($filePath);
                if ($existing === $content) {
                    $this->line("  Skipped (unchanged): {$filename}");
                    $exported++;
                    continue;
                }
                $this->warn("  Overwriting: {$filename}");
            } else {
                $this->info("  Exported: {$filename}");
            }

            File::put($filePath, $content);
            $exported++;
        }

        $verb = $dryRun ? 'would be written to' : 'written to';
        $this->info("Done. {$exported} post(s) {$verb} {$outputDir}");

        return 0;
    }
}
