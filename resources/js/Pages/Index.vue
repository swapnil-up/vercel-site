<script setup>
import { ref, onMounted } from 'vue'
import { Link } from '@inertiajs/vue3'
import ErrorMessageGenerator from '../Components/ErrorMessageGenerator.vue'
import Tamagotchi from '../Components/Tamagotchi.vue'

const quote = ref({
 quote: "Loading...",
 author: ""
})

const fetchRandomQuote = async () => {
 try {
 const response = await fetch('/data/quote/random')
 quote.value = await response.json()
 } catch (e) {
 console.error("Failed to fetch quote:", e)
 }
}

onMounted(() => {
 fetchRandomQuote()
})
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-12">
    <section class="mb-16 section-reveal hero-section">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 class="font-display text-5xl md:text-7xl font-bold tracking-tighter leading-none">
            Swap's<br>
            <span class="text-coral musings-underline">musings</span>
          </h1>
          <p class="text-lg text-warm-muted mt-4 max-w-md">
            Code, career, and curiosity — written in public.
          </p>
        </div>
        <div class="flex gap-3 shrink-0">
          <Link
            href="/posts"
            class="inline-flex items-center gap-1.5 bg-ink dark:bg-[#1C1C1E] text-white px-5 py-2.5 font-display font-bold text-sm hover:bg-coral transition-colors rounded-sm"
          >
            Read the blog
            <span class="text-lg leading-none">→</span>
          </Link>
          <a
            href="https://slides.swapnilupadhyay.com.np"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 border-2 border-ink text-ink px-5 py-2.5 font-display font-bold text-sm hover:bg-ink dark:hover:bg-[#1C1C1E] hover:text-white transition-colors rounded-sm"
          >
            Slides ↗
          </a>
        </div>
      </div>
    </section>

    <div class="mb-16 space-y-6 section-reveal quote-section">
      <div class="bg-mustard text-ink dark:text-[#1C1C1E] p-8 md:p-10 rounded-sm">
        <p class="font-display text-xs font-bold tracking-widest uppercase text-ink/50 dark:text-ink/70 mb-4">Random thought</p>
        <blockquote class="font-display text-2xl md:text-3xl font-bold leading-snug tracking-tight">
          "{{ quote.quote }}"
        </blockquote>
        <p v-if="quote.author" class="mt-4 text-ink/60 dark:text-ink/80 font-medium">— {{ quote.author }}</p>
      </div>
    </div>

    <section class="mb-16 section-reveal playground-section">
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-display text-3xl font-bold flex items-center gap-3">
          <span class="w-2 h-8 bg-coral rounded-sm inline-block"></span>
          Playground
        </h2>
        <Link href="/tools" class="text-sm font-medium text-coral hover:text-ink transition-colors">
          All Tools →
        </Link>
      </div>
      <div class="space-y-6">
        <div class="border-2 border-ink rounded-sm card-lift">
          <h3 class="font-display font-bold text-lg px-6 pt-6 pb-0">SeriousCLI</h3>
          <ErrorMessageGenerator />
        </div>
        <div class="border-2 border-ink rounded-sm card-lift">
          <h3 class="font-display font-bold text-lg px-6 pt-6 pb-0">Blobby</h3>
          <Tamagotchi />
        </div>
      </div>
    </section>
  </div>
</template>
