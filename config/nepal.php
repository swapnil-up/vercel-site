<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Groq
    |--------------------------------------------------------------------------
    |
    | The model id lives here rather than in the command so that retiring a
    | model is an environment change, not a code change. nepal:process probes
    | the models endpoint before spending any tokens and aborts if the id is
    | not available to the key.
    |
    */

    'groq' => [
        'key' => env('GROQ_API_KEY'),
        'model' => env('GROQ_MODEL', 'llama-3.3-70b-versatile'),
        'endpoint' => 'https://api.groq.com/openai/v1/chat/completions',
        'models_endpoint' => 'https://api.groq.com/openai/v1/models',
        'throttle_seconds' => (int) env('NEPAL_NEWS_THROTTLE', 2),
    ],

    /*
    |--------------------------------------------------------------------------
    | Data repository
    |--------------------------------------------------------------------------
    |
    | Processed articles are published here as one markdown file per article
    | plus a rolling index.json that the site reads.
    |
    */

    'data_repo' => [
        'owner' => env('NEPAL_NEWS_REPO_OWNER', 'swapnil-up'),
        'repo' => env('NEPAL_NEWS_REPO', 'nepal-news-data'),
        'branch' => env('NEPAL_NEWS_BRANCH', 'main'),
        'token' => env('GITHUB_TOKEN'),
    ],

    'publish' => [
        // How many articles index.json keeps. The site paginates at 30/page.
        'index_cap' => (int) env('NEPAL_NEWS_INDEX_CAP', 300),
    ],

    'selection' => [
        // Titles whose tokens overlap this much are treated as the same story.
        'dedupe_threshold' => (float) env('NEPAL_NEWS_DEDUPE_THRESHOLD', 0.6),
        // Dropped before any tokens are spent. Keep this conservative.
        'exclude_patterns' => [
            '/\bhoroscopes?\b/i',
            '/\bphotos? of the day\b/i',
        ],
    ],

];
