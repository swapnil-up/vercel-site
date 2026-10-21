<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Services\PostRelations;
use Inertia\Inertia;

class PostController extends Controller
{
    public function index()
    {
        $all = Post::where('is_draft', false)
            ->orderBy('published_date', 'desc')
            ->get();

        $maps = $all
            ->filter(fn (Post $post) => $this->isMap($post))
            ->map(fn (Post $post) => $this->card($post))
            ->values();

        $posts = $all
            ->reject(fn (Post $post) => $this->isMap($post))
            ->map(fn (Post $post) => $this->card($post))
            ->values();

        return Inertia::render('Posts/Index', [
            'posts' => $posts,
            'maps' => $maps,
            'meta' => [
                'title' => 'Writing — Swapnil Upadhyay',
                'description' => 'Technical articles, essays, and maps of content by Swapnil Upadhyay.',
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
            $linkedPosts = Post::whereIn('slug', $post->internal_links)
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
        
        [$maps, $backlinks] = app(PostRelations::class)->incoming($post->slug);

        $postUrl = route('posts.show', $post->slug);

        return Inertia::render('Posts/Show', [
            'post' => [
                'title' => $post->title,
                'slug' => $post->slug,
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
            'maps' => $maps,
            'backlinks' => $backlinks,
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
        $all = Post::where('is_draft', false)
            ->where('tags', 'LIKE', '%"' . $tag . '"%')
            ->orderBy('published_date', 'desc')
            ->get();

        $maps = $all
            ->filter(fn (Post $post) => $this->isMap($post))
            ->map(fn (Post $post) => $this->card($post))
            ->values();

        $posts = $all
            ->reject(fn (Post $post) => $this->isMap($post))
            ->map(fn (Post $post) => $this->card($post))
            ->values();

        return Inertia::render('Posts/Index', [
            'posts' => $posts,
            'maps' => $maps,
            'selectedTag' => $tag,
            'meta' => [
                'title' => ucfirst($tag) . ' articles — Swapnil Upadhyay',
                'description' => 'Articles tagged with "' . $tag . '" by Swapnil Upadhyay.',
            ],
        ]);
    }

    private function isMap(Post $post): bool
    {
        return in_array('moc', $post->tags ?? [], true);
    }

    /**
     * @return array<string, mixed>
     */
    private function card(Post $post): array
    {
        return [
            'id' => $post->id,
            'title' => $post->title,
            'slug' => $post->slug,
            'description' => $post->description,
            'published_date' => $post->published_date->format('M d, Y'),
            'tags' => $post->tags,
        ];
    }
}
