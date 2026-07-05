<?php

namespace App\Http\Controllers;

class RotaMinutesController extends Controller
{
    public function __invoke()
    {
        $defaultsPath = resource_path('rota/assets/rota-defaults.json');
        $defaults = file_exists($defaultsPath) ? json_decode(file_get_contents($defaultsPath), true) ?? [] : [];

        return inertia('Tools/RotaMinutesStandalone', [
            'meta' => [
                'title' => 'Rota Minutes — Tools — Swapnil Upadhyay',
                'description' => 'Generate meeting minutes PDFs entirely in your browser — no server-side processing.',
            ],
            'config' => config('rota'),
            'defaults' => $defaults,
        ]);
    }
}
