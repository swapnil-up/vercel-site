<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('author')->nullable();
            $table->text('recommended_by')->nullable();
            $table->text('thoughts');
            $table->text('thoughts_html');
            $table->string('status')->default('finished');
            $table->date('started_on')->nullable();
            $table->date('finished_on')->nullable();
            $table->text('cover_url')->nullable();
            $table->json('tags')->nullable();
            $table->json('stats')->nullable();
            $table->string('source_path')->nullable()->index();
            $table->boolean('is_draft')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
