<?php

// Vercel Cron endpoint for Nepal news
// Schedule: daily at 00:15 UTC (= 06:00 NPT)

define('LARAVEL_START', microtime(true));

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

// Auth check
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

// Ensure DB file exists
$dbPath = $_ENV['NEPAL_NEWS_DB'] ?? '/tmp/nepal_news.sqlite';
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
    exec("git clone {$repoUrl} {$repoPath} 2>&1", $output, $exitCode);
    if ($exitCode !== 0) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to clone data repo', 'output' => $output]);
        exit;
    }
}

// Run pipeline: scrape → process → publish
$kernel->call('nepal:scrape');
$kernel->call('nepal:process', ['--limit' => 100]);
$kernel->call('nepal:publish', ['--repo' => $repoPath]);

http_response_code(200);
echo json_encode([
    'status' => 'ok',
    'timestamp' => now()->toIso8601String(),
]);
