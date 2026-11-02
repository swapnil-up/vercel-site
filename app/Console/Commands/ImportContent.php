<?php

namespace App\Console\Commands;

use App\Models\Book;
use App\Models\Post;
use App\Services\GraphSync;
use App\Services\WikilinkProcessor;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Spatie\YamlFrontMatter\YamlFrontMatter;

class ImportContent extends Command
{
    protected $signature = 'content:import
        {paths?* : Directory paths to import from (omit to import every configured source)}
        {--source=* : Import only the named configured source(s)}
        {--prune : Remove posts and books from the imported sources whose files no longer exist}
        {--dry-run : Show what would be imported without writing}';

    protected $description = 'Import markdown posts and books from configured content sources into the database';

    private const IGNORED_DIRECTORIES = [
        '.git',
        '.obsidian',
        '.trash',
        '.stversions',
        '.stfolder',
        '.skill',
    ];

    private const BOOK_NUMERIC_STATS = [
        'total_read_time',
        'estimated_read_time',
        'read_pages',
        'total_pages',
        'sessions',
        'highlights',
        'notes',
        'reading_days',
    ];

    public function handle(WikilinkProcessor $wikilinkProcessor, GraphSync $graphSync): int
    {
        $sources = $this->resolveSources();

        if (empty($sources)) {
            return 1;
        }

        $postSources = array_values(array_filter($sources, fn (array $source) => ($source['type'] ?? 'posts') === 'posts'));
        $bookSources = array_values(array_filter($sources, fn (array $source) => ($source['type'] ?? 'posts') === 'books'));

        $preparedPosts = [];
        $preparedBooks = [];
        $activePostPrefixes = [];
        $activeBookPrefixes = [];

        foreach ($postSources as $source) {
            $root = realpath($source['path']);

            if ($root === false || ! is_dir($root)) {
                $this->warn("Directory not found: {$source['path']} - skipping (run `php artisan content:export --dir={$source['path']}` to restore it from the database)");

                continue;
            }

            $activePostPrefixes[] = $source['prefix'];

            foreach ($this->collectFiles($root, $source) as $file) {
                $preparedFile = $this->prepareFile($file, $root, $source);

                if ($preparedFile !== null) {
                    $preparedPosts[] = $preparedFile;
                }
            }
        }

        foreach ($bookSources as $source) {
            $root = realpath($source['path']);

            if ($root === false || ! is_dir($root)) {
                $this->warn("Book directory not found: {$source['path']} - skipping");

                continue;
            }

            $activeBookPrefixes[] = $source['prefix'];

            foreach ($this->collectFiles($root, $source) as $file) {
                $preparedBook = $this->prepareBook($file, $root, $source);

                if ($preparedBook !== null) {
                    $preparedBooks[] = $preparedBook;
                }
            }
        }

        if (empty($preparedPosts) && empty($preparedBooks)) {
            $this->error('No markdown files found in the provided paths or configured sources');

            return 1;
        }

        $collisions = array_merge(
            $this->findSlugCollisions($preparedPosts, $activePostPrefixes),
            $this->findBookSlugCollisions($preparedBooks, $activeBookPrefixes)
        );

        if (! empty($collisions)) {
            foreach ($collisions as $collision) {
                $this->error($collision);
            }

            $this->error('Aborting import: resolve the slug collision(s) above.');

            return 1;
        }

        $dryRun = (bool) $this->option('dry-run');
        $importedPosts = 0;
        $importedBooks = 0;
        $postSlugs = [];
        $postKeys = [];
        $bookSlugs = [];
        $bookKeys = [];

        foreach ($preparedPosts as $item) {
            if ($dryRun) {
                $this->line("[dry-run] Would import post: {$item['key']}");
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

                $this->info("Imported post: {$item['relative']}");
            }

            $postSlugs[] = $item['slug'];
            $postKeys[] = $item['key'];
            $importedPosts++;
        }

        foreach ($preparedBooks as $item) {
            if ($dryRun) {
                $this->line("[dry-run] Would import book: {$item['key']}");
            } else {
                Book::updateOrCreate(
                    ['slug' => $item['slug']],
                    [
                        'title' => $item['title'],
                        'author' => $item['author'],
                        'recommended_by' => $item['recommended_by'],
                        'thoughts' => $item['thoughts'],
                        'thoughts_html' => '',
                        'status' => $item['status'],
                        'started_on' => $item['started_on'],
                        'finished_on' => $item['finished_on'],
                        'cover_url' => $item['cover_url'],
                        'tags' => $item['tags'],
                        'stats' => $item['stats'],
                        'is_draft' => $item['is_draft'],
                        'hidden' => $item['hidden'],
                        'source_path' => $item['key'],
                    ]
                );

                $this->info("Imported book: {$item['relative']}");
            }

            $bookSlugs[] = $item['slug'];
            $bookKeys[] = $item['key'];
            $importedBooks++;
        }

        if ($dryRun) {
            $this->info("Dry run complete. {$importedPosts} post(s) and {$importedBooks} book(s) would be imported.");

            return 0;
        }

        if (! empty($postSlugs)) {
            $this->info('Processing wikilinks and generating internal links...');
            $this->processWikilinks($postSlugs, $wikilinkProcessor);

            $this->info('Creating graph nodes and connections...');
            $this->createGraphNodesAndConnections($graphSync);
        }

        if (! empty($bookSlugs)) {
            $this->processBookWikilinks($bookSlugs, $wikilinkProcessor);
        }

        $this->info("Total imported: {$importedPosts} post(s), {$importedBooks} book(s)");

        if ($this->option('prune')) {
            $this->pruneOrphanPosts($postKeys, $activePostPrefixes, $graphSync);
            $this->pruneOrphanBooks($bookKeys, $activeBookPrefixes);
        }

        return 0;
    }

    /**
     * @return array<int, array{name: string, path: string, prefix: string, tag: string, type: string, require_publish: bool, exclude: array<int, string>}>
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
                    'type' => 'posts',
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

                $sources[] = $configured[$name] + ['name' => $name, 'type' => 'posts'];
            }

            if (empty($sources)) {
                $this->error('No valid sources selected.');
            }

            return $sources;
        }

        if (empty($configured)) {
            $this->error('No configured sources and no paths provided. Usage: php artisan content:import <path1> <path2> ...');

            return [];
        }

        $sources = [];

        foreach ($configured as $name => $source) {
            $sources[] = $source + ['name' => $name, 'type' => 'posts'];
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

    private function prepareBook(string $file, string $root, array $source): ?array
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

        $thoughts = trim($document->body());

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

        $status = Str::lower((string) ($frontmatter['status'] ?? 'finished'));

        if (! in_array($status, Book::STATUSES, true)) {
            $status = 'finished';
        }

        return [
            'file' => $file,
            'relative' => $relative,
            'key' => $key,
            'prefix' => $source['prefix'],
            'slug' => $slug,
            'title' => $title,
            'author' => $frontmatter['author'] ?? $frontmatter['authors'] ?? null,
            'recommended_by' => $frontmatter['recommended_by'] ?? $frontmatter['recommended'] ?? null,
            'thoughts' => $thoughts,
            'status' => $status,
            'started_on' => $this->normalizeDate($frontmatter['started'] ?? $frontmatter['started_on'] ?? null),
            'finished_on' => $this->normalizeDate($frontmatter['finished'] ?? $frontmatter['finished_on'] ?? $frontmatter['date'] ?? null),
            'cover_url' => $frontmatter['cover'] ?? $frontmatter['cover_url'] ?? null,
            'tags' => $tags,
            'stats' => $this->bookStats($frontmatter),
            'is_draft' => (bool) ($frontmatter['draft'] ?? false),
            'hidden' => (bool) ($frontmatter['hidden'] ?? false),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function bookStats(array $frontmatter): ?array
    {
        $stats = is_array($frontmatter['stats'] ?? null) ? $frontmatter['stats'] : [];

        foreach (['total_read_time', 'read_pages', 'total_pages', 'sessions', 'highlights', 'notes', 'reading_days', 'language', 'series'] as $key) {
            if (array_key_exists($key, $frontmatter)) {
                $stats[$key] = $frontmatter[$key];
            }
        }

        foreach (self::BOOK_NUMERIC_STATS as $key) {
            if (isset($stats[$key]) && is_numeric($stats[$key])) {
                $stats[$key] = (int) $stats[$key];
            }
        }

        return $stats === [] ? null : $stats;
    }

    private function normalizeDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * @return array<int, string>
     */
    private function findSlugCollisions(array $prepared, array $knownPrefixes): array
    {
        $collisions = [];
        $seen = [];

        $knownPrefixes = array_values(array_unique(array_merge(
            $knownPrefixes,
            array_column($prepared, 'prefix')
        )));

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

    /**
     * @return array<int, string>
     */
    private function findBookSlugCollisions(array $prepared, array $knownPrefixes): array
    {
        $collisions = [];
        $seen = [];

        $knownPrefixes = array_values(array_unique(array_merge(
            $knownPrefixes,
            array_column($prepared, 'prefix')
        )));

        $existing = Book::whereIn('slug', array_column($prepared, 'slug'))
            ->get()
            ->keyBy('slug');

        foreach ($prepared as $item) {
            if (isset($seen[$item['slug']])) {
                $collisions[] = "Book slug '{$item['slug']}' appears in both '{$seen[$item['slug']]}' and '{$item['key']}'.";

                continue;
            }

            $seen[$item['slug']] = $item['key'];

            $book = $existing->get($item['slug']);

            if (! $book || ! $book->source_path) {
                continue;
            }

            $existingPrefix = explode('/', str_replace('\\', '/', $book->source_path), 2)[0];

            if (in_array($existingPrefix, $knownPrefixes, true) && $existingPrefix !== $item['prefix']) {
                $collisions[] = "Book slug '{$item['slug']}' already belongs to '{$book->source_path}' but is also in '{$item['key']}'.";
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

    private function processBookWikilinks(array $bookSlugs, WikilinkProcessor $wikilinkProcessor): void
    {
        $maps = $wikilinkProcessor->buildSlugMap();

        $books = Book::whereIn('slug', $bookSlugs)->get();

        foreach ($books as $book) {
            $book->thoughts_html = $wikilinkProcessor->convertToHtml(
                $book->thoughts ?? '',
                $maps['slugMap'],
                array_flip(array_keys($maps['slugMap'])),
                $maps['titleMap']
            );
            $book->save();
        }

        $this->info('Updated '.$books->count().' book(s) with rendered thoughts');
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

    private function pruneOrphanBooks(array $importedKeys, array $importedPrefixes): void
    {
        if (empty($importedPrefixes)) {
            return;
        }

        $importedKeys = array_flip($importedKeys);

        $orphans = Book::whereNotNull('source_path')
            ->get()
            ->filter(function (Book $book) use ($importedKeys, $importedPrefixes) {
                $source = str_replace('\\', '/', $book->source_path);

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
            $this->info('No orphan books to remove.');

            return;
        }

        $count = 0;
        foreach ($orphans as $book) {
            $this->warn("Removing orphan book: {$book->slug} (source: {$book->source_path})");
            $book->delete();
            $count++;
        }

        $this->info("Pruned {$count} orphan book(s).");
    }

    private function extractDateFromContent(string $content): ?string
    {
        if (preg_match('/^Date:\s*(\d{4}-\d{2}-\d{2})/mi', $content, $matches)) {
            return $matches[1];
        }

        return null;
    }
}
