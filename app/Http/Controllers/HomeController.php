<?php

namespace App\Http\Controllers;

use App\Models\Connection;
use App\Models\Post;
use App\Models\Quote;
use Illuminate\Support\Str;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function __invoke()
    {
        $latestPosts = Post::where('is_draft', false)
            ->orderByDesc('published_date')
            ->get(['title', 'slug', 'description', 'tags', 'published_date'])
            ->reject(fn (Post $post) => in_array('moc', $post->tags ?? [], true))
            ->take(3)
            ->map(fn (Post $post) => [
                'title' => $post->title,
                'slug' => $post->slug,
                'description' => $post->description,
                'published_date' => $post->published_date->format('M d, Y'),
                'tags' => $post->tags,
            ])
            ->values();

        $nowPost = Post::where('slug', 'now')->first();

        return Inertia::render('Index', [
            'latestPosts' => $latestPosts,
            'now' => $nowPost ? $this->plain($nowPost->content_html, 320) : null,
            'quote' => Quote::inRandomOrder()->first(['id', 'quote', 'author']),
            'graphStats' => [
                'notes' => Post::where('is_draft', false)->count(),
                'connections' => Connection::count(),
            ],
            'meta' => [
                'title' => 'Swapnil Upadhyay — Full-Stack Developer',
                'description' => 'Personal website and blog of Swapnil Upadhyay. Code, career, and curiosity — written in public.',
            ],
        ]);
    }

    /**
     * Plain-text excerpt of rendered HTML.
     */
    private function plain(?string $html, int $limit): string
    {
        $text = html_entity_decode(strip_tags($html ?? ''), ENT_QUOTES | ENT_HTML5);
        $text = trim(preg_replace('/\s+/u', ' ', $text));

        return Str::limit($text, $limit);
    }
}
