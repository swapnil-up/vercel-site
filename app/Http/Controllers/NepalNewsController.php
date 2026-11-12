<?php

namespace App\Http\Controllers;

use App\Services\NepalNewsFeed;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class NepalNewsController extends Controller
{
    public function index(Request $request, NepalNewsFeed $feed): Response
    {
        $articles = $feed->articles();

        // Apply filters
        if ($request->filled('category')) {
            $articles = collect($articles)->where('category', $request->input('category'))->values()->all();
        }

        if ($request->filled('source')) {
            $articles = collect($articles)->where('source', $request->input('source'))->values()->all();
        }

        if ($request->filled('sentiment')) {
            $articles = collect($articles)->where('sentiment', $request->input('sentiment'))->values()->all();
        }

        if ($request->filled('days')) {
            $since = now()->subDays((int) $request->input('days'));
            $articles = collect($articles)->filter(function ($a) use ($since) {
                return isset($a['published_at']) && Carbon::parse($a['published_at'])->gte($since);
            })->values()->all();
        }

        // Sort by published_at desc
        usort($articles, fn ($a, $b) => ($b['published_at'] ?? '') <=> ($a['published_at'] ?? ''));

        // Paginate
        $page = (int) $request->input('page', 1);
        $perPage = 30;
        $total = count($articles);
        $paginated = array_slice($articles, ($page - 1) * $perPage, $perPage);

        $categories = collect($articles)->pluck('category')->filter()->unique()->values()->all();
        $sources = collect($articles)->pluck('source')->filter()->unique()->values()->all();

        return Inertia::render('NepalNews/Index', [
            'articles' => [
                'data' => $paginated,
                'current_page' => $page,
                'last_page' => (int) ceil($total / $perPage),
                'total' => $total,
            ],
            'categories' => $categories,
            'sources' => $sources,
            'filters' => $request->only(['category', 'source', 'sentiment', 'days']),
            'meta' => [
                'title' => 'Nepal News — Swapnil Upadhyay',
                'description' => 'A weekly, sentiment-tagged reading list of news from Nepal.',
                'url' => route('nepal-news.index'),
            ],
        ]);
    }

    public function show(string $slug, NepalNewsFeed $feed): Response
    {
        $article = $feed->article($slug);

        if (! $article) {
            abort(404);
        }

        return Inertia::render('NepalNews/Show', [
            'article' => $article,
            'meta' => [
                'title' => ($article['title'] ?? 'Nepal News').' — Nepal News — Swapnil Upadhyay',
                'description' => Str::limit(
                    trim(preg_replace('/\s+/', ' ', strip_tags($article['summary'] ?? $article['body'] ?? '')) ?? ''),
                    160
                ) ?: 'A Nepal News article on Swapnil Upadhyay\'s site.',
                'url' => route('nepal-news.show', $slug),
            ],
        ]);
    }

    public function api(Request $request, NepalNewsFeed $feed): JsonResponse
    {
        $articles = $feed->articles();

        if ($request->filled('category')) {
            $articles = collect($articles)->where('category', $request->input('category'))->values()->all();
        }

        if ($request->filled('source')) {
            $articles = collect($articles)->where('source', $request->input('source'))->values()->all();
        }

        if ($request->filled('from')) {
            $from = $request->input('from');
            $articles = collect($articles)->filter(fn ($a) => ($a['published_at'] ?? '') >= $from)->values()->all();
        }

        $limit = min((int) $request->input('limit', 50), 100);
        $articles = array_slice($articles, 0, $limit);

        return response()->json([
            'count' => count($articles),
            'articles' => $articles,
        ]);
    }
}
