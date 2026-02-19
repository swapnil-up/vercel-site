<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Thought;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $articles = Article::orderBy('updated_at', 'desc')
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

        // Articles Index
        $sitemap .= $this->buildUrlEntry(
            route('articles.index'),
            $articles->first()?->updated_at ?? now(),
            'daily',
            '0.9'
        );

        // Individual Articles
        foreach ($articles as $article) {
            $sitemap .= $this->buildUrlEntry(
                route('articles.show', $article->slug),
                $article->updated_at,
                'monthly',
                '0.8'
            );
        }

        // Graph/Thoughts
        $sitemap .= $this->buildUrlEntry(
            route('graph'),
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