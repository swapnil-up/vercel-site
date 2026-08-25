<?php

namespace App\Http\Controllers;

use Artisan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class NepalNewsSetupController extends Controller
{
    public function __invoke(Request $request)
    {
        // Only allow from localhost or with setup token
        $token = $request->input('token');
        $isLocal = in_array($request->ip(), ['127.0.0.1', '::1']);

        if (! $isLocal && $token !== config('nepal-news.setup_token')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $results = [];

        // Ensure /tmp directory and DB file exist
        $dbPath = config('database.connections.nepal_news.database');
        $dbDir = dirname($dbPath);

        if (! File::isDirectory($dbDir)) {
            File::makeDirectory($dbDir, 0755, true);
        }

        // Create empty SQLite file if it doesn't exist
        if (! File::exists($dbPath)) {
            File::put($dbPath, '');
            $results['db_created'] = true;
        }

        // Run migration on nepal_news connection
        $exitCode = Artisan::call('migrate', [
            '--database' => 'nepal_news',
            '--path' => 'database/migrations_nepal_news',
            '--force' => true,
        ]);
        $results['migrate'] = Artisan::output();

        // Run scrape
        $exitCode = Artisan::call('nepal:scrape');
        $results['scrape'] = Artisan::output();

        // Run process
        $exitCode = Artisan::call('nepal:process', ['--limit' => 200]);
        $results['process'] = Artisan::output();

        return response()->json([
            'status' => 'ok',
            'results' => $results,
        ]);
    }
}
