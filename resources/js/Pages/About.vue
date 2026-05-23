<script setup>
import { Link } from '@inertiajs/vue3';
</script>

<template>
 <article class="max-w-6xl mx-auto px-6 py-12">
 <header class="mb-10">
 <Link href="/" class="inline-flex items-center gap-2 text-warm-muted hover:text-coral transition-colors mb-6">
 ← Home
 </Link>
 <h1 class="font-display text-5xl font-bold text-ink mb-2">
 About
 </h1>
 <p class="text-xl text-warm-muted leading-relaxed">
 Who I am & what this space is for
 </p>
 </header>

 <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
 <div>
 <h2 class="font-display text-3xl font-bold text-ink mb-4">
 Hi, I'm Swapnil
 </h2>
 <p class="text-warm-muted leading-relaxed mb-6">
 I build things, write about them, and try to make sense of the world one line of code at a time.
 </p>
 <p class="text-warm-muted leading-relaxed mb-6">
 This is my digital garden where I share thoughts on software, career growth, productivity, and whatever else catches my curiosity.
 </p>
 <div class="flex flex-wrap gap-4 mb-6">
 <span class="inline-flex items-center gap-2 bg-coral text-white px-3 py-1 rounded text-sm font-medium">
 Vue 3
 </span>
 <span class="inline-flex items-center gap-2 bg-sky text-white px-3 py-1 rounded text-sm font-medium">
 Laravel
 </span>
 <span class="inline-flex items-center gap-2 bg-mustard text-ink px-3 py-1 rounded text-sm font-medium">
 Inertia
 </span>
 <span class="inline-flex items-center gap-2 bg-mint text-white px-3 py-1 rounded text-sm font-medium">
 Tailwind 4
 </span>
 </div>
 <div class="space-y-3">
 <p class="flex items-start gap-2 text-warm-muted">
 <span class="flex-shrink-0 w-4 h-4 bg-coral/20 text-coral flex items-center justify-center text-sm font-medium rounded">📍</span>
 <span>Based in Kathmandu, Nepal</span>
 </p>
 <p class="flex items-start gap-2 text-warm-muted">
 <span class="flex-shrink-0 w-4 h-4 bg-sky/20 text-sky flex items-center justify-center text-sm font-medium">💻</span>
 <span>Full-stack developer & open source enthusiast</span>
 </p>
 <p class="flex items-start gap-2 text-warm-muted">
 <span class="flex-shrink-0 w-4 h-4 bg-mustard/20 text-mustard flex items-center justify-center text-sm font-medium">✍️</span>
 <span>Writing publicly since 2020</span>
 </p>
 </div>
 </div>
 
 <div class="bg-warm-surface border border-warm-border p-8 rounded-lg">
 <h2 class="font-display text-2xl font-bold text-ink mb-4">
 Why this site?
 </h2>
 <p class="text-warm-muted mb-4">
 I believe in learning in public. This site is where I:
 </p>
 <ul class="list-disc list-inside space-y-2 text-warm-muted mb-6">
 <li>Share what I'm learning</li>
 <li>Document my projects and experiments</li>
 <li>Reflect on career and growth</li>
 <li>Connect with others who are curious</li>
 </ul>
 
 <h2 class="font-display text-2xl font-bold text-ink mb-3 mt-6">
 The tech behind it
 </h2>
 <p class="text-warm-muted mb-4">
 Built with the VILT stack (Vue 3 + Laravel + Inertia + Tailwind 4), deployed serverless on Vercel with SQLite. The graph visualization uses D3.js, and yes, there's a Tamagotchi on the homepage because joy matters.
 </p>
 
 <Link href="/now" class="inline-flex items-center gap-2 bg-ink dark:bg-[#1C1C1E] text-white px-4 py-2 font-display font-bold text-sm hover:bg-coral transition-colors rounded-sm">
 See what I'm doing now →
 </Link>
 </div>
 </div>
 
 <div class="mt-16 pt-8 border-t border-warm-border">
 <h2 class="font-display text-2xl font-bold text-ink mb-6">
 A note on design
 </h2>
 <p class="text-warm-muted leading-relaxed max-w-3xl">
 This site embraces playful maximalism — bold colors, unexpected layouts, and joyful details. Because personal websites shouldn't be boring. The design system uses Bricolage Grotesque for headings (a variable font with serious personality) and DM Sans for body text, with a color palette that ranges from warm cream to vibrant coral.
 </p>
 </div>
 </article>
</template>