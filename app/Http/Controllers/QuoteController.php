<?php

namespace App\Http\Controllers;

use App\Models\Quote;
use Illuminate\Http\Request;

class QuoteController extends Controller
{
    public function random(Request $request)
    {
        $exclude = $request->integer('exclude');

        $quote = Quote::query()
            ->when($exclude, fn ($query) => $query->where('id', '!=', $exclude))
            ->inRandomOrder()
            ->first(['id', 'quote', 'author']);

        $quote ??= Quote::inRandomOrder()->first(['id', 'quote', 'author']);

        return response()->json($quote);
    }
}
