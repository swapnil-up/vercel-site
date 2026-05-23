<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Thought;
use League\CommonMark\CommonMarkConverter;

class NodeDataController extends Controller
{
    public function show(string $type, string $slug)
    {
        if ($type === 'article') {
            return $this->showArticle($slug);
        }

        if ($type === 'thought') {
            return $this->showThought($slug);
        }

        return response()->json(['error' => 'Unknown node type'], 404);
    }

    private function showArticle(string $slug)
    {
        $post = Post::where('slug', $slug)->first();

        if (! $post) {
            return response()->json(['error' => 'Article not found.'], 404);
        }

        $linkedPosts = [];
        if ($post->internal_links) {
            $linkedPosts = Post::whereIn('slug', $post->internal_links)
                ->where('is_draft', false)
                ->get(['title', 'slug', 'description'])
                ->toArray();
        }

        $seriesPosts = null;
        if ($post->series) {
            $seriesPosts = Post::where('series', $post->series)
                ->where('is_draft', false)
                ->orderBy('series_order')
                ->get(['title', 'slug', 'series_order'])
                ->toArray();
        }

        $contentHtml = $post->content_html;
        if (empty($contentHtml)) {
            $contentHtml = (new CommonMarkConverter)->convert($post->content)->getContent();
        }

        return response()->json([
            'id' => $post->slug,
            'type' => 'article',
            'title' => $post->title,
            'content_html' => $contentHtml,
            'description' => $post->description,
            'published_date' => $post->published_date->format('M d, Y'),
            'updated_at' => $post->content_updated_at?->format('M d, Y'),
            'tags' => $post->tags,
            'series' => $post->series,
            'series_order' => $post->series_order,
            'linkedPosts' => $linkedPosts,
            'seriesPosts' => $seriesPosts,
        ]);
    }

    private function showThought(string $slug)
    {
        $thought = Thought::find($slug);

        if (! $thought) {
            return response()->json(['error' => 'Thought not found.'], 404);
        }

        return response()->json([
            'id' => $thought->id,
            'type' => 'thought',
            'title' => $thought->title,
            'content' => $thought->content,
        ]);
    }
}
