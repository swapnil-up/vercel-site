<?php

use Illuminate\Support\Facades\Route;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Yaml\Yaml;

Route::get('/', function () {
    return inertia('Index');
});

Route::get('/about', function () {
    return inertia('About');
});

Route::get('/now', function(){
    return inertia('Now');
});

Route::get('/graph', function () {
    return inertia('Graph');
});


Route::get('/api/graph', function () {
    $client = new Client();
    
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
                'size' => 10, 
                'url' => '/articles/' . $article['slug']
            ];
        }
    }
    
    try {
        $connectionsResponse = $client->get('https://raw.githubusercontent.com/swapnil-up/vercel-site/main/graph/connections.json');
        $connections = json_decode($connectionsResponse->getBody()->getContents(), true);
    } catch (Exception $e) {
        // No connections file yet, that's fine
    }
    
    try {
        $thoughtsResponse = $client->get('https://raw.githubusercontent.com/swapnil-up/vercel-site/main/graph/thoughts.json');
        $thoughts = json_decode($thoughtsResponse->getBody()->getContents(), true);
        
        foreach ($thoughts as $thought) {
            $nodes[] = [
                'id' => 'thought_' . $thought['id'],
                'title' => $thought['title'] ?: '• • •', 
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

Route::get('/api/node/{type}/{slug}', function ($type, $slug) {
    if ($type === 'article') {
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
        return redirect("/api/thought/{$slug}");
    }
    
    return response()->json(['error' => 'Unknown node type'], 404);
});