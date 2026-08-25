<?php

// Vercel Cron endpoint for Nepal news scraping + processing
// Triggers: nepal:scrape → nepal:process
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

// Run scrape
$status = $kernel->call('nepal:scrape');

// Run process (only if scrape succeeded)
if ($status === 0) {
    $kernel->call('nepal:process', ['--limit' => 100]);
}

http_response_code(200);
echo json_encode([
    'status' => 'ok',
    'timestamp' => now()->toIso8601String(),
]);
