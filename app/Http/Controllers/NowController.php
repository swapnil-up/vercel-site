<?php

namespace App\Http\Controllers;

use App\Models\Post;

class NowController extends Controller
{
    public function show()
    {
        $nowPost = Post::where('slug', 'now')->first();

        if (! $nowPost) {
            return response()->json(['content' => 'Now page not found.'], 404);
        }

        return response()->json([
            'content' => $nowPost->content_html,
        ]);
    }
}
