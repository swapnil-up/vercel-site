<?php

require_once 'vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;

$articlesDir = __DIR__ . '/../articles'; // Directory where the articles are stored
$outputFile = __DIR__ . '/../articles/metadata.json'; // Path for the metadata file

// Get all markdown files from the articles directory
$files = glob($articlesDir . '/*.md');

$metadata = [];

foreach ($files as $file) {
    $content = file_get_contents($file);

    // Extract frontmatter using regular expression
    if (preg_match('/^---\n(.*?)\n---/s', $content, $matches)) {
        // Print the extracted frontmatter for debugging purposes
        echo "Extracted frontmatter for file {$file}:\n" . $matches[1] . "\n\n";

        // Add '---' before passing to the parser to ensure it is in correct format
        $frontmatterContent = trim($matches[1]);
        

        echo "front matter is \n" . $frontmatterContent;
        try {
            // Parse YAML frontmatter using Symfony's Yaml parser
            $frontmatter = Yaml::parse($frontmatterContent);

            // Get frontmatter details
            $slug = basename($file, '.md');
            $title = $frontmatter['title'] ?? '';
            $date = $frontmatter['date'] ?? '';
            $categories = $frontmatter['categories'] ?? [];
            $tags = $frontmatter['tags'] ?? [];


            // $categories = cleanList($categories);
            // $tags = cleanList($tags);

            // Add this article's metadata to the array
            $metadata[] = [
                'slug' => $slug,
                'title' => $title,
                'date' => $date,
                'categories' => $categories,
                'tags' => $tags,
            ];

        } catch (Symfony\Component\Yaml\Exception\ParseException $e) {
            echo "YAML Parse Error: " . $e->getMessage() . "\n";
        }
    }
}

// function cleanList($list)
// {
//     if (!is_array($list)) {
//         $list = [$list];
//     }

//     if($list!=[]){
//         return array_map(function ($item) {
//             return rtrim($item, '---');
//         }, $list);
//     }
// }

// Sort articles by date (descending)
usort($metadata, function ($a, $b) {
    return strtotime($b['date']) - strtotime($a['date']);
});

// Write the metadata to the JSON file
file_put_contents($outputFile, json_encode($metadata, JSON_PRETTY_PRINT));

echo "Metadata generated successfully.\n";
