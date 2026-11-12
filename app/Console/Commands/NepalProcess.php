<?php

namespace App\Console\Commands;

use App\Exceptions\GroqException;
use App\Models\Article;
use App\Services\NepalArticleSelector;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NepalProcess extends Command
{
    protected $signature = 'nepal:process
        {--limit=60 : Max articles to process in one run}
        {--dry-run : Report the selection without calling Groq}';

    protected $description = 'Select and process unprocessed articles with Groq AI (summarize, categorize, extract)';

    private string $groqApiKey;

    private string $groqModel;

    private int $maxRetries = 3;

    private int $throttleSeconds;

    private int $totalTokens = 0;

    public function handle(NepalArticleSelector $selector): int
    {
        $this->groqApiKey = (string) config('nepal.groq.key', '');
        $this->groqModel = (string) config('nepal.groq.model', '');
        $this->throttleSeconds = (int) config('nepal.groq.throttle_seconds', 2);

        if ($this->groqApiKey === '' && ! $this->option('dry-run')) {
            $this->error('GROQ_API_KEY not set.');

            return 1;
        }

        $limit = max(1, (int) $this->option('limit'));

        $candidates = Article::unprocessed()
            ->whereNotNull('body')
            ->where('body', '!=', '')
            ->get();

        if ($candidates->isEmpty()) {
            $this->info('No unprocessed articles found.');

            return 0;
        }

        $selection = $selector->select($candidates, $limit);
        $articles = $selection['selected'];

        $this->info(sprintf(
            'Selected %d of %d candidates (%d duplicates, %d filtered, %d over the cap).',
            $articles->count(),
            $selection['considered'],
            $selection['duplicates'],
            $selection['excluded'],
            $selection['overflow'],
        ));

        if ($this->option('dry-run')) {
            foreach ($articles as $article) {
                $this->line("  · [{$article->source}] {$article->title}");
            }

            $this->info('Dry run: no tokens spent.');

            return 0;
        }

        // Fail in seconds, not after a batch of doomed retries, if the model
        // has been retired.
        if (! $this->verifyModel()) {
            return 1;
        }

        if ($articles->isEmpty()) {
            $this->warn('Nothing left after selection.');

            return 0;
        }

        $processed = 0;
        $failed = 0;
        $aborted = false;

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
                    $this->totalTokens += $result['tokens'];
                    $processed++;
                    $success = true;

                    if ($this->throttleSeconds > 0) {
                        sleep($this->throttleSeconds);
                    }

                    break;
                } catch (GroqException $e) {
                    if ($e->retryable && $attempt < $this->maxRetries) {
                        $wait = $e->retryAfter ?? 3.0;
                        $this->warn("  ⏳ Transient error, waiting {$wait}s (attempt {$attempt}/{$this->maxRetries})...");
                        sleep((int) ceil($wait));
                        continue;
                    }

                    $this->error("  ✗ {$article->title}: {$e->getMessage()}");
                    Log::error("Nepal process failed for article {$article->id}", [
                        'error' => $e->getMessage(),
                        'attempt' => $attempt,
                    ]);

                    if ($e->fatal) {
                        $aborted = true;
                    }

                    break;
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

            if ($aborted) {
                $this->error('Aborting: the Groq model or credentials are not usable.');
                break;
            }
        }

        $this->info("Done: {$processed} processed, {$failed} failed (~{$this->totalTokens} tokens).");

        if ($processed === 0) {
            $this->error('Nothing was processed.');

            return 1;
        }

        return 0;
    }

    /**
     * Confirm the key works and the configured model exists before spending tokens.
     */
    private function verifyModel(): bool
    {
        try {
            $response = Http::timeout(20)
                ->withToken($this->groqApiKey)
                ->get((string) config('nepal.groq.models_endpoint'));
        } catch (\Throwable $e) {
            $this->error("Could not reach Groq: {$e->getMessage()}");

            return false;
        }

        if ($response->status() === 401) {
            $this->error('GROQ_API_KEY was rejected (HTTP 401).');

            return false;
        }

        if (! $response->successful()) {
            $this->error("Could not list Groq models: HTTP {$response->status()}.");

            return false;
        }

        $ids = collect($response->json('data', []))->pluck('id')->filter()->values();

        if (! $ids->contains($this->groqModel)) {
            $this->error("Groq model '{$this->groqModel}' is not available to this key.");
            $this->line('Available models: ' . $ids->take(15)->implode(', '));
            $this->line('Set the GROQ_MODEL environment variable to one of these.');

            return false;
        }

        $this->info("Groq model: {$this->groqModel}");

        return true;
    }

    /**
     * @return array{summary: ?string, category: string, sentiment: string, entities: array, keywords: array, importance_score: int, tokens: int}
     */
    private function processArticle(Article $article): array
    {
        $body = mb_substr($article->body, 0, 2000);

        $response = Http::timeout(30)
            ->withHeaders([
                'Authorization' => "Bearer {$this->groqApiKey}",
                'Content-Type' => 'application/json',
            ])
            ->post((string) config('nepal.groq.endpoint'), [
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
            $status = $response->status();
            $error = $response->body();

            throw new GroqException(
                "Groq API error: HTTP {$status} — {$error}",
                status: $status,
                retryable: $status === 429 || $status >= 500,
                fatal: in_array($status, [401, 403, 404], true) || str_contains($error, 'model_not_found'),
                retryAfter: $status === 429 ? $this->extractWaitTime($error) : null,
            );
        }

        $content = $response->json('choices.0.message.content', '');

        if ($content === '') {
            throw new GroqException('Empty response from Groq', status: $response->status());
        }

        $result = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new GroqException('Invalid JSON: ' . json_last_error_msg(), status: $response->status());
        }

        return [
            'summary' => $result['summary'] ?? null,
            'category' => $result['category'] ?? 'other',
            'sentiment' => $result['sentiment'] ?? 'neutral',
            'entities' => $result['entities'] ?? [],
            'keywords' => $result['keywords'] ?? [],
            'importance_score' => max(1, min(10, (int) ($result['importance_score'] ?? 5))),
            'tokens' => (int) $response->json('usage.total_tokens', 0),
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
