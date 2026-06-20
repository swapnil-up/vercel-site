<?php

use App\Http\Controllers\GraphDataController;
use App\Http\Controllers\NodeDataController;
use App\Http\Controllers\NowController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\QuoteController;
use App\Http\Controllers\FeedController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\RotaMinutesController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn() => inertia('Index', [
    'meta' => [
        'title' => 'Swapnil Upadhyay — Full-Stack Developer',
        'description' => 'Personal website and blog of Swapnil Upadhyay. Code, career, and curiosity — written in public.',
    ],
]));

Route::get('/about', fn() => inertia('About', [
    'meta' => [
        'title' => 'About — Swapnil Upadhyay',
        'description' => 'About Swapnil Upadhyay — full-stack developer, open source enthusiast, and learning in public advocate based in Kathmandu, Nepal.',
    ],
]));

Route::get('/now', fn() => inertia('Now', [
    'meta' => [
        'title' => 'Now — Swapnil Upadhyay',
        'description' => 'What Swapnil Upadhyay is currently focused on.',
    ],
]))->name('now');

Route::get('/tools', fn() => inertia('Tools/Index', [
    'meta' => [
        'title' => 'Tools — Swapnil Upadhyay',
        'description' => 'Interactive tools and experiments by Swapnil Upadhyay — virtual pet, clicker game, sketch tool, bill splitter, and more.',
    ],
]));

Route::get('/tools/clicker', fn() => inertia('Tools/Clicker', [
    'meta' => [
        'title' => 'Life Optimizer — Tools — Swapnil Upadhyay',
    ],
]));

Route::get('/tools/error-generator', fn() => inertia('Tools/ErrorGenerator', [
    'meta' => [
        'title' => 'SeriousCLI — Tools — Swapnil Upadhyay',
    ],
]));

Route::get('/tools/tamagotchi', fn() => inertia('Tools/Tamagotchi', [
    'meta' => [
        'title' => 'Blobby — Tools — Swapnil Upadhyay',
    ],
]));

Route::get('/tools/sketch', fn() => inertia('Tools/Sketch', [
    'meta' => [
        'title' => 'Sketch — Tools — Swapnil Upadhyay',
    ],
]));

Route::get('/tools/whisper', fn() => inertia('Tools/Whisper', [
    'meta' => [
        'title' => 'Whisper — Tools — Swapnil Upadhyay',
    ],
]))->name('whisper');

Route::get('/tools/bill-splitter', fn() => inertia('Tools/BillSplitter', [
    'meta' => [
        'title' => 'Bill Splitter — Tools — Swapnil Upadhyay',
    ],
]));

Route::get('/tools/rota-minutes', [RotaMinutesController::class, 'create'])->name('rota-minutes');
Route::post('/tools/rota-minutes/generate-form', [RotaMinutesController::class, 'generateFromForm']);

Route::get('/tools/rota-minutes-standalone', function () {
    $defaultsPath = resource_path('rota/assets/rota-defaults.json');
    $defaults = file_exists($defaultsPath) ? json_decode(file_get_contents($defaultsPath), true) ?? [] : [];
    return inertia('Tools/RotaMinutesStandalone', [
        'meta' => [
            'title' => 'Rota Minutes (Standalone) — Tools — Swapnil Upadhyay',
            'description' => 'Generate meeting minutes PDFs entirely in your browser — no server-side processing.',
        ],
        'config' => config('rota'),
        'defaults' => $defaults,
    ]);
});

Route::get('/tools/rantim', fn() => inertia('Tools/RanTim', [
    'meta' => [
        'title' => 'RanTim — Tools — Swapnil Upadhyay',
    ],
]));

Route::get('/tracker', fn() => inertia('Tracker', [
    'meta' => [
        'title' => 'Tracker — Swapnil Upadhyay',
        'description' => 'Personal achievement tracker — books read, articles written, and more.',
    ],
]))->name('tracker');

Route::get('/timer', fn() => inertia('Tools/EmomTimer', [
    'meta' => [
        'title' => 'EMOM Timer — Tools — Swapnil Upadhyay',
    ],
]))->name('timer.emom');

Route::get('/graph', fn() => inertia('Graph', [
    'meta' => [
        'title' => 'Knowledge Graph — Swapnil Upadhyay',
        'description' => 'Interactive knowledge graph visualization of articles, thoughts, and connections.',
    ],
]));

Route::get('/posts', [PostController::class, 'index'])->name('posts.index');
Route::get('/posts/tag/{tag}', [PostController::class, 'byTag'])->name('posts.by-tag');
Route::get('/posts/{slug}', [PostController::class, 'show'])->name('posts.show');

Route::get('/data/quote/random', [QuoteController::class, 'random']);
Route::get('/data/now', [NowController::class, 'show']);
Route::get('/data/graph', [GraphDataController::class, 'index']);
Route::get('/data/node/{type}/{slug}', [NodeDataController::class, 'show']);

Route::get('/feed', [FeedController::class, 'index']);
Route::get('/sitemap.xml', [SitemapController::class, 'index']);
