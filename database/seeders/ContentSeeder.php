<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Symfony\Component\Yaml\Yaml;
use Illuminate\Support\Facades\DB;

class ContentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define local paths
        $articlesDir = base_path('articles');
        $graphDir = base_path('graph');
        $thoughtsFile = $graphDir . '/thoughts.json';

        // --- PART 1: Lookup Tables ---
        echo "Building a list of all valid IDs and a title-to-ID lookup...\n";
        $idToIdLookup = [];
        $titleToIdLookup = [];

        // Add articles to lookup tables
        $articleFiles = File::glob($articlesDir . '/*.md');
        foreach ($articleFiles as $file) {
            $slug = pathinfo($file, PATHINFO_FILENAME);
            $parsed = $this->parseMarkdownContent(File::get($file));
            
            $idToIdLookup[$slug] = $slug;
            if (isset($parsed['frontmatter']['title']) && !empty($parsed['frontmatter']['title'])) {
                $titleToIdLookup[$parsed['frontmatter']['title']] = $slug;
            }
        }

        // Add thoughts to lookup tables
        if (File::exists($thoughtsFile)) {
            $thoughtsData = json_decode(File::get($thoughtsFile), true);
            foreach ($thoughtsData as $thought) {
                $idToIdLookup[$thought['id']] = $thought['id'];
                if (isset($thought['title']) && !empty($thought['title'])) {
                    $titleToIdLookup[$thought['title']] = $thought['id'];
                }
            }
        }

        // --- PART 2: Truncate then insert data ---
        \DB::table('articles')->truncate();
        \DB::table('thoughts')->truncate();
        \DB::table('connections')->truncate();
        $connections = [];

        // Insert Articles
        echo "Processing and inserting articles...\n";
        if (!empty($articleFiles)) {
            foreach ($articleFiles as $file) {
                $content = File::get($file);
                $slug = pathinfo($file, PATHINFO_FILENAME);
                $parsed = $this->parseMarkdownContent($content);

                \DB::table('articles')->insert([
                    'slug' => $slug,
                    'title' => $parsed['frontmatter']['title'] ?? '',
                    'content' => $parsed['body'],
                    'frontmatter' => json_encode($parsed['frontmatter']),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                
                // Add connections from article links
                if (isset($parsed['frontmatter']['links']) && is_array($parsed['frontmatter']['links'])) {
                    foreach ($parsed['frontmatter']['links'] as $linkedId) {
                        $connections[] = [
                            'from_id' => $slug,
                            'to_id' => $linkedId,
                            'type' => 'references',
                            'weight' => 1.0,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }
            }
        }

        // Insert Thoughts
        echo "Processing and inserting thoughts...\n";
        if (File::exists($thoughtsFile)) {
            foreach ($thoughtsData as $thought) {
                \DB::table('thoughts')->insert([
                    'id' => $thought['id'],
                    'title' => $thought['title'] ?? null,
                    'content' => $thought['content'],
                    'type' => $thought['type'] ?? null,
                    'tags' => json_encode($thought['tags'] ?? []),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Find and add connections from wiki-links in thought content
                if (isset($thought['content'])) {
                    preg_match_all('/\[\[(.*?)\]\]/', $thought['content'], $matches);
                    if (isset($matches[1])) {
                        foreach ($matches[1] as $link) {
                            $resolvedId = $idToIdLookup[$link] ?? null;
                            if (!$resolvedId) {
                                $resolvedId = $titleToIdLookup[$link] ?? null;
                            }
                            
                            if ($resolvedId) {
                                $connections[] = [
                                    'from_id' => $thought['id'],
                                    'to_id' => $resolvedId,
                                    'type' => 'mentions',
                                    'weight' => 0.5,
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ];
                            } else {
                                echo "Warning: Link '{$link}' in thought '{$thought['id']}' could not be resolved. Skipping.\n";
                            }
                        }
                    }
                }
            }
        }
        
        // --- PART 3: Insert Connections ---
        if (!empty($connections)) {
            \DB::table('connections')->insert($connections);
            echo "Successfully seeded connections.\n";
        } else {
            echo "No connections to seed.\n";
        }
    }

    private function parseMarkdownContent($content)
    {
        $frontmatter = [];
        $body = $content;
        if (preg_match('/^---\s*([\s\S]+?)\s*---\s*(.*)/s', $content, $matches)) {
            $yaml = trim($matches[1]);
            $body = trim($matches[2]);
            try {
                $frontmatter = Yaml::parse($yaml);
            } catch (\Exception $e) {
                // Fuck
            }
        }
        return ['frontmatter' => $frontmatter, 'body' => $body];
    }
}