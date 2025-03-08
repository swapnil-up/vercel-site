<?php

use Illuminate\Support\Facades\Route;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Yaml\Yaml;

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
    $frontmatter = [];

    $parsedown = new Parsedown();
    preg_match('/^---\s*([\s\S]+?)\s*---\s*(.*)/s', $content, $matches);
    

    if ($matches) {
        $yaml = $matches[1]; 
        $articleContent = $matches[2];
        $htmlContent = $parsedown->text($articleContent);

        $frontmatter = Yaml::parse($yaml);
    }else {
        $htmlContent = $parsedown->text($content);
    }

    // dd($frontmatter);
    
    return inertia('Article', [
        'slug' => $slug,
        'frontmatter' => $frontmatter,
        'content' => $htmlContent
    ]);
});

Route::get('/linked-article/{slug}', function ($slug) {

    $client = new Client();
    $response = $client->get('https://raw.githubusercontent.com/swapnil-up/vercel-site/main/articles/' . $slug . '.md');
    $content = $response->getBody()->getContents();

    $parsedown = new Parsedown();
    $htmlContent = $parsedown->text($content);

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
    $content = preg_replace('/^---[\s\S]+?---\s*/', '', $content);
    $htmlContent = $parsedown->text($content);

    $preview = substr(strip_tags($htmlContent), 0, 200) . '...';

    return response()->json(['preview' => $preview]);
});



Route::get('/articles', function () {
    $githubApiUrl = 'https://api.github.com/repos/swapnil-up/vercel-site/contents/articles/metadata.json';
    $response = Http::withHeaders([
        'Accept' => 'application/vnd.github.v3.raw' 
    ])->get($githubApiUrl);

    if ($response->failed()) {
        return inertia('Articles', ['articles' => []]); 
    }

    $metadata = json_decode($response->body(), true);

    usort($metadata, function ($a, $b) {
        return strtotime($b['date']) - strtotime($a['date']);
    });

    return inertia('ArticlesList', [
        'articles' => $metadata, 
    ]);
});

Route::get('/about', function () {
    return inertia('About');
});

Route::get('/now', function(){
    return inertia('Now');
});