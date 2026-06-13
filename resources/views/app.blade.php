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

    {{-- Google Search Console --}}
    {{-- TODO: Replace with your actual verification code from https://search.google.com/search-console --}}
    {{-- <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE_HERE"> --}}

    {{-- Open Graph / Social --}}
    <meta property="og:title" content="{{ $page['props']['meta']['title'] ?? 'Swapnil Upadhyay' }}">
    <meta property="og:description" content="{{ $page['props']['meta']['description'] ?? 'Personal website and blog' }}">
    <meta property="og:url" content="{{ $page['props']['meta']['url'] ?? url()->current() }}">
    <meta property="og:image" content="{{ $page['props']['meta']['image'] ?? asset('images/og-image.jpg') }}">
    <meta property="og:type" content="website">

    {{-- Twitter Cards --}}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{ $page['props']['meta']['title'] ?? 'Swapnil Upadhyay' }}">
    <meta name="twitter:description" content="{{ $page['props']['meta']['description'] ?? 'Personal website and blog' }}">
    <meta name="twitter:image" content="{{ $page['props']['meta']['image'] ?? asset('images/og-image.jpg') }}">

    {{-- RSS Feed --}}
    <link rel="alternate" type="application/rss+xml" title="Swapnil Upadhyay — Articles" href="{{ url('/feed') }}">

    {{-- Favicon --}}
    <link rel="icon" type="image/svg+xml" href="{{ asset('favicon.svg') }}">
    <link rel="icon" type="image/png" sizes="96x96" href="{{ asset('favicon-96x96.png') }}">
    <link rel="alternate icon" type="image/x-icon" href="{{ asset('favicon.ico') }}">
    <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('apple-touch-icon.png') }}">
    <link rel="manifest" href="{{ asset('site.webmanifest') }}">

    {{-- JSON-LD Structured Data --}}
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Swapnil Upadhyay",
        "url": "{{ url('/') }}",
        "description": "Personal website and blog of Swapnil Upadhyay. Code, career, and curiosity — written in public."
    }
    </script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Swapnil Upadhyay",
        "url": "{{ url('/') }}",
        "jobTitle": "Full-Stack Developer",
        "sameAs": [
            "https://github.com/swapnil-up",
            "https://slides.swapnilupadhyay.com.np"
        ]
    }
    </script>
    @if(isset($page['props']['ldjson']))
    <script type="application/ld+json">
    {!! json_encode($page['props']['ldjson'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) !!}
    </script>
    @endif

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