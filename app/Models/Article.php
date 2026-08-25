<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = [
        'source',
        'source_url',
        'title',
        'body',
        'published_at',
        'scraped_at',
        'summary',
        'category',
        'sentiment',
        'entities_json',
        'keywords_json',
        'importance_score',
        'processed_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'scraped_at' => 'datetime',
        'processed_at' => 'datetime',
        'entities_json' => 'array',
        'keywords_json' => 'array',
        'importance_score' => 'integer',
    ];

    public function scopeProcessed($query)
    {
        return $query->whereNotNull('processed_at');
    }

    public function scopeUnprocessed($query)
    {
        return $query->whereNull('processed_at');
    }

    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('published_at', '>=', now()->subDays($days));
    }
}
