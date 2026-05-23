<script setup>
import { Link } from '@inertiajs/vue3';
</script>

<template>
  <footer class="border-t-4 border-ink bg-ink text-white dark:bg-[#0a0a0c] dark:text-[#e0ddd5] mt-auto">
    <div class="max-w-6xl mx-auto px-6 py-10">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div class="col-span-2 md:col-span-1">
          <Link href="/" class="font-display text-xl font-bold tracking-tight">
            Swap's musings
          </Link>
          <p class="text-warm-muted text-sm mt-2">
            Code, career, and curiosity.
          </p>
        </div>
        <div>
          <h4 class="font-display text-sm font-bold text-mustard mb-3">Navigate</h4>
          <ul class="space-y-2 text-sm text-white/70">
            <li><Link href="/posts" class="hover:text-coral transition-colors">Writing</Link></li>
            <li><Link href="/graph" class="hover:text-coral transition-colors">Graph</Link></li>
            <li><Link href="/tracker" class="hover:text-coral transition-colors">Tracker</Link></li>
            <li><Link href="/now" class="hover:text-coral transition-colors">Now</Link></li>
          </ul>
        </div>
        <div>
          <h4 class="font-display text-sm font-bold text-mustard mb-3">Play</h4>
          <ul class="space-y-2 text-sm text-white/70">
            <li><Link href="/tools" class="hover:text-coral transition-colors">Tools</Link></li>
            <li><Link href="/tools/tamagotchi" class="hover:text-coral transition-colors">Tamagotchi</Link></li>
            <li><Link href="/tools/clicker" class="hover:text-coral transition-colors">Clicker</Link></li>
            <li><Link href="/tools/error-generator" class="hover:text-coral transition-colors">SeriousCLI</Link></li>
          </ul>
        </div>
        <div>
          <h4 class="font-display text-sm font-bold text-mustard mb-3">Connect</h4>
          <ul class="space-y-2 text-sm text-white/70">
            <li><a href="https://github.com/swap" target="_blank" rel="noopener noreferrer" class="hover:text-coral transition-colors">GitHub</a></li>
            <li><a href="https://slides.swapnilupadhyay.com.np" target="_blank" rel="noopener noreferrer" class="hover:text-coral transition-colors">Slides</a></li>
            <li><Link href="/about" class="hover:text-coral transition-colors">About</Link></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-cream/10 dark:border-ink/10 mt-8 pt-6 text-center text-sm text-warm-muted">
        <p>Built with VILT. Runs on caffeine & curiosity.</p>
      </div>
    </div>
  </footer>
</template>
