<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    
    {{-- Dynamic Title --}}
    <title inertia>{{ $page['props']['meta']['title'] ?? 'Swapnil Upadhyay' }}</title>

    {{-- SEO Meta Tags --}}
    <meta name="description" content="{{ $page['props']['meta']['description'] ?? 'Personal website and blog' }}">
    <meta name="author" content="Swapnil Upadhyay">
    <link rel="canonical" href="{{ $page['props']['meta']['url'] ?? url()->current() }}">

    {{-- Favicon --}}
    <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('favicon-32x32.png') }}">
    <link rel="icon" type="image/png" sizes="16x16" href="{{ asset('favicon-16x16.png') }}">
    <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('apple-touch-icon.png') }}">
    <link rel="manifest" href="{{ asset('site.webmanifest') }}">

    {{-- Preconnect for performance --}}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    {{-- Scripts --}}
    @routes
    @vite('resources/css/app.css')
    @vite('resources/js/app.js')
    @inertiaHead
</head>

<body class="font-sans antialiased">
    @inertia
</body>

</html>