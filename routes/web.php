<?php

use App\Http\Controllers\PostController;
use App\Models\Article;
use App\Models\Connection;
use App\Models\Post;
use App\Models\Thought;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return inertia('Index');
});

Route::get('/about', function () {
    return inertia('About');
});

Route::get('/tools', function () {
    return inertia('Tools/Index');
});

Route::get('/tools/clicker', function () {
    return inertia('Tools/Clicker');
});

Route::get('/tools/error-generator', function () {
    return inertia('Tools/ErrorGenerator');
});

Route::get('/tools/tamagotchi', function () {
    return inertia('Tools/Tamagotchi');
});

Route::get('/tools/sketch', function () {
    return inertia('Tools/Sketch');
});

Route::get('/tools/whisper', function () {
    return inertia('Tools/Whisper');
})->name('whisper');

Route::get('/tracker', function () {
    return inertia('Tracker');
})->name('tracker');

Route::get('/data/quote/random', function () {
    $randomQuote = App\Models\Quote::inRandomOrder()->first();

    return response()->json($randomQuote);
});

Route::get('/data/now', function () {
    $nowArticle = Article::find('now');
    if (! $nowArticle) {
        return response()->json(['content' => 'Now page not found.'], 404);
    }
    $parsedown = new Parsedown;
    $content = $parsedown->text($nowArticle->content);

    return response()->json([
        'content' => $content,
    ]);
});

Route::get('/graph', function () {
    return inertia('Graph');
});

Route::get('/posts', [PostController::class, 'index'])->name('posts.index');
Route::get('/posts/tag/{tag}', [PostController::class, 'byTag'])->name('posts.by-tag');
Route::get('/posts/{slug}', [PostController::class, 'show'])->name('posts.show');

Route::get('/timer', function () {
    return inertia('Tools/EmomTimer');
})->name('timer.emom');

Route::get('/data/graph', function () {
    $posts = Post::all(['slug', 'title', 'content', 'tags']);
    $thoughts = Thought::all(['id', 'title', 'type', 'content']);
    $connections = Connection::all(['from_id', 'to_id', 'type', 'weight']);

    $nodes = [];
    foreach ($posts as $post) {
        $nodes[] = [
            'id' => $post->slug,
            'title' => $post->title,
            'type' => 'article',
            'size' => 10,
            'url' => '/data/node/article/'.$post->slug,
        ];
    }
    foreach ($thoughts as $thought) {
        // Skip thoughts that are already represented as posts
        if (Post::where('slug', $thought->id)->exists()) {
            continue;
        }

        $nodes[] = [
            'id' => $thought->id,
            'title' => $thought->title ?: '• • •',
            'type' => 'thought',
            'size' => 5,
            'content' => $thought->content,
            'url' => '/data/node/thought/'.$thought->id,
        ];
    }

    $links = $connections->map(function ($conn) {
        return [
            'source' => $conn->from_id,
            'target' => $conn->to_id,
            'type' => $conn->type,
            'weight' => $conn->weight,
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
        if (! $article) {
            $post = Post::where('slug', $slug)->first();
            if ($post) {
                $parsedown = new Parsedown;

                // Get linked posts
                $linkedPosts = [];
                if ($post->internal_links) {
                    $linkedPosts = Post::whereIn('slug', $post->internal_links)
                        ->where('is_draft', false)
                        ->get(['title', 'slug', 'description'])
                        ->toArray();
                }

                // Get series posts if in a series
                $seriesPosts = null;
                if ($post->series) {
                    $seriesPosts = Post::where('series', $post->series)
                        ->where('is_draft', false)
                        ->orderBy('series_order')
                        ->get(['title', 'slug', 'series_order'])
                        ->toArray();
                }

                return response()->json([
                    'id' => $post->slug,
                    'type' => 'article',
                    'title' => $post->title,
                    'content' => $parsedown->text($post->content),
                    'content_html' => $post->content_html,
                    'description' => $post->description,
                    'published_date' => $post->published_date->format('M d, Y'),
                    'updated_at' => $post->content_updated_at?->format('M d, Y'),
                    'tags' => $post->tags,
                    'series' => $post->series,
                    'series_order' => $post->series_order,
                    'linkedPosts' => $linkedPosts,
                    'seriesPosts' => $seriesPosts,
                ]);
            }

            return response()->json(['error' => 'Article not found.'], 404);
        }
        $parsedown = new Parsedown;

        return response()->json([
            'id' => $article->slug,
            'type' => 'article',
            'title' => $article->title,
            'content' => $parsedown->text($article->content),
            'frontmatter' => $article->frontmatter,
        ]);
    } elseif ($type === 'thought') {
        $thought = Thought::find($slug);
        if (! $thought) {
            return response()->json(['error' => 'Thought not found.'], 404);
        }

        return response()->json([
            'id' => $thought->id,
            'type' => 'thought',
            'title' => $thought->title,
            'content' => $thought->content,
        ]);
    }

    return response()->json(['error' => 'Unknown node type'], 404);
});

Route::get('/tools/bill-splitter', function () {
    return inertia('Tools/BillSplitter');
});

Route::get('/tools/gotra-checker', function () {
    return inertia('Tools/GotraChecker');
});

Route::get('/tools/rantim', function () {
    return inertia('Tools/RanTim');
});
