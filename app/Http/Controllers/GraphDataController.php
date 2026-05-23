<?php

namespace App\Http\Controllers;

use App\Models\Connection;
use App\Models\Post;
use App\Models\Thought;

class GraphDataController extends Controller
{
    public function index()
    {
        $posts = Post::all(['slug', 'title', 'content', 'tags', 'source_path']);
        $thoughts = Thought::all(['id', 'title', 'type', 'content']);
        $connections = Connection::all(['from_id', 'to_id', 'type', 'weight']);

        $nodes = [];

        foreach ($posts as $post) {
            $folders = [];
            if ($post->source_path) {
                $parts = array_values(array_filter(explode(DIRECTORY_SEPARATOR, dirname($post->source_path))));
                $skip = ['home', 'swap', 'github', 'obsidian-vault', '.', ''];
                $filtered = array_values(array_filter($parts, fn($p) => !in_array($p, $skip)));
                $count = count($filtered);
                if ($count >= 2) {
                    $folders = [$filtered[$count - 2], $filtered[$count - 1]];
                } elseif ($count === 1) {
                    $folders = [$filtered[0]];
                }
            }

            $nodes[] = [
                'id' => $post->slug,
                'title' => $post->title,
                'type' => 'article',
                'size' => 10,
                'url' => '/data/node/article/'.$post->slug,
                'tags' => $post->tags ?? [],
                'folders' => $folders,
                'source_path' => $post->source_path,
            ];
        }

        foreach ($thoughts as $thought) {
            if (Post::where('slug', $thought->id)->exists()) {
                continue;
            }

            $nodes[] = [
                'id' => $thought->id,
                'title' => $thought->title ?: '• • •',
                'type' => 'thought',
                'size' => 5,
                'content' => $thought->content,
                'url' => '/data/node/thought/'.$thought->id,
            ];
        }

        $links = $connections->map(function ($conn) {
            return [
                'source' => $conn->from_id,
                'target' => $conn->to_id,
                'type' => $conn->type,
                'weight' => $conn->weight,
            ];
        });

        return response()->json([
            'nodes' => $nodes,
            'connections' => $links,
        ]);
    }
}
