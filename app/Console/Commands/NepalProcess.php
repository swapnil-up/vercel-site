<?php

namespace App\Console\Commands;

use App\Models\Article;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NepalProcess extends Command
{
    protected $signature = 'nepal:process {--limit=50 : Max articles to process}';

    protected $description = 'Process unprocessed articles with Groq AI (summarize, categorize, extract)';

    private string $groqApiKey;
    private string $groqModel = 'groq/compound-mini';
    private int $maxRetries = 3;

    public function handle(): int
    {
        $this->groqApiKey = env('GROQ_API_KEY', '');

        if ($this->groqApiKey === '') {
            $this->error('GROQ_API_KEY not set. Add it to .env and config/services.php');
            return 1;
        }

        $articles = Article::unprocessed()
            ->whereNotNull('body')
            ->where('body', '!=', '')
            ->orderBy('published_at', 'desc')
            ->limit($this->option('limit'))
            ->get();

        if ($articles->isEmpty()) {
            $this->info('No unprocessed articles found.');
            return 0;
        }

        $this->info("Processing {$articles->count()} articles with Groq AI...");

        $processed = 0;
        $failed = 0;

        foreach ($articles as $article) {
            $success = false;

            for ($attempt = 1; $attempt <= $this->maxRetries; $attempt++) {
                try {
                    $result = $this->processArticle($article);

                    $article->update([
                        'summary' => $result['summary'],
                        'category' => $result['category'],
                        'sentiment' => $result['sentiment'],
                        'entities_json' => $result['entities'],
                        'keywords_json' => $result['keywords'],
                        'importance_score' => $result['importance_score'],
                        'processed_at' => now(),
                    ]);

                    $this->info("  ✓ [{$article->source}] {$article->title}");
                    $processed++;
                    $success = true;

                    // Sleep 2s between successful calls to avoid rate limits
                    sleep(2);
                    break;
                } catch (\RuntimeException $e) {
                    $message = $e->getMessage();

                    // Check for rate limit error and extract wait time
                    if (str_contains($message, 'rate_limit_exceeded')) {
                        $waitSeconds = $this->extractWaitTime($message);
                        if ($attempt < $this->maxRetries) {
                            $this->warn("  ⏳ Rate limited, waiting {$waitSeconds}s (attempt {$attempt}/{$this->maxRetries})...");
                            sleep((int) ceil($waitSeconds));
                            continue;
                        }
                    }

                    $this->error("  ✗ {$article->title}: {$message}");
                    Log::error("Nepal process failed for article {$article->id}", [
                        'error' => $message,
                        'attempt' => $attempt,
                    ]);
                } catch (\Exception $e) {
                    $this->error("  ✗ {$article->title}: {$e->getMessage()}");
                    Log::error("Nepal process failed for article {$article->id}", [
                        'error' => $e->getMessage(),
                    ]);
                    break;
                }
            }

            if (! $success) {
                $failed++;
            }
        }

        $this->info("Done: {$processed} processed, {$failed} failed");
        return 0;
    }

    private function processArticle(Article $article): array
    {
        $body = mb_substr($article->body, 0, 2000);

        $response = Http::timeout(30)
            ->withHeaders([
                'Authorization' => "Bearer {$this->groqApiKey}",
                'Content-Type' => 'application/json',
            ])
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model' => $this->groqModel,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => <<<'PROMPT'
You are a news analyst for a Nepal news aggregator. Analyze the article and return a JSON object with these fields:

- summary: 150-word max summary of the article
- category: one of "politics", "business", "sports", "culture", "health", "technology", "world", "other"
- sentiment: one of "positive", "negative", "neutral", "mixed"
- entities: array of {type: "PERSON"|"ORG"|"LOCATION", name: string} for key people, organizations, and places
- keywords: array of 3-8 keyword strings
- importance_score: integer 1-10 (10 = breaking/major national news, 1 = minor/local)

Return ONLY valid JSON, no markdown fences.
PROMPT,
                    ],
                    [
                        'role' => 'user',
                        'content' => "Source: {$article->source}\nTitle: {$article->title}\n\n{$body}",
                    ],
                ],
                'temperature' => 0.3,
                'max_tokens' => 1024,
                'response_format' => ['type' => 'json_object'],
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException("Groq API error: HTTP {$response->status()} — {$response->body()}");
        }

        $content = $response->json('choices.0.message.content', '');

        if ($content === '') {
            throw new \RuntimeException('Empty response from Groq');
        }

        $result = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException("Invalid JSON: " . json_last_error_msg());
        }

        return [
            'summary' => $result['summary'] ?? null,
            'category' => $result['category'] ?? 'other',
            'sentiment' => $result['sentiment'] ?? 'neutral',
            'entities' => $result['entities'] ?? [],
            'keywords' => $result['keywords'] ?? [],
            'importance_score' => max(1, min(10, (int) ($result['importance_score'] ?? 5))),
        ];
    }

    private function extractWaitTime(string $message): float
    {
        if (preg_match('/Please try again in (\d+\.?\d*)s/', $message, $matches)) {
            return (float) $matches[1];
        }

        return 3.0; // Default wait
    }
}
