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

    $frontmatter = [];

    $parsedown = new Parsedown();
    preg_match('/^---\s*([\s\S]+?)\s*---\s*(.*)/s', $content, $matches);


    if ($matches) {
        $yaml = $matches[1];
        $articleContent = $matches[2];
        $htmlContent = $parsedown->text($articleContent);

        $frontmatter = Yaml::parse($yaml);
    } else {
        $htmlContent = $parsedown->text($content);
    }

    return response()->json([
        'slug' => $slug,
        'frontmatter' => $frontmatter,
        'content' => $htmlContent
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

    return inertia('Articles', [
        'articles' => $metadata, 
    ]);
});

Route::get('/about', function () {
    return inertia('About');
});

Route::get('/now', function(){
    return inertia('Now');
});

Route::get('/api/graph', function () {
    if (app()->environment('local')) {
        $nodes = [];
        $connections = [];
        
        // Get thoughts
        if (file_exists(base_path('graph/thoughts.json'))) {
            $thoughts = json_decode(file_get_contents(base_path('graph/thoughts.json')), true);
            foreach ($thoughts as $thought) {
                $nodes[] = [
                    'id' => 'thought_' . $thought['id'], // Prefix for consistency
                    'title' => $thought['title'] ?: '• • •',
                    'type' => 'thought',
                    'size' => 5,
                    'content' => $thought['content'] ?? '',
                    'url' => '/thought/' . $thought['id']
                ];
            }
        }
        
        // Get articles from metadata
        if (file_exists(base_path('articles/metadata.json'))) {
            $articles = json_decode(file_get_contents(base_path('articles/metadata.json')), true);
            foreach ($articles as $article) {
                $nodes[] = [
                    'id' => $article['slug'],
                    'title' => $article['title'],
                    'type' => 'article',
                    'size' => 10,
                    'url' => '/articles/' . $article['slug']
                ];
            }
        }
        
        // Get connections
        if (file_exists(base_path('graph/connections.json'))) {
            $connections = json_decode(file_get_contents(base_path('graph/connections.json')), true);
        }
        
        return response()->json(['nodes' => $nodes, 'connections' => $connections]);
    }
    // For now, let's build this from your articles directory + a simple connections file
    $client = new Client();
    
    // Get all articles (nodes)
    $githubApiUrl = 'https://api.github.com/repos/swapnil-up/vercel-site/contents/articles/metadata.json';
    $response = Http::withHeaders(['Accept' => 'application/vnd.github.v3.raw'])->get($githubApiUrl);
    
    $nodes = [];
    $connections = [];
    
    if ($response->successful()) {
        $articles = json_decode($response->body(), true);
        
        foreach ($articles as $article) {
            $nodes[] = [
                'id' => $article['slug'],
                'title' => $article['title'],
                'type' => 'article',
                'size' => 10, // Base size
                'url' => '/articles/' . $article['slug']
            ];
        }
    }
    
    // Try to get connections file (we'll create this)
    try {
        $connectionsResponse = $client->get('https://raw.githubusercontent.com/swapnil-up/vercel-site/main/graph/connections.json');
        $connections = json_decode($connectionsResponse->getBody()->getContents(), true);
    } catch (Exception $e) {
        // No connections file yet, that's fine
    }
    
    // Try to get thoughts/micro-posts
    try {
        $thoughtsResponse = $client->get('https://raw.githubusercontent.com/swapnil-up/vercel-site/main/graph/thoughts.json');
        $thoughts = json_decode($thoughtsResponse->getBody()->getContents(), true);
        
        foreach ($thoughts as $thought) {
            $nodes[] = [
                'id' => 'thought_' . $thought['id'],
                'title' => $thought['title'] ?: '• • •', // Empty thoughts show as dots
                'type' => 'thought',
                'size' => 5,
                'content' => $thought['content'] ?? '',
                'url' => '/thought/' . $thought['id']
            ];
        }
    } catch (Exception $e) {
        // No thoughts yet
    }
    
    return response()->json([
        'nodes' => $nodes,
        'connections' => $connections
    ]);
});

// Individual thought endpoint
Route::get('/api/thought/{id}', function ($id) {
    $client = new Client();
    try {
        $thoughtsResponse = $client->get('https://raw.githubusercontent.com/swapnil-up/vercel-site/main/graph/thoughts.json');
        $thoughts = json_decode($thoughtsResponse->getBody()->getContents(), true);
        
        $thought = collect($thoughts)->firstWhere('id', $id);
        
        if (!$thought) {
            return response()->json(['error' => 'Thought not found'], 404);
        }
        
        return response()->json($thought);
    } catch (Exception $e) {
        return response()->json(['error' => 'Could not load thoughts'], 500);
    }
});

// Graph page route
Route::get('/graph', function () {
    return inertia('Graph');
});

// For your stacked link system - enhanced linked article
Route::get('/api/node/{type}/{slug}', function ($type, $slug) {
    if ($type === 'article') {
        // Use your existing linked-article logic
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
        } else {
            $htmlContent = $parsedown->text($content);
        }
        
        return response()->json([
            'id' => $slug,
            'type' => 'article',
            'title' => $frontmatter['title'] ?? $slug,
            'content' => $htmlContent,
            'frontmatter' => $frontmatter
        ]);
    } else if ($type === 'thought') {
        // Handle thoughts
        return redirect("/api/thought/{$slug}");
    }
    
    return response()->json(['error' => 'Unknown node type'], 404);
});