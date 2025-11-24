<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('content'); // Original markdown with wikilinks
            $table->text('content_html'); // Processed HTML
            $table->text('description')->nullable();
            $table->json('tags')->nullable();
            $table->string('series')->nullable();
            $table->integer('series_order')->nullable();
            $table->json('internal_links')->nullable(); // Store parsed wikilinks
            $table->date('published_date');
            $table->timestamp('content_updated_at')->nullable();
            $table->boolean('is_draft')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
