<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;

Route::get('/ping', function () {
    return response()->json(['message' => 'pong']);
});

Route::get('/', function () {
    return inertia('Index/Index');
});

Route::get('/articles/{slug}', function ($slug) {
    $filePath = storage_path("app/articles/{$slug}.md");

    if (File::exists($filePath)) {
        $content = File::get($filePath);

        $parsedown = new Parsedown();
        $htmlContent = $parsedown->text($content);

        return inertia('Article', [
            'content' => $htmlContent
        ]);
    } else {
        return inertia('Article', [
            'content' => 'Article not found.'
        ]);
    }
});