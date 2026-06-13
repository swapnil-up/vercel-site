<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class PostController extends Controller
{
    public function index()
    {
        $posts = Post::where('is_draft', false)
            ->orderBy('published_date', 'desc')
            ->get()
            ->map(fn($post) => [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
                'description' => $post->description,
                'published_date' => $post->published_date->format('M d, Y'),
                'tags' => $post->tags,
            ]);
        
        return Inertia::render('Posts/Index', [
            'posts' => $posts,
            'meta' => [
                'title' => 'Articles — Swapnil Upadhyay',
                'description' => 'Technical articles and essays by Swapnil Upadhyay about development, career, and productivity.',
            ],
        ]);
    }

    public function show($slug)
    {
        $post = Post::where('slug', $slug)
            ->where('is_draft', false)
            ->firstOrFail();
        
        // Get linked posts
        $linkedPosts = [];
        if ($post->internal_links) {
            $linkedPosts = Post::whereIn('slug', array_map(fn($title) => Str::slug($title), $post->internal_links))
                ->where('is_draft', false)
                ->get(['title', 'slug', 'description'])
                ->toArray();
        }
        
        // Get series posts if in a series
        $seriesPosts = null;
        if ($post->series) {
            $seriesPosts = Post::where('series', $post->series)
                ->where('is_draft', false)
                ->orderBy('series_order')
                ->get(['title', 'slug', 'series_order'])
                ->toArray();
        }
        
        $postUrl = route('posts.show', $post->slug);

        return Inertia::render('Posts/Show', [
            'post' => [
                'title' => $post->title,
                'content_html' => $post->content_html,
                'description' => $post->description,
                'published_date' => $post->published_date->format('M d, Y'),
                'updated_at' => $post->content_updated_at?->format('M d, Y'),
                'tags' => $post->tags,
                'series' => $post->series,
                'series_order' => $post->series_order,
            ],
            'linkedPosts' => $linkedPosts,
            'seriesPosts' => $seriesPosts,
            'meta' => [
                'title' => $post->title . ' — Swapnil Upadhyay',
                'description' => $post->description ?? 'Article by Swapnil Upadhyay',
                'url' => $postUrl,
            ],
            'ldjson' => [
                '@context' => 'https://schema.org',
                '@graph' => [
                    [
                        '@type' => 'Article',
                        'headline' => $post->title,
                        'description' => $post->description,
                        'author' => [
                            '@type' => 'Person',
                            'name' => 'Swapnil Upadhyay',
                            'url' => url('/'),
                        ],
                        'datePublished' => $post->published_date->toIso8601String(),
                        'dateModified' => $post->content_updated_at?->toIso8601String() ?? $post->published_date->toIso8601String(),
                        'mainEntityOfPage' => [
                            '@type' => 'WebPage',
                            '@id' => $postUrl,
                        ],
                    ],
                    [
                        '@type' => 'BreadcrumbList',
                        'itemListElement' => [
                            [
                                '@type' => 'ListItem',
                                'position' => 1,
                                'name' => 'Home',
                                'item' => url('/'),
                            ],
                            [
                                '@type' => 'ListItem',
                                'position' => 2,
                                'name' => 'Articles',
                                'item' => route('posts.index'),
                            ],
                            [
                                '@type' => 'ListItem',
                                'position' => 3,
                                'name' => $post->title,
                                'item' => $postUrl,
                            ],
                        ],
                    ],
                ],
            ],
        ]);
    }

    public function byTag($tag)
    {
        $tag = (string) $tag; // sqlite gotcha?
        $posts = Post::where('is_draft', false)
            ->where('tags', 'LIKE', '%"' . $tag . '"%')
            ->orderBy('published_date', 'desc')
            ->get()
            ->map(fn ($post) => [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
                'description' => $post->description,
                'published_date' => $post->published_date->format('M d, Y'),
                'tags' => $post->tags,
            ]);
        
        return Inertia::render('Posts/Index', [
            'posts' => $posts,
            'selectedTag' => $tag,
            'meta' => [
                'title' => ucfirst($tag) . ' articles — Swapnil Upadhyay',
                'description' => 'Articles tagged with "' . $tag . '" by Swapnil Upadhyay.',
            ],
        ]);
    }
}