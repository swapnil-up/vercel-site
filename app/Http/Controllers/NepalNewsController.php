<?php

namespace App\Http\Controllers;

use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NepalNewsController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Article::processed()
            ->orderBy('published_at', 'desc');

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('source')) {
            $query->where('source', $request->input('source'));
        }

        if ($request->filled('days')) {
            $query->where('published_at', '>=', now()->subDays((int) $request->input('days')));
        }

        $articles = $query->paginate(30)->withQueryString();

        $categories = Article::processed()
            ->select('category')
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category');

        $sources = Article::processed()
            ->select('source')
            ->distinct()
            ->pluck('source');

        return Inertia::render('NepalNews/Index', [
            'articles' => $articles,
            'categories' => $categories,
            'sources' => $sources,
            'filters' => $request->only(['category', 'source', 'days']),
        ]);
    }

    public function show(int $id): Response
    {
        $article = Article::findOrFail($id);

        return Inertia::render('NepalNews/Show', [
            'article' => $article,
        ]);
    }

    public function api(Request $request): JsonResponse
    {
        $query = Article::processed()
            ->orderBy('published_at', 'desc');

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('source')) {
            $query->where('source', $request->input('source'));
        }

        if ($request->filled('from')) {
            $query->where('published_at', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->where('published_at', '<=', $request->input('to'));
        }

        $limit = min((int) $request->input('limit', 50), 100);

        $articles = $query->limit($limit)->get([
            'id', 'source', 'title', 'summary', 'category',
            'sentiment', 'importance_score', 'published_at', 'source_url',
        ]);

        return response()->json([
            'count' => $articles->count(),
            'articles' => $articles,
        ]);
    }
}
