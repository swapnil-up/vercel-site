<?php

namespace App\Http\Controllers;

use App\Models\Quote;

class QuoteController extends Controller
{
    public function random()
    {
        return response()->json(
            Quote::inRandomOrder()->first()
        );
    }
}
