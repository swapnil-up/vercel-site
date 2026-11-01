<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Book extends Model
{
    use HasFactory;

    public const STATUSES = ['want', 'reading', 'finished', 'abandoned'];

    protected $fillable = [
        'title',
        'slug',
        'author',
        'recommended_by',
        'thoughts',
        'thoughts_html',
        'status',
        'started_on',
        'finished_on',
        'cover_url',
        'tags',
        'stats',
        'source_path',
        'is_draft',
    ];

    protected $casts = [
        'tags' => 'array',
        'stats' => 'array',
        'started_on' => 'date',
        'finished_on' => 'date',
        'is_draft' => 'boolean',
    ];
}
