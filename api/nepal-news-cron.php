<?php

// Vercel Cron endpoint for Nepal news scraping + processing
// Triggers: nepal:scrape → nepal:process → nepal:publish
// Schedule: daily at 00:15 UTC (= 06:00 NPT)

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

// Only allow Vercel cron invocations
$authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

if (! str_starts_with($authorization, 'Bearer ')) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$token = substr($authorization, 7);
$expectedToken = $_ENV['CRON_SECRET'] ?? '';

if (! $expectedToken) {
    http_response_code(500);
    echo json_encode(['error' => 'CRON_SECRET not configured']);
    exit;
}

if ($token !== $expectedToken) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

// Ensure nepal_news DB exists
$dbPath = config('database.connections.nepal_news.database');
$dbDir = dirname($dbPath);

if (! is_dir($dbDir)) {
    mkdir($dbDir, 0755, true);
}

if (! file_exists($dbPath)) {
    touch($dbPath);
}

// Run migration
$kernel->call('migrate', [
    '--database' => 'nepal_news',
    '--path' => 'database/migrations_nepal_news',
    '--force' => true,
]);

// Clone data repo if needed
$repoPath = '/tmp/nepal-news-data';
$repoUrl = $_ENV['NEPAL_NEWS_REPO_URL'] ?? 'https://github.com/swapnil-up/nepal-news-data.git';

if (! is_dir("{$repoPath}/.git")) {
    exec("git clone {$repoUrl} {$repoPath}", $output, $exitCode);
    if ($exitCode !== 0) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to clone data repo']);
        exit;
    }
}

// Run scrape
$kernel->call('nepal:scrape');

// Run process
$kernel->call('nepal:process', ['--limit' => 100]);

// Run publish (writes to GitHub repo)
$kernel->call('nepal:publish', ['--repo' => $repoPath]);

http_response_code(200);
echo json_encode([
    'status' => 'ok',
    'timestamp' => now()->toIso8601String(),
]);
