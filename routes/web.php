<?php

use App\Http\Controllers\BookController;
use App\Http\Controllers\GraphDataController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\NepalNewsController;
use App\Http\Controllers\NepalNewsSetupController;
use App\Http\Controllers\RotaMinutesController;
use App\Http\Controllers\NodeDataController;
use App\Http\Controllers\NowController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\QuoteController;
use App\Http\Controllers\FeedController;
use App\Http\Controllers\SitemapController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class);

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
        'description' => 'Interactive tools and experiments by Swapnil Upadhyay — virtual pet, clicker game, sketch tool, card viewer, bill splitter, and more.',
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

Route::get('/tools/cards', fn() => inertia('Tools/CardViewer', [
    'meta' => [
        'title' => 'Card Viewer — Tools — Swapnil Upadhyay',
        'description' => 'Open any Anki CSV deck and flip through its cards in your browser.',
    ],
]))->name('tools.cards');

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

Route::get('/tools/duty-roster', fn() => inertia('Tools/DutyRoster', [
    'meta' => [
        'title' => 'Duty Roster — Tools — Swapnil Upadhyay',
        'description' => 'Generate a fair weekly duty roster with unavailable days and export as a shareable image.',
    ],
]))->name('tools.duty-roster');

Route::get('/tools/vdc-municipality', fn() => inertia('Tools/VDC_Municipality', [
    'meta' => [
        'title' => 'VDC → Municipality Lookup — Tools — Swapnil Upadhyay',
        'description' => 'Convert old VDC/ward addresses to the new federal structure (2017 restructuring) with bilingual output.',
    ],
]))->name('tools.vdc-municipality');

Route::get('/tools/booklet-imposition', fn() => inertia('Tools/BookletImposition', [
    'meta' => [
        'title' => 'Booklet Imposition (2-up) — Tools — Swapnil Upadhyay',
        'description' => 'Upload a PDF and generate a print-ready 2-up booklet layout for saddle-stitch binding.',
    ],
]))->name('tools.booklet-imposition');

Route::get('/tools/nepse-wacc', fn() => inertia('Tools/NepseWacc', [
    'meta' => [
        'title' => 'NEPSE WACC Calculator — Tools — Swapnil Upadhyay',
        'description' => 'Calculate weighted average acquisition cost for NEPSE holdings with bonuses, rights, and fee breakdown.',
    ],
]))->name('tools.nepse-wacc');

Route::get('/tools/rota-minutes', RotaMinutesController::class)->name('rota-minutes');

Route::get('/tools/water-schedule', fn() => inertia('Tools/WaterSchedule', [
    'meta' => [
        'title' => 'Water Schedule — Tools — Swapnil Upadhyay',
        'description' => 'Look up when and where KUKL delivers water across Kathmandu branches.',
    ],
]));

Route::get('/tools/family-tree', fn() => inertia('Tools/FamilyTree', [
    'meta' => [
        'title' => 'Family Tree — Tools — Swapnil Upadhyay',
    ],
]));

Route::get('/tools/rantim', fn() => inertia('Tools/RanTim', [
    'meta' => [
        'title' => 'RanTim — Tools — Swapnil Upadhyay',
    ],
]));

Route::get('/tools/team-randomizer', fn() => inertia('Tools/TeamRandomizer', [
    'meta' => [
        'title' => 'Team Randomizer — Tools — Swapnil Upadhyay',
        'description' => 'Randomly assign participants from 3 clubs into 3 mixed teams (Himalaya, Indus, Siam) with equal representation. Perfect for cross-cultural quiz events.',
    ],
]))->name('tools.team-randomizer');

Route::get('/tools/particle-life', fn() => inertia('Tools/ParticleLife', [
    'meta' => [
        'title' => 'Particle Life — Tools — Swapnil Upadhyay',
    ],
]));

Route::get('/tools/space-explorer', fn() => inertia('Tools/SpaceExplorer', [
    'meta' => [
        'title' => 'Space Explorer — Tools — Swapnil Upadhyay',
    ],
]));

Route::get('/tools/infinite-corridor', fn() => inertia('Tools/InfiniteCorridor', [
    'meta' => [
        'title' => 'The Infinite Corridor — Tools — Swapnil Upadhyay',
    ],
]));

Route::get('/tools/anchor', fn() => inertia('Tools/Anchor', [
    'meta' => [
        'title' => 'Anchor — a calm minute for rough moments — Tools — Swapnil Upadhyay',
        'description' => 'SOS breathing + 5-4-3-2-1 grounding + rhythm garden. A supportive, research-informed calm tool.',
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

Route::get('/books', [BookController::class, 'index'])->name('books.index');
Route::get('/books/{slug}', [BookController::class, 'show'])->name('books.show');

Route::get('/data/quote/random', [QuoteController::class, 'random']);
Route::get('/data/now', [NowController::class, 'show']);
Route::get('/data/graph', [GraphDataController::class, 'index']);
Route::get('/data/node/{type}/{slug}', [NodeDataController::class, 'show']);

Route::get('/feed', [FeedController::class, 'index']);
Route::get('/sitemap.xml', [SitemapController::class, 'index']);

Route::get('/nepal-news', [NepalNewsController::class, 'index'])->name('nepal-news.index');
Route::get('/nepal-news/api', [NepalNewsController::class, 'api'])->name('nepal-news.api');
Route::get('/nepal-news/{slug}', [NepalNewsController::class, 'show'])->name('nepal-news.show');

// Kagaj RAG
Route::get('/kagaj', fn() => inertia('Kagaj/Index', [
    'meta' => [
        'title' => 'Kagaj Datasets — Swapnil Upadhyay',
        'description' => 'Open, structured data extracted from Nepali government PDFs. Parliament, water, crime, OAG audits, labour migration, and .gov.np infrastructure.',
    ],
]))->name('kagaj.index');

Route::get('/kagaj/{id}', fn($id) => inertia('Kagaj/Dataset', [
    'id' => $id,
    'meta' => [
        'title' => "$id — Kagaj Datasets — Swapnil Upadhyay",
        'description' => "Explore the $id dataset from Kagaj.",
    ],
]))->where('id', '.*')->name('kagaj.dataset');

Route::get('/kagaj/chat', fn() => inertia('Kagaj/Chat', [
    'meta' => [
        'title' => 'Kagaj Chat — Swapnil Upadhyay',
        'description' => 'Ask questions across Nepali government datasets.',
    ],
]))->name('kagaj.chat');
