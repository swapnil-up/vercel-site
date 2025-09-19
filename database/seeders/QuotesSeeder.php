<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

class QuotesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Truncate 
        DB::table('quotes')->truncate();

        // Read from JSON file
        $quotes = json_decode(File::get('graph/quotes.json'), true);

        // Insert 
        foreach ($quotes as $quote) {
            DB::table('quotes')->insert([
                'quote' => $quote['quote'],
                'author' => $quote['author'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}