<script setup>
import { Link } from '@inertiajs/vue3';
</script>

<template>
    <nav class="bg-gray-900 text-white py-4">
        <div class="container mx-auto flex justify-between items-center px-6">
            <h1 class="text-xl font-bold">
                <Link href="/">Swap's musings</Link>
            </h1>
            <ul class="flex space-x-6">
                <li><Link href="/" class="hover:text-gray-400">Home</Link></li>
                <li><Link href="/graph" class="hover:text-gray-400">Graph</Link></li>
                <li><Link href="/articles" class="hover:text-gray-400">Articles</Link></li>
                <li><Link href="/about" class="hover:text-gray-400">About</Link></li>
                <li><Link href="/now" class="hover:text-gray-400">Now</Link></li>
            </ul>
        </div>
    </nav>
</template>
