<?php

namespace App\Services;

use App\Models\Connection;
use App\Models\Post;

class PostRelations
{
    /**
     * Incoming links split into map hubs and ordinary backlinks.
     *
     * @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>}
     */
    public function incoming(string $slug): array
    {
        $sources = Connection::where('to_id', $slug)
            ->where('type', 'mentions')
            ->pluck('from_id')
            ->unique()
            ->values();

        if ($sources->isEmpty()) {
            return [[], []];
        }

        $posts = Post::whereIn('slug', $sources)
            ->where('is_draft', false)
            ->get(['title', 'slug', 'description', 'tags']);

        $maps = $posts
            ->filter(fn (Post $post) => in_array('moc', $post->tags ?? [], true))
            ->map(fn (Post $post) => [
                'title' => $post->title,
                'slug' => $post->slug,
                'description' => $post->description,
            ])
            ->values()
            ->toArray();

        $backlinks = $posts
            ->reject(fn (Post $post) => in_array('moc', $post->tags ?? [], true))
            ->map(fn (Post $post) => [
                'title' => $post->title,
                'slug' => $post->slug,
                'description' => $post->description,
            ])
            ->values()
            ->toArray();

        return [$maps, $backlinks];
    }
}
