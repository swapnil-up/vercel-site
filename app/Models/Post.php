<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected $fillable = ['title','slug','content','content_html','description','tags','series','series_order','internal_links','published_date','content_updated_at','is_draft','created_at','updated_at'];
    protected $casts = [
        'tags' => 'array',
        'published_date' => 'date',
        'internal_links' => 'array',
        'content_updated_at' => 'datetime',
        'is_draft' => 'boolean',
    ];
}
