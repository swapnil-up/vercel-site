<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;
use GuzzleHttp\Client;

Route::get('/ping', function () {
    return response()->json(['message' => 'pong']);
});

Route::get('/', function () {
    return inertia('Index/Index');
});

Route::get('/articles/{slug}', function ($slug) {

    $client = new Client();
    $response = $client->get('https://raw.githubusercontent.com/vercel-site/main/articles/' . $slug . '.md');
    $content = $response->getBody()->getContents();


    $parsedown = new Parsedown();
    $htmlContent = $parsedown->text($content);

    return inertia('Article', [
        'content' => $htmlContent
    ]);
});