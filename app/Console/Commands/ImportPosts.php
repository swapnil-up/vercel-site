<?php

namespace App\Console\Commands;

use App\Models\Post;
use Illuminate\Console\Command;
use Spatie\YamlFrontMatter\YamlFrontMatter;
use League\CommonMark\CommonMarkConverter;
use Illuminate\Support\Str;

class ImportPosts extends Command
{
    protected $signature = 'posts:import {path}';
    protected $description = 'Import markdown files with frontmatter into database';

    public function handle()
    {
        $path = $this->argument('path');
        
        if (!is_dir($path)) {
            $this->error("Directory not found: {$path}");
            return 1;
        }

        $files = glob($path . '/*.md');
        $imported = 0;

        foreach ($files as $file) {
            try {
                $document = YamlFrontMatter::parseFile($file);
                $filename = basename($file, '.md');
                
                if (preg_match('/^(\d{4}-\d{2}-\d{2})-(.+)$/', $filename, $matches)) {
                    $date = $matches[1];
                    $defaultSlug = $matches[2];
                    
                    $frontmatter = $document->matter();
                    $content = $document->body();
                    
                    $title = $frontmatter['title'] ?? $this->extractTitle($content);
                    $slug = $frontmatter['slug'] ?? $defaultSlug;
                    
                    // Parse wikilinks
                    $internalLinks = $this->extractWikilinks($content);
                    
                    // Convert markdown to HTML with wikilinks processed
                    $contentHtml = $this->processMarkdown($content);
                    
                    Post::updateOrCreate(
                        ['slug' => $slug],
                        [
                            'title' => $title,
                            'content' => $content,
                            'content_html' => $contentHtml,
                            'description' => $frontmatter['description'] ?? null,
                            'tags' => $frontmatter['tags'] ?? [],
                            'series' => $frontmatter['series'] ?? null,
                            'series_order' => $frontmatter['series_order'] ?? null,
                            'internal_links' => $internalLinks,
                            'published_date' => $frontmatter['date'] ?? $date,
                            'content_updated_at' => $frontmatter['updated'] ?? now(),
                            'is_draft' => $frontmatter['draft'] ?? false,
                        ]
                    );
                    
                    $this->info("Imported: {$filename}");
                    $imported++;
                }
            } catch (\Exception $e) {
                $this->error("Failed to import {$filename}: " . $e->getMessage());
            }
        }

        $this->info("Total imported: {$imported}");
        return 0;
    }

    private function extractTitle($content)
    {
        $lines = explode("\n", trim($content));
        return ltrim($lines[0], '# ');
    }

    private function extractWikilinks($content)
    {
        preg_match_all('/\[\[([^\]]+)\]\]/', $content, $matches);
        return array_unique($matches[1]);
    }

    private function processMarkdown($content)
    {
        $converter = new CommonMarkConverter();
        
        // Replace wikilinks with proper links
        $content = preg_replace_callback('/\[\[([^\]]+)\]\]/', function($matches) {
            $linkText = $matches[1];
            $slug = Str::slug($linkText);
            
            // Check if post exists
            $post = Post::where('slug', $slug)->first();
            
            if ($post) {
                return "[{$linkText}](/posts/{$slug})";
            }
            
            // If post doesn't exist, just return the text
            return $linkText;
        }, $content);
        
        return $converter->convert($content)->getContent();
    }
}