<script setup>
import { Link } from '@inertiajs/vue3'
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-24">
    <p class="font-display text-xs font-bold uppercase tracking-[0.2em] text-coral-ink mb-4">
      404
    </p>

    <h1 class="font-display text-5xl md:text-6xl font-bold text-ink leading-tight tracking-tighter mb-6">
      This path leads nowhere.
    </h1>

    <p class="text-lg text-warm-muted leading-relaxed max-w-2xl mb-10">
      The page may have moved, been renamed, or never existed. The rest of the
      site is still here.
    </p>

    <div class="flex flex-wrap gap-3">
      <Link
        href="/"
        class="inline-flex items-center gap-2 bg-ink text-white px-5 py-2.5 font-display font-bold text-sm rounded-sm hover:bg-coral-ink transition-colors"
      >
        Back to the start
      </Link>
      <Link
        href="/posts"
        class="inline-flex items-center gap-2 border border-warm-border px-5 py-2.5 font-display font-bold text-sm rounded-sm text-ink hover:border-coral transition-colors"
      >
        Read the writing
      </Link>
      <Link
        href="/graph"
        class="inline-flex items-center gap-2 border border-warm-border px-5 py-2.5 font-display font-bold text-sm rounded-sm text-ink hover:border-coral transition-colors"
      >
        Browse the graph
      </Link>
    </div>
  </div>
</template>
