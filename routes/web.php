<?php

use App\Http\Controllers\GraphDataController;
use App\Http\Controllers\NodeDataController;
use App\Http\Controllers\NowController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\QuoteController;
use App\Http\Controllers\SitemapController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn() => inertia('Index'));

Route::get('/about', fn() => inertia('About'));

Route::get('/now', fn() => inertia('Now'))->name('now');

Route::get('/tools', fn() => inertia('Tools/Index'));

Route::get('/tools/clicker', fn() => inertia('Tools/Clicker'));

Route::get('/tools/error-generator', fn() => inertia('Tools/ErrorGenerator'));

Route::get('/tools/tamagotchi', fn() => inertia('Tools/Tamagotchi'));

Route::get('/tools/sketch', fn() => inertia('Tools/Sketch'));

Route::get('/tools/whisper', fn() => inertia('Tools/Whisper'))->name('whisper');

Route::get('/tools/bill-splitter', fn() => inertia('Tools/BillSplitter'));

Route::get('/tools/rantim', fn() => inertia('Tools/RanTim'));

Route::get('/tracker', fn() => inertia('Tracker'))->name('tracker');

Route::get('/timer', fn() => inertia('Tools/EmomTimer'))->name('timer.emom');

Route::get('/graph', fn() => inertia('Graph'));

Route::get('/posts', [PostController::class, 'index'])->name('posts.index');
Route::get('/posts/tag/{tag}', [PostController::class, 'byTag'])->name('posts.by-tag');
Route::get('/posts/{slug}', [PostController::class, 'show'])->name('posts.show');

Route::get('/data/quote/random', [QuoteController::class, 'random']);
Route::get('/data/now', [NowController::class, 'show']);
Route::get('/data/graph', [GraphDataController::class, 'index']);
Route::get('/data/node/{type}/{slug}', [NodeDataController::class, 'show']);

Route::get('/sitemap.xml', [SitemapController::class, 'index']);
