<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Post;
use App\Models\Thought;
use App\Services\NepalNewsFeed;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;

class SitemapController extends Controller
{
    public function index(NepalNewsFeed $feed): Response
    {
        $posts = Post::where('is_draft', false)
            ->orderBy('updated_at', 'desc')
            ->get();

        $thoughts = Thought::orderBy('updated_at', 'desc')
            ->get();

        $books = Book::where('is_draft', false)
            ->where('hidden', false)
            ->orderBy('updated_at', 'desc')
            ->get();

        $news = collect($feed->articles())
            ->filter(fn (array $article) => ! empty($article['slug']))
            ->sortByDesc(fn (array $article) => $article['published_at'] ?? '')
            ->values();

        $sitemap = '<?xml version="1.0" encoding="UTF-8"?>';
        $sitemap .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

        // Homepage
        $sitemap .= $this->buildUrlEntry(
            url('/'),
            now(),
            'daily',
            '1.0'
        );

        // Posts Index
        $sitemap .= $this->buildUrlEntry(
            route('posts.index'),
            $posts->first()?->updated_at ?? now(),
            'daily',
            '0.9'
        );

        // Individual Posts
        foreach ($posts as $post) {
            $sitemap .= $this->buildUrlEntry(
                route('posts.show', $post->slug),
                $post->updated_at,
                'monthly',
                '0.8'
            );
        }

        // Books
        $sitemap .= $this->buildUrlEntry(
            route('books.index'),
            $books->first()?->updated_at ?? now(),
            'monthly',
            '0.7'
        );

        foreach ($books as $book) {
            $sitemap .= $this->buildUrlEntry(
                route('books.show', $book->slug),
                $book->updated_at,
                'yearly',
                '0.6'
            );
        }

        // Nepal News
        $sitemap .= $this->buildUrlEntry(
            route('nepal-news.index'),
            $this->newsLastmod($news->first()),
            'daily',
            '0.8'
        );

        foreach ($news as $article) {
            $sitemap .= $this->buildUrlEntry(
                route('nepal-news.show', $article['slug']),
                $this->newsLastmod($article),
                'monthly',
                '0.6'
            );
        }

        // About
        $sitemap .= $this->buildUrlEntry(
            url('/about'),
            now(),
            'monthly',
            '0.5'
        );

        // Tools
        $sitemap .= $this->buildUrlEntry(
            url('/tools'),
            now(),
            'monthly',
            '0.5'
        );

        // Tracker
        $sitemap .= $this->buildUrlEntry(
            route('tracker'),
            now(),
            'weekly',
            '0.4'
        );

        // Graph/Thoughts
        $sitemap .= $this->buildUrlEntry(
            url('/graph'),
            $thoughts->first()?->updated_at ?? now(),
            'weekly',
            '0.7'
        );

        $sitemap .= $this->buildUrlEntry(
            route('now'),
            now(),
            'monthly',
            '0.6'
        );

        $sitemap .= '</urlset>';

        return response($sitemap, 200)
            ->header('Content-Type', 'application/xml');
    }

    private function newsLastmod(?array $article): Carbon
    {
        if (! empty($article['published_at'])) {
            try {
                return Carbon::parse($article['published_at']);
            } catch (\Throwable $e) {
                // Fall through to now for malformed dates.
            }
        }

        return now();
    }

    private function buildUrlEntry(
        string $url,
        $lastmod,
        string $changefreq,
        string $priority
    ): string {
        $entry = '<url>';
        $entry .= '<loc>'.htmlspecialchars($url).'</loc>';
        $entry .= '<lastmod>'.$lastmod->format('Y-m-d').'</lastmod>';
        $entry .= '<changefreq>'.$changefreq.'</changefreq>';
        $entry .= '<priority>'.$priority.'</priority>';
        $entry .= '</url>';

        return $entry;
    }
}
