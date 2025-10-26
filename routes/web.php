<?php

use App\Models\Article;
use App\Models\Connection;
use App\Models\Thought;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return inertia('Index');
});

Route::get('/about', function () {
    return inertia('About');
});

Route::get('/now', function(){
    return inertia('Now');
});

Route::get('/data/quote/random', function () {
    $randomQuote = App\Models\Quote::inRandomOrder()->first();
    return response()->json($randomQuote);
});

Route::get('/data/now', function () {
    $nowArticle = Article::find('now');
    if (!$nowArticle) {
        return response()->json(['content' => 'Now page not found.'], 404);
    }
    $parsedown = new Parsedown();
    $content = $parsedown->text($nowArticle->content);
    return response()->json([
        'content' => $content
    ]);
});

Route::get('/graph', function () {
    return inertia('Graph');
});


Route::get('/data/graph', function () {
    $articles = Article::all(['slug', 'title', 'frontmatter']);
    $thoughts = Thought::all(['id', 'title', 'type', 'content']);
    $connections = Connection::all(['from_id', 'to_id', 'type', 'weight']);

    $nodes = [];
    foreach ($articles as $article) {
        $nodes[] = [
            'id' => $article->slug,
            'title' => $article->title,
            'type' => 'article',
            'size' => 10,
            'url' => '/data/node/article/' . $article->slug
        ];
    }
    foreach ($thoughts as $thought) {
        $nodes[] = [
            'id' => $thought->id,
            'title' => $thought->title ?: '• • •',
            'type' => 'thought',
            'size' => 5,
            'content' => $thought->content,
            'url' => '/data/node/thought/' . $thought->id
        ];
    }
    
    $links = $connections->map(function ($conn) {
        return [
            'source' => $conn->from_id,
            'target' => $conn->to_id,
            'type' => $conn->type,
            'weight' => $conn->weight
        ];
    });

    return response()->json([
        'nodes' => $nodes,
        'connections' => $links,
    ]);
});

Route::get('/data/node/{type}/{slug}', function ($type, $slug) {
    if ($type === 'article') {
        $article = Article::find($slug);
        if (!$article) {
            return response()->json(['error' => 'Article not found.'], 404);
        }
        $parsedown = new Parsedown();
        return response()->json([
            'id' => $article->slug,
            'type' => 'article',
            'title' => $article->title,
            'content' => $parsedown->text($article->content),
            'frontmatter' => $article->frontmatter
        ]);
    } else if ($type === 'thought') {
        $thought = Thought::find($slug);
        if (!$thought) {
            return response()->json(['error' => 'Thought not found.'], 404);
        }
        return response()->json([
            'id' => $thought->id,
            'type' => 'thought',
            'title' => $thought->title,
            'content' => $thought->content
        ]);
    }
    return response()->json(['error' => 'Unknown node type'], 404);
});

Route::get('/tools/bill-splitter', function(){
    return inertia('Tools/BillSplitter');
});

Route::get('/tools/gotra-checker', function(){
    return inertia('Tools/GotraChecker');
});

Route::get('/tools/rantim', function(){
    return inertia('Tools/RanTim');
});