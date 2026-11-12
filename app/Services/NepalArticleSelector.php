<?php

namespace App\Services;

use App\Models\Article;
use Illuminate\Support\Collection;

/**
 * Picks which scraped articles deserve AI tokens.
 *
 * A week of RSS scraping across three outlets is far more than one weekly
 * Groq batch can absorb, and the same story is routinely filed by more than
 * one outlet. This drops obvious non-news, collapses near-identical titles,
 * and ranks what is left by recency, so the batch budget buys distinct
 * stories rather than three rewrites of one event.
 */
class NepalArticleSelector
{
    /** Lower sorts first; only used to break same-timestamp ties. */
    private const SOURCE_PRIORITY = [
        'kathmandu-post' => 0,
        'nepali-times' => 1,
        'online-khabar' => 2,
    ];

    private const STOPWORDS = [
        'a', 'an', 'the', 'of', 'in', 'on', 'to', 'for', 'and', 'or', 'at',
        'by', 'from', 'with', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
        'has', 'have', 'had', 'will', 'would', 'can', 'could', 'may', 'might',
        'it', 'its', 'his', 'her', 'their', 'this', 'that', 'these', 'those',
        'after', 'over', 'into', 'out', 'up', 'down', 'amid', 'ahead', 'new',
    ];

    /** @var array<int, string> */
    private array $excludePatterns;

    private float $dedupeThreshold;

    public function __construct()
    {
        $this->excludePatterns = config('nepal.selection.exclude_patterns', []);
        $this->dedupeThreshold = (float) config('nepal.selection.dedupe_threshold', 0.6);
    }

    /**
     * @param  Collection<int, Article>  $articles
     * @return array{
     *     selected: Collection<int, Article>,
     *     considered: int,
     *     excluded: int,
     *     duplicates: int,
     *     overflow: int
     * }
     */
    public function select(Collection $articles, int $limit): array
    {
        $considered = $articles->count();

        $kept = $articles->reject(fn (Article $article) => $this->isExcluded($article))->values();
        $excluded = $considered - $kept->count();

        // Rank before deduping so the surviving copy of a story is the one the
        // ranking prefers (newest, then the outlet we trust a little more).
        $ranked = $kept->sortBy([
            fn (Article $a, Article $b) => $this->timestamp($b) <=> $this->timestamp($a),
            fn (Article $a, Article $b) => $this->priority($a) <=> $this->priority($b),
        ])->values();

        $unique = [];
        $tokens = [];
        $duplicates = 0;

        foreach ($ranked as $article) {
            $signature = $this->tokens($article->title);

            if ($this->isDuplicate($signature, $tokens)) {
                $duplicates++;
                continue;
            }

            $unique[] = $article;
            $tokens[] = $signature;
        }

        $selected = array_slice($unique, 0, $limit);

        return [
            'selected' => collect($selected),
            'considered' => $considered,
            'excluded' => $excluded,
            'duplicates' => $duplicates,
            'overflow' => max(0, count($unique) - count($selected)),
        ];
    }

    private function isExcluded(Article $article): bool
    {
        $haystack = $article->title . ' ' . $article->source_url;

        foreach ($this->excludePatterns as $pattern) {
            if (preg_match($pattern, $haystack) === 1) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, array<string, bool>>  $seen
     */
    private function isDuplicate(array $signature, array $seen): bool
    {
        // Very short titles do not carry enough signal to call two of them the
        // same story, so leave them alone rather than merging on generic words.
        if (count($signature) < 3) {
            return false;
        }

        foreach ($seen as $other) {
            if (count($other) < 3) {
                continue;
            }

            $shared = count(array_intersect_key($signature, $other));
            $union = count($signature + $other);

            if ($union > 0 && ($shared / $union) >= $this->dedupeThreshold) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string, bool> significant title tokens, keyed for fast intersection
     */
    private function tokens(string $title): array
    {
        $clean = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', mb_strtolower($title)) ?? '';

        $tokens = [];

        foreach (preg_split('/\s+/', trim($clean)) ?: [] as $word) {
            if ($word === '' || mb_strlen($word) < 3 || in_array($word, self::STOPWORDS, true)) {
                continue;
            }

            $tokens[$word] = true;
        }

        return $tokens;
    }

    private function timestamp(Article $article): int
    {
        return $article->published_at?->getTimestamp() ?? 0;
    }

    private function priority(Article $article): int
    {
        return self::SOURCE_PRIORITY[$article->source] ?? 9;
    }
}
