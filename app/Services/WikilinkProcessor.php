<?php

namespace App\Services;

use Illuminate\Support\Str;
use League\CommonMark\CommonMarkConverter;

class WikilinkProcessor
{
    private CommonMarkConverter $converter;

    public function __construct()
    {
        $this->converter = new CommonMarkConverter;
    }

    public function buildSlugMap(): array
    {
        $posts = \App\Models\Post::all();

        return [
            'slugMap' => $posts->mapWithKeys(fn($p) => [$p->slug => $p->id])->toArray(),
            'titleMap' => $posts->mapWithKeys(fn($p) => [Str::slug($p->title) => $p->slug])->toArray(),
        ];
    }

    public function resolveSlug(string $input, array $slugMap, array $slugSet, array $titleMap): ?string
    {
        $parts = explode('|', $input);
        $slugPart = end($parts);
        if ($slugPart === false) {
            return null;
        }
        $slug = Str::slug(trim($slugPart));

        if (isset($slugSet[$slug])) {
            return $slug;
        }
        if (isset($slugMap[$slug])) {
            return $slug;
        }
        if (isset($titleMap[$slug])) {
            return $titleMap[$slug];
        }

        foreach ($slugMap as $existingSlug => $postId) {
            if (str_contains($existingSlug, $slug) || str_contains($slug, $existingSlug)) {
                return $existingSlug;
            }
        }

        return null;
    }

    public function extractLinks(string $content): array
    {
        preg_match_all('/\[\[([^\]]+)\]\]/', $content, $matches);
        return $matches[1];
    }

    public function convertToHtml(string $content, array $slugMap, array $slugSet, array $titleMap): string
    {
        $content = preg_replace_callback('/\[\[([^\]]+)\]\]/', function ($matches) use ($slugMap, $slugSet, $titleMap) {
            $link = $matches[1];
            $parts = explode('|', $link);

            if (count($parts) === 2) {
                $displayText = trim($parts[0]);
                $slug = Str::slug(trim($parts[1]));
            } else {
                $displayText = trim($link);
                $slug = Str::slug($displayText);
            }

            $targetSlug = $this->resolveSlug($link, $slugMap, $slugSet, $titleMap);

            if ($targetSlug) {
                return "[{$displayText}](/posts/{$targetSlug})";
            }

            return $displayText;
        }, $content);

        return $this->converter->convert($content)->getContent();
    }
}
