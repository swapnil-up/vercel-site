<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use App\Http\Middleware\HandleInertiaRequests;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
    $middleware->trustProxies(at: '*');
    $middleware->web(append: [
        HandleInertiaRequests::class,
    ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->respond(function (SymfonyResponse $response, Throwable $e, Request $request) {
            if ($response->getStatusCode() === 404 && ! $request->expectsJson()) {
                return Inertia::render('Errors/404', [
                    'meta' => [
                        'title' => 'Page not found — Swapnil Upadhyay',
                        'description' => 'That page does not exist.',
                        'url' => $request->url(),
                        'type' => 'website',
                    ],
                ])->toResponse($request)->setStatusCode(404);
            }

            return $response;
        });
    })->create();
