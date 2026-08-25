<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('source');
            $table->string('source_url')->unique();
            $table->string('title');
            $table->text('body')->nullable();
            $table->datetime('published_at')->nullable();
            $table->datetime('scraped_at')->useCurrent();

            $table->text('summary')->nullable();
            $table->string('category')->nullable();
            $table->string('sentiment')->nullable();
            $table->json('entities_json')->nullable();
            $table->json('keywords_json')->nullable();
            $table->integer('importance_score')->nullable();
            $table->datetime('processed_at')->nullable();

            $table->timestamps();

            $table->index('source');
            $table->index('category');
            $table->index('published_at');
            $table->index('processed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};
