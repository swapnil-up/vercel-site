<?php

namespace App\Console\Commands;

use App\Models\Connection;
use App\Models\Post;
use App\Models\Thought;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use League\CommonMark\CommonMarkConverter;
use Spatie\YamlFrontMatter\YamlFrontMatter;

class ImportPosts extends Command
{
protected $signature = 'posts:import {paths* : One or more directory paths to import from} {--prune : Remove posts whose source files no longer exist}';

  protected $description = 'Import markdown files with frontmatter into database from multiple sources';

    public function handle()
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

                $defaultSlug = $filename;

                $frontmatter = $document->matter();
                $date = $frontmatter['date'] ?? now()->toDateString();
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
                        'content_html' => '', // Will be updated in processWikilinks
                        'description' => $frontmatter['description'] ?? null,
                        'tags' => $tags,
                        'series' => $frontmatter['series'] ?? null,
                        'series_order' => $frontmatter['series_order'] ?? null,
                        'published_date' => $frontmatter['date'] ?? $date,
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
    $this->processWikilinks($allSlugs);

    $this->info('Creating graph nodes and connections...');
    $this->createGraphNodesAndConnections();

    $this->info("Total imported: {$imported}");

    if ($this->option('prune')) {
      $this->pruneOrphanPosts($allMdFiles);
    }

    return 0;
  }

    private function processWikilinks(array $allSlugs)
    {
        $posts = Post::all();
        $slugMap = collect($posts)->mapWithKeys(function ($post) {
            return [$post->slug => $post->id];
        })->toArray();

        $titleMap = collect($posts)->mapWithKeys(function ($post) {
            return [Str::slug($post->title) => $post->slug];
        })->toArray();

        $slugSet = array_flip($allSlugs);

        foreach ($posts as $post) {
            $content = $post->content;
            $internalLinks = [];

            preg_match_all('/\[\[([^\]]+)\]\]/', $content, $matches);

            foreach ($matches[1] as $link) {
                $parts = explode('|', $link);
                $slugPart = end($parts);
                if ($slugPart === false) {
                    continue;
                }
                $slug = Str::slug(trim($slugPart));

                $targetSlug = null;
                if (isset($slugSet[$slug])) {
                    $targetSlug = $slug;
                } elseif (isset($slugMap[$slug])) {
                    $targetSlug = $slug;
                } elseif (isset($titleMap[$slug])) {
                    $targetSlug = $titleMap[$slug];
                } else {
                    foreach ($slugMap as $existingSlug => $postId) {
                        if (str_contains($existingSlug, $slug) || str_contains($slug, $existingSlug)) {
                            $targetSlug = $existingSlug;
                            break;
                        }
                    }
                }

                if ($targetSlug) {
                    $internalLinks[] = $targetSlug;
                }
            }

            $contentHtml = $this->convertToHtml($content, $slugMap, $slugSet, $titleMap);

            $post->internal_links = array_unique($internalLinks);
            $post->content_html = $contentHtml;
            $post->save();
        }

        $this->info('Updated '.$posts->count().' posts with internal links');
    }

    private function convertToHtml(string $content, array $slugMap, array $slugSet, array $titleMap): string
    {
        $converter = new CommonMarkConverter;

        $content = preg_replace_callback('/\[\[([^\]]+)\]\]/', function ($matches) use ($slugMap, $slugSet, $titleMap) {
            $link = $matches[1];
            $parts = explode('|', $link);

            if (count($parts) === 2) {
                $displayText = trim($parts[0]);
                $slug = Str::slug(trim($parts[1]));
            } else {
                $displayText = trim($link);
                $slug = Str::slug($displayText);
            }

            $targetSlug = null;
            if (isset($slugSet[$slug])) {
                $targetSlug = $slug;
            } elseif (isset($slugMap[$slug])) {
                $targetSlug = $slug;
            } elseif (isset($titleMap[$slug])) {
                $targetSlug = $titleMap[$slug];
            } else {
                foreach ($slugMap as $existingSlug => $postId) {
                    if (str_contains($existingSlug, $slug) || str_contains($slug, $existingSlug)) {
                        $targetSlug = $existingSlug;
                        break;
                    }
                }
            }

            if ($targetSlug) {
                return "[{$displayText}](/posts/{$targetSlug})";
            }

            return $displayText;
        }, $content);

        return $converter->convert($content)->getContent();
    }

    private function createGraphNodesAndConnections()
    {
        $posts = Post::all();

        foreach ($posts as $post) {
            $this->createGraphNode($post);
            $this->createGraphConnections($post);
        }

        // Clean up orphaned connections (where target post no longer exists)
        $this->cleanupOrphanedConnections();

        $this->info('Created graph nodes and connections for '.$posts->count().' posts');
    }

    private function createGraphNode(Post $post)
    {
        $existingThought = Thought::find($post->slug);

        if ($existingThought) {
            // Update existing thought with latest post data
            $existingThought->update([
                'title' => $post->title,
                'content' => $post->content,
                'tags' => $post->tags,
            ]);
        } else {
            // Create new thought
            Thought::create([
                'id' => $post->slug,
                'title' => $post->title,
                'content' => $post->content,
                'type' => 'article',
                'tags' => $post->tags,
            ]);

            $this->info("Created graph node: {$post->slug}");
        }
    }

    private function createGraphConnections(Post $post)
    {
        if (empty($post->internal_links)) {
            // Remove all connections from this post if it has no internal links
            Connection::where('from_id', $post->slug)->delete();

            return;
        }

        // Get current connections for this post
        $currentConnections = Connection::where('from_id', $post->slug)
            ->where('type', 'mentions')
            ->get()
            ->pluck('to_id')
            ->toArray();

        // Create new connections that don't exist
        foreach ($post->internal_links as $linkedSlug) {
            $existingConnection = Connection::where('from_id', $post->slug)
                ->where('to_id', $linkedSlug)
                ->where('type', 'mentions')
                ->first();

            if (! $existingConnection) {
                Connection::create([
                    'from_id' => $post->slug,
                    'to_id' => $linkedSlug,
                    'type' => 'mentions',
                    'weight' => 0.5,
                ]);

                $this->info("Created graph connection: {$post->slug} -> {$linkedSlug}");
            }
        }

        // Remove connections that are no longer in internal_links
        $connectionsToRemove = array_diff($currentConnections, $post->internal_links);
        foreach ($connectionsToRemove as $toRemove) {
            Connection::where('from_id', $post->slug)
                ->where('to_id', $toRemove)
                ->where('type', 'mentions')
                ->delete();
        }
    }

    private function cleanupOrphanedConnections()
    {
        // Get all valid post slugs
        $validSlugs = Post::pluck('slug')->toArray();

// Remove connections where target doesn't exist
    $orphanedConnections = Connection::whereNotIn('to_id', $validSlugs)->get();
    foreach ($orphanedConnections as $connection) {
      $this->info("Removed orphaned connection: {$connection->from_id} -> {$connection->to_id}");
      $connection->delete();
    }
  }

  private function pruneOrphanPosts(array $importedFiles)
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
      
      // Remove corresponding graph node and connections
      Thought::find($post->slug)?->delete();
      Connection::where('from_id', $post->slug)->delete();
      Connection::where('to_id', $post->slug)->delete();
      
      $post->delete();
      $count++;
    }

    $this->info("Pruned {$count} orphan post(s).");
  }
}
