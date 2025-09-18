<?php

require_once 'vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;

// --- CONFIGURATION ---
$basePath = __DIR__ . '/..';
$articlesDir = $basePath . '/articles';
$graphDir = $basePath . '/graph';
$thoughtsFile = $graphDir . '/thoughts.json';
$outputFile = $graphDir . '/connections.json';

// --- DATA INITIALIZATION ---
$connections = [];
$nodes = [];

// --- UTILITY FUNCTION TO PARSE MARKDOWN ---
function parseMarkdownFile($filePath) {
    $content = file_get_contents($filePath);
    $frontmatter = [];
    $body = $content;

    if (preg_match('/^---\s*([\s\S]+?)\s*---\s*(.*)/s', $content, $matches)) {
        $yaml = trim($matches[1]);
        $body = trim($matches[2]);
        try {
            $frontmatter = Yaml::parse($yaml);
        } catch (Symfony\Component\Yaml\Exception\ParseException $e) {
            echo "YAML Parse Error in file {$filePath}: " . $e->getMessage() . "\n";
        }
    }

    return [
        'frontmatter' => $frontmatter,
        'body' => $body,
    ];
}

// --- 1. PROCESS ARTICLES ---
echo "Processing articles for links...\n";
$articleFiles = glob($articlesDir . '/*.md');

foreach ($articleFiles as $file) {
    $slug = basename($file, '.md');
    $parsed = parseMarkdownFile($file);
    $frontmatter = $parsed['frontmatter'];
    
    // Check for explicit links in frontmatter
    if (isset($frontmatter['links']) && is_array($frontmatter['links'])) {
        foreach ($frontmatter['links'] as $linkedSlug) {
            $connections[] = [
                'from' => $slug,
                'to' => $linkedSlug,
                'type' => 'references',
                'weight' => 1
            ];
        }
    }
}

// --- 2. PROCESS THOUGHTS ---
echo "Processing thoughts for links...\n";
if (file_exists($thoughtsFile)) {
    $thoughts = json_decode(file_get_contents($thoughtsFile), true);
    
    foreach ($thoughts as $thought) {
        // Look for [[wiki-links]] in thought content
        if (isset($thought['content'])) {
            preg_match_all('/\[\[(.*?)\]\]/', $thought['content'], $matches);
            
            if (isset($matches[1])) {
                foreach ($matches[1] as $linkedSlug) {
                    $connections[] = [
                        'from' => 'thought_' . $thought['id'], // Must match your API's node ID format
                        'to' => $linkedSlug,
                        'type' => 'mentions',
                        'weight' => 0.5 // A thought-link might be less significant
                    ];
                }
            }
        }
    }
}

// --- 3. WRITE THE CONNECTIONS FILE ---
file_put_contents($outputFile, json_encode($connections, JSON_PRETTY_PRINT));

echo "Connections JSON file generated successfully at {$outputFile}.\n";