<?php

namespace App\Http\Controllers;

use App\Models\Connection;
use App\Models\Post;
use App\Models\Thought;

class GraphDataController extends Controller
{
    public function index()
    {
        $posts = Post::where('is_draft', false)
            ->get(['slug', 'title', 'description', 'tags', 'source_path', 'published_date']);

        $thoughts = Thought::all(['id', 'title', 'type', 'content']);
        $connections = Connection::all(['from_id', 'to_id', 'type', 'weight']);

        $mapSlugs = $posts
            ->filter(fn (Post $post) => in_array('moc', $post->tags ?? [], true))
            ->pluck('slug')
            ->flip();

        $postSlugs = $posts->pluck('slug')->flip();
        $nodes = [];

        foreach ($posts as $post) {
            $path = $this->portablePath($post->source_path);

            $nodes[$post->slug] = [
                'id' => $post->slug,
                'title' => $post->title,
                'description' => $post->description,
                'type' => 'article',
                'section' => $path[0],
                'folder' => $path[1],
                'is_map' => $mapSlugs->has($post->slug),
                'tags' => $post->tags ?? [],
                'published_date' => $post->published_date?->toDateString(),
                'maps' => [],
                'degree' => 0,
                'incoming' => 0,
                'outgoing' => 0,
                'url' => '/data/node/article/'.$post->slug,
            ];
        }

        foreach ($thoughts as $thought) {
            if ($postSlugs->has($thought->id)) {
                continue;
            }

            $nodes[$thought->id] = [
                'id' => $thought->id,
                'title' => $thought->title ?: '• • •',
                'description' => null,
                'type' => 'thought',
                'section' => 'thought',
                'folder' => null,
                'is_map' => false,
                'tags' => [],
                'published_date' => null,
                'maps' => [],
                'degree' => 0,
                'incoming' => 0,
                'outgoing' => 0,
                'url' => '/data/node/thought/'.$thought->id,
            ];
        }

        $links = [];
        $seenPairs = [];
        $neighbors = [];
        $incoming = [];
        $outgoing = [];
        $mapsByNode = [];

        foreach ($connections as $connection) {
            $from = $connection->from_id;
            $to = $connection->to_id;

            if ($from === $to || ! isset($nodes[$from]) || ! isset($nodes[$to])) {
                continue;
            }

            $outgoing[$from] = ($outgoing[$from] ?? 0) + 1;
            $incoming[$to] = ($incoming[$to] ?? 0) + 1;
            $neighbors[$from][$to] = true;
            $neighbors[$to][$from] = true;

            if ($mapSlugs->has($from) && ! $mapSlugs->has($to)) {
                $mapsByNode[$to][$from] = true;
            }

            $pair = [$from, $to];
            sort($pair);
            $pairKey = implode('|', $pair);

            if (! isset($seenPairs[$pairKey])) {
                $seenPairs[$pairKey] = true;
                $links[] = [
                    'source' => $from,
                    'target' => $to,
                    'type' => $connection->type,
                    'weight' => $connection->weight,
                ];
            }
        }

        foreach ($nodes as $id => &$node) {
            $node['degree'] = count($neighbors[$id] ?? []);
            $node['incoming'] = $incoming[$id] ?? 0;
            $node['outgoing'] = $outgoing[$id] ?? 0;
            $node['maps'] = array_keys($mapsByNode[$id] ?? []);
        }
        unset($node);

        $isolated = collect($nodes)->filter(fn (array $node) => $node['degree'] === 0)->count();

        return response()->json([
            'nodes' => array_values($nodes),
            'connections' => $links,
            'stats' => [
                'notes' => $posts->count(),
                'maps' => $mapSlugs->count(),
                'links' => count($seenPairs),
                'isolated' => $isolated,
            ],
        ]);
    }

    /**
     * @return array{0: string, 1: ?string}
     */
    private function portablePath(?string $sourcePath): array
    {
        if (! $sourcePath) {
            return ['other', null];
        }

        $parts = array_values(array_filter(explode('/', str_replace('\\', '/', $sourcePath))));

        if (count($parts) === 0) {
            return ['other', null];
        }

        $section = $parts[0];
        $folder = count($parts) > 2 ? $parts[1] : null;

        return [$section, $folder];
    }
}
