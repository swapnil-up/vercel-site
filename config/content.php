<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Article Sources
    |--------------------------------------------------------------------------
    |
    | Every markdown directory that contributes posts to the site. Paths are
    | resolved relative to the project root so they stay identical across
    | devices that keep the repositories as siblings.
    |
    | prefix        Portable source key stored in posts.source_path.
    | tag           Tag added to every post from this source.
    | require_publish  Only import files whose frontmatter has publish: true.
    | exclude       File or directory names to skip (recursively).
    |
    */

    'sources' => [

        'til' => [
            'path' => base_path('../coding-problems/learning-notes/TIL'),
            'prefix' => 'til',
            'tag' => 'TIL',
            'exclude' => [],
        ],

        'published' => [
            'path' => base_path('../obsidian-vault/published'),
            'prefix' => 'published',
            'tag' => 'articles',
            'exclude' => [],
        ],

        'notes' => [
            'path' => base_path('../obsidian-vault/coding notes'),
            'prefix' => 'notes',
            'tag' => 'notes',
            'require_publish' => true,
            'exclude' => [
                'TIL',
                'AGENTS.md',
                'learning-guide.md',
                'prompt-claude-quick-cards.md',
            ],
        ],

    ],

];
