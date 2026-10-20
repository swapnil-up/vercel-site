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
    protected $signature = 'posts:import
        {paths?* : Directory paths to import from (omit to import every configured source)}
        {--source=* : Import only the named configured source(s)}
        {--prune : Remove posts from the imported sources whose files no longer exist}
        {--dry-run : Show what would be imported without writing}';

    protected $description = 'Import markdown files from configured article sources into the database';

    private const IGNORED_DIRECTORIES = [
        '.git',
        '.obsidian',
        '.trash',
        '.stversions',
        '.stfolder',
        '.skill',
    ];

    public function handle(WikilinkProcessor $wikilinkProcessor, GraphSync $graphSync): int
    {
        $sources = $this->resolveSources();

        if (empty($sources)) {
            return 1;
        }

        $prepared = [];
        $activePrefixes = [];

        foreach ($sources as $source) {
            $root = realpath($source['path']);

            if ($root === false || ! is_dir($root)) {
                $this->warn("Directory not found: {$source['path']} - skipping (run `php artisan posts:export --dir={$source['path']}` to restore it from the database)");
                continue;
            }

            $activePrefixes[] = $source['prefix'];

            foreach ($this->collectFiles($root, $source) as $file) {
                $preparedFile = $this->prepareFile($file, $root, $source);

                if ($preparedFile !== null) {
                    $prepared[] = $preparedFile;
                }
            }
        }

        if (empty($prepared)) {
            $this->error('No markdown files found in the provided paths or configured sources');
            return 1;
        }

        $collisions = $this->findSlugCollisions($prepared);

        if (! empty($collisions)) {
            foreach ($collisions as $collision) {
                $this->error($collision);
            }

            $this->error('Aborting import: resolve the slug collision(s) above.');
            return 1;
        }

        $dryRun = (bool) $this->option('dry-run');
        $imported = 0;
        $allSlugs = [];
        $importedKeys = [];
        $importedPrefixes = array_values(array_unique($activePrefixes));

        foreach ($prepared as $item) {
            if ($dryRun) {
                $this->line("[dry-run] Would import: {$item['key']}");
            } else {
                Post::updateOrCreate(
                    ['slug' => $item['slug']],
                    [
                        'title' => $item['title'],
                        'content' => $item['content'],
                        'content_html' => '',
                        'description' => $item['description'],
                        'tags' => $item['tags'],
                        'series' => $item['series'],
                        'series_order' => $item['series_order'],
                        'published_date' => $item['published_date'],
                        'content_updated_at' => $item['content_updated_at'],
                        'is_draft' => $item['is_draft'],
                        'source_path' => $item['key'],
                    ]
                );

                $this->info("Imported: {$item['relative']}");
            }

            $allSlugs[] = $item['slug'];
            $importedKeys[] = $item['key'];
            $imported++;
        }

        if ($dryRun) {
            $this->info("Dry run complete. {$imported} post(s) would be imported.");
            return 0;
        }

        $this->info('Processing wikilinks and generating internal links...');
        $this->processWikilinks($allSlugs, $wikilinkProcessor);

        $this->info('Creating graph nodes and connections...');
        $this->createGraphNodesAndConnections($graphSync);

        $this->info("Total imported: {$imported}");

        if ($this->option('prune')) {
            $this->pruneOrphanPosts($importedKeys, $importedPrefixes, $graphSync);
        }

        return 0;
    }

    /**
     * @return array<int, array{name: string, path: string, prefix: string, tag: string, require_publish: bool, exclude: array<int, string>}>
     */
    private function resolveSources(): array
    {
        $paths = $this->argument('paths');

        if (! empty($paths)) {
            $sources = [];

            foreach ($paths as $path) {
                $resolved = realpath($path);
                $name = $resolved !== false ? basename($resolved) : basename($path);
                $prefix = Str::slug($name) ?: 'imported';

                $sources[] = [
                    'name' => $name,
                    'path' => $path,
                    'prefix' => $prefix,
                    'tag' => $name,
                    'require_publish' => false,
                    'exclude' => [],
                ];
            }

            return $sources;
        }

        $configured = config('content.sources', []);
        $requested = $this->option('source');

        if (! empty($requested)) {
            $sources = [];

            foreach ($requested as $name) {
                if (! isset($configured[$name])) {
                    $this->error("Unknown source '{$name}'. Available: ".implode(', ', array_keys($configured)));
                    continue;
                }

                $sources[] = ['name' => $name] + $configured[$name];
            }

            if (empty($sources)) {
                $this->error('No valid sources selected.');
            }

            return $sources;
        }

        if (empty($configured)) {
            $this->error('No configured sources and no paths provided. Usage: php artisan posts:import <path1> <path2> ...');
            return [];
        }

        $sources = [];

        foreach ($configured as $name => $source) {
            $sources[] = ['name' => $name] + $source;
        }

        return $sources;
    }

    /**
     * @return array<int, string>
     */
    private function collectFiles(string $root, array $source): array
    {
        $excluded = $source['exclude'] ?? [];

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveCallbackFilterIterator(
                new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS | \FilesystemIterator::FOLLOW_SYMLINKS),
                function (\SplFileInfo $current) use ($excluded) {
                    $name = $current->getFilename();

                    if ($current->isDir()) {
                        return ! in_array($name, self::IGNORED_DIRECTORIES, true)
                            && ! in_array($name, $excluded, true);
                    }

                    return ! in_array($name, $excluded, true);
                }
            )
        );

        $files = [];

        foreach ($iterator as $file) {
            if (! $file->isFile() || Str::lower($file->getExtension()) !== 'md') {
                continue;
            }

            if (Str::lower($file->getFilename()) === 'readme.md') {
                continue;
            }

            $files[] = $file->getPathname();
        }

        return $files;
    }

    private function prepareFile(string $file, string $root, array $source): ?array
    {
        $filename = basename($file, '.md');

        try {
            $document = YamlFrontMatter::parseFile($file);
        } catch (\Exception $e) {
            $this->error("Failed to import {$file}: ".$e->getMessage());
            return null;
        }

        $frontmatter = $document->matter();

        if (! empty($source['require_publish']) && empty($frontmatter['publish'])) {
            return null;
        }

        $content = trim($document->body()) ?: 'No content yet.';

        $title = $frontmatter['title']
            ?? Str::of($filename)
                ->replace('-', ' ')
                ->replace('_', ' ')
                ->title()
                ->toString();

        $slug = $frontmatter['slug'] ?? Str::slug($filename);

        $relative = str_replace('\\', '/', substr($file, strlen($root) + 1));
        $key = $source['prefix'].'/'.$relative;

        $folders = explode('/', dirname($relative));

        if ($folders === ['.']) {
            $folders = [];
        }

        $tags = array_values(array_unique(array_filter(array_merge(
            (array) ($frontmatter['tags'] ?? []),
            [$source['tag'] ?? $source['name']],
            $folders
        ))));

        $publishedDate = $frontmatter['date']
            ?? $this->extractDateFromContent($content)
            ?? now()->toDateString();

        return [
            'file' => $file,
            'relative' => $relative,
            'key' => $key,
            'prefix' => $source['prefix'],
            'slug' => $slug,
            'title' => $title,
            'content' => $content,
            'description' => $frontmatter['description'] ?? null,
            'tags' => $tags,
            'series' => $frontmatter['series'] ?? null,
            'series_order' => $frontmatter['series_order'] ?? null,
            'published_date' => $publishedDate,
            'content_updated_at' => $frontmatter['updated'] ?? now(),
            'is_draft' => (bool) ($frontmatter['draft'] ?? false),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function findSlugCollisions(array $prepared): array
    {
        $collisions = [];
        $seen = [];

        $knownPrefixes = array_map(
            fn (array $source) => $source['prefix'],
            config('content.sources', [])
        );

        foreach ($prepared as $item) {
            $knownPrefixes[] = $item['prefix'];
        }

        $knownPrefixes = array_values(array_unique($knownPrefixes));

        $existing = Post::whereIn('slug', array_column($prepared, 'slug'))
            ->get()
            ->keyBy('slug');

        foreach ($prepared as $item) {
            if (isset($seen[$item['slug']])) {
                $collisions[] = "Slug '{$item['slug']}' appears in both '{$seen[$item['slug']]}' and '{$item['key']}'.";
                continue;
            }

            $seen[$item['slug']] = $item['key'];

            $post = $existing->get($item['slug']);

            if (! $post || ! $post->source_path) {
                continue;
            }

            $existingPrefix = explode('/', str_replace('\\', '/', $post->source_path), 2)[0];

            if (in_array($existingPrefix, $knownPrefixes, true) && $existingPrefix !== $item['prefix']) {
                $collisions[] = "Slug '{$item['slug']}' already belongs to '{$post->source_path}' but is also in '{$item['key']}'.";
            }
        }

        return $collisions;
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

    private function pruneOrphanPosts(array $importedKeys, array $importedPrefixes, GraphSync $graphSync): void
    {
        $importedKeys = array_flip($importedKeys);

        $orphans = Post::whereNotNull('source_path')
            ->get()
            ->filter(function (Post $post) use ($importedKeys, $importedPrefixes) {
                $source = str_replace('\\', '/', $post->source_path);

                $withinImportedSource = false;
                foreach ($importedPrefixes as $prefix) {
                    if (str_starts_with($source, $prefix.'/')) {
                        $withinImportedSource = true;
                        break;
                    }
                }

                return $withinImportedSource && ! isset($importedKeys[$source]);
            });

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

    private function extractDateFromContent(string $content): ?string
    {
        if (preg_match('/^Date:\s*(\d{4}-\d{2}-\d{2})/mi', $content, $matches)) {
            return $matches[1];
        }

        return null;
    }
}
