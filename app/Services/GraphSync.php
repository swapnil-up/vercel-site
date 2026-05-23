<?php

namespace App\Services;

use App\Models\Connection;
use App\Models\Post;
use App\Models\Thought;

class GraphSync
{
    public function syncNode(Post $post): void
    {
        $existing = Thought::find($post->slug);

        if ($existing) {
            $existing->update([
                'title' => $post->title,
                'content' => $post->content,
                'tags' => $post->tags,
            ]);
        } else {
            Thought::create([
                'id' => $post->slug,
                'title' => $post->title,
                'content' => $post->content,
                'type' => 'article',
                'tags' => $post->tags,
            ]);
        }
    }

    public function syncConnections(Post $post): void
    {
        if (empty($post->internal_links)) {
            Connection::where('from_id', $post->slug)->delete();
            return;
        }

        $currentConnections = Connection::where('from_id', $post->slug)
            ->where('type', 'mentions')
            ->pluck('to_id')
            ->toArray();

        $newLinks = array_diff($post->internal_links, $currentConnections);
        foreach ($newLinks as $linkedSlug) {
            Connection::create([
                'from_id' => $post->slug,
                'to_id' => $linkedSlug,
                'type' => 'mentions',
                'weight' => 0.5,
            ]);
        }

        $staleLinks = array_diff($currentConnections, $post->internal_links);
        Connection::where('from_id', $post->slug)
            ->whereIn('to_id', $staleLinks)
            ->where('type', 'mentions')
            ->delete();
    }

    public function cleanupOrphanedConnections(): void
    {
        $validSlugs = Post::pluck('slug')->toArray();

        $orphans = Connection::whereNotIn('to_id', $validSlugs)->get();
        foreach ($orphans as $connection) {
            $connection->delete();
        }
    }

    public function removeNode(string $slug): void
    {
        Thought::find($slug)?->delete();
        Connection::where('from_id', $slug)->delete();
        Connection::where('to_id', $slug)->delete();
    }
}
