<?php

use Illuminate\Support\Facades\Route;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Http;

Route::get('/ping', function () {
    return response()->json(['message' => 'pong']);
});

Route::get('/', function () {
    return inertia('Index');
});

Route::get('/articles/{slug}', function ($slug) {

    $client = new Client();
    $response = $client->get('https://raw.githubusercontent.com/swapnil-up/vercel-site/main/articles/' . $slug . '.md');
    $content = $response->getBody()->getContents();


    $parsedown = new Parsedown();
    $htmlContent = $parsedown->text($content);

    return inertia('Article', [
        'slug' => $slug,
        'content' => $htmlContent
    ]);
});

Route::get('/linked-article/{slug}', function ($slug) {
    // Fetch article content from GitHub
    $client = new Client();
    $response = $client->get('https://raw.githubusercontent.com/swapnil-up/vercel-site/main/articles/' . $slug . '.md');
    $content = $response->getBody()->getContents();

    // Parse Markdown to HTML
    $parsedown = new Parsedown();
    $htmlContent = $parsedown->text($content);

    // Return content as JSON
    return response()->json([
        'slug' => $slug,
        'content' => $htmlContent,
    ]);
});



Route::get('/articles/{slug}/preview', function ($slug) {
    $url = "https://raw.githubusercontent.com/swapnil-up/vercel-site/main/articles/{$slug}.md";

    $response = Http::get($url);

    if ($response->failed()) {
        return response()->json(['error' => 'Article not found.'], 404);
    }

    $content = $response->body();

    $parsedown = new Parsedown();
    $htmlContent = $parsedown->text($content);

    $preview = substr(strip_tags($htmlContent), 0, 200) . '...';

    return response()->json(['preview' => $preview]);
});



Route::get('/articles', function () {
    $githubApiUrl = 'https://api.github.com/repos/swapnil-up/vercel-site/contents/articles';

    $response = Http::get($githubApiUrl);
    if ($response->failed()) {
        return inertia('Articles', ['articles' => []]);
    }

    $files = $response->json();

    $articles = collect($files)
        ->filter(fn($file) => isset($file['name']) && str_ends_with($file['name'], '.md'))
        ->map(fn($file) => pathinfo($file['name'], PATHINFO_FILENAME));

    return inertia('Articles', [
        'articles' => $articles,
    ]);
});

Route::get('/about', function () {
    return inertia('About');
});

Route::get('/now', function(){
    return inertia('Now');
});