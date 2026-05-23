<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Services\GraphSync;
use App\Services\WikilinkProcessor;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Spatie\YamlFrontMatter\YamlFrontMatter;

class ImportPosts extends Command
{
    protected $signature = 'posts:import {paths* : One or more directory paths to import from} {--prune : Remove posts whose source files no longer exist}';

    protected $description = 'Import markdown files with frontmatter into database from multiple sources';

    public function handle(WikilinkProcessor $wikilinkProcessor, GraphSync $graphSync)
    {
        $paths = $this->argument('paths');

        if (empty($paths)) {
            $this->error('No paths provided. Usage: php artisan posts:import <path1> <path2> ...');
            return 1;
        }

        $allMdFiles = [];

        foreach ($paths as $path) {
            if (! is_dir($path)) {
                $this->warn("Directory not found: {$path} - skipping");
                continue;
            }

            $files = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($path, \RecursiveDirectoryIterator::FOLLOW_SYMLINKS)
            );

            foreach ($files as $file) {
                if ($file->isFile() && $file->getExtension() === 'md') {
                    $allMdFiles[] = [
                        'path' => $file->getPathname(),
                        'basePath' => $path,
                    ];
                }
            }
        }

        if (empty($allMdFiles)) {
            $this->error('No markdown files found in provided paths');
            return 1;
        }

        $this->info('Found '.count($allMdFiles).' markdown files to import');

        $imported = 0;
        $allSlugs = [];

        foreach ($allMdFiles as $fileData) {
            $file = $fileData['path'];
            $path = $fileData['basePath'];

            try {
                $document = YamlFrontMatter::parseFile($file);
                $filename = basename($file, '.md');

                if (Str::lower(basename($file)) === 'readme.md') {
                    continue;
                }

                $frontmatter = $document->matter();
                $content = trim($document->body()) ?: 'No content yet.';

                $title = $frontmatter['title']
                    ?? Str::of($filename)
                        ->replace('-', ' ')
                        ->replace('_', ' ')
                        ->title();

                $slug = $frontmatter['slug'] ?? Str::slug($filename);
                $allSlugs[] = $slug;

                $relativePath = str_replace($path.'/', '', $file);
                $absolutePath = $file;
                $folders = explode(DIRECTORY_SEPARATOR, $relativePath);
                array_pop($folders);
                $tagsFromPath = $folders;
                $tags = array_merge($frontmatter['tags'] ?? [], $tagsFromPath);

                Post::updateOrCreate(
                    ['slug' => $slug],
                    [
                        'title' => $title,
                        'content' => $content,
                        'content_html' => '',
                        'description' => $frontmatter['description'] ?? null,
                        'tags' => $tags,
                        'series' => $frontmatter['series'] ?? null,
                        'series_order' => $frontmatter['series_order'] ?? null,
                        'published_date' => $frontmatter['date'] ?? now()->toDateString(),
                        'content_updated_at' => $frontmatter['updated'] ?? now(),
                        'is_draft' => $frontmatter['draft'] ?? false,
                        'source_path' => $absolutePath,
                    ]
                );

                $this->info("Imported: {$filename}");
                $imported++;
            } catch (\Exception $e) {
                $this->error("Failed to import {$filename}: ".$e->getMessage());
            }
        }

        $this->info('Processing wikilinks and generating internal links...');
        $this->processWikilinks($allSlugs, $wikilinkProcessor);

        $this->info('Creating graph nodes and connections...');
        $this->createGraphNodesAndConnections($graphSync);

        $this->info("Total imported: {$imported}");

        if ($this->option('prune')) {
            $this->pruneOrphanPosts($allMdFiles, $graphSync);
        }

        return 0;
    }

    private function processWikilinks(array $allSlugs, WikilinkProcessor $wikilinkProcessor): void
    {
        $maps = $wikilinkProcessor->buildSlugMap();
        $slugMap = $maps['slugMap'];
        $titleMap = $maps['titleMap'];
        $slugSet = array_flip($allSlugs);

        $posts = Post::all();

        foreach ($posts as $post) {
            $links = $wikilinkProcessor->extractLinks($post->content);
            $internalLinks = [];

            foreach ($links as $link) {
                $targetSlug = $wikilinkProcessor->resolveSlug($link, $slugMap, $slugSet, $titleMap);
                if ($targetSlug) {
                    $internalLinks[] = $targetSlug;
                }
            }

            $contentHtml = $wikilinkProcessor->convertToHtml($post->content, $slugMap, $slugSet, $titleMap);

            $post->internal_links = array_unique($internalLinks);
            $post->content_html = $contentHtml;
            $post->save();
        }

        $this->info('Updated '.$posts->count().' posts with internal links');
    }

    private function createGraphNodesAndConnections(GraphSync $graphSync): void
    {
        $posts = Post::all();

        foreach ($posts as $post) {
            $graphSync->syncNode($post);
            $graphSync->syncConnections($post);
        }

        $graphSync->cleanupOrphanedConnections();

        $this->info('Created graph nodes and connections for '.$posts->count().' posts');
    }

    private function pruneOrphanPosts(array $importedFiles, GraphSync $graphSync): void
    {
        $importedPaths = array_column($importedFiles, 'path');
        $orphans = Post::whereNotNull('source_path')
            ->whereNotIn('source_path', $importedPaths)
            ->get();

        if ($orphans->isEmpty()) {
            $this->info('No orphan posts to remove.');
            return;
        }

        $count = 0;
        foreach ($orphans as $post) {
            $this->warn("Removing orphan post: {$post->slug} (source: {$post->source_path})");
            $graphSync->removeNode($post->slug);
            $post->delete();
            $count++;
        }

        $this->info("Pruned {$count} orphan post(s).");
    }
}
