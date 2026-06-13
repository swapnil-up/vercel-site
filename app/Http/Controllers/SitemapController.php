<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Thought;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $posts = Post::where('is_draft', false)
            ->orderBy('updated_at', 'desc')
            ->get();

        $thoughts = Thought::orderBy('updated_at', 'desc')
            ->get();

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

    private function buildUrlEntry(
        string $url, 
        $lastmod, 
        string $changefreq, 
        string $priority
    ): string {
        $entry = '<url>';
        $entry .= '<loc>' . htmlspecialchars($url) . '</loc>';
        $entry .= '<lastmod>' . $lastmod->format('Y-m-d') . '</lastmod>';
        $entry .= '<changefreq>' . $changefreq . '</changefreq>';
        $entry .= '<priority>' . $priority . '</priority>';
        $entry .= '</url>';
        
        return $entry;
    }
}