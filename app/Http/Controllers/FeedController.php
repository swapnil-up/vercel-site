<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Response;

class FeedController extends Controller
{
    public function index(): Response
    {
        $posts = Post::where('is_draft', false)
            ->orderBy('published_date', 'desc')
            ->limit(20)
            ->get();

        $feed = '<?xml version="1.0" encoding="UTF-8"?>';
        $feed .= '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">';
        $feed .= '<channel>';
        $feed .= '<title>Swapnil Upadhyay — Articles</title>';
        $feed .= '<link>' . url('/') . '</link>';
        $feed .= '<description>Code, career, and curiosity — written in public.</description>';
        $feed .= '<language>en</language>';
        $feed .= '<lastBuildDate>' . now()->format('r') . '</lastBuildDate>';
        $feed .= '<atom:link href="' . url('/feed') . '" rel="self" type="application/rss+xml"/>';

        foreach ($posts as $post) {
            $feed .= '<item>';
            $feed .= '<title>' . htmlspecialchars($post->title) . '</title>';
            $feed .= '<link>' . route('posts.show', $post->slug) . '</link>';
            $feed .= '<guid isPermaLink="true">' . route('posts.show', $post->slug) . '</guid>';
            $feed .= '<pubDate>' . $post->published_date->format('r') . '</pubDate>';
            if ($post->description) {
                $feed .= '<description>' . htmlspecialchars($post->description) . '</description>';
            }
            if ($post->content_html) {
                $feed .= '<content:encoded><![CDATA[' . $post->content_html . ']]></content:encoded>';
            }
            $feed .= '</item>';
        }

        $feed .= '</channel>';
        $feed .= '</rss>';

        return response($feed, 200)
            ->header('Content-Type', 'application/rss+xml');
    }
}
