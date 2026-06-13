<script setup>
import { Link } from '@inertiajs/vue3'

const tools = [
  { name: 'Blobby', path: '/tools/tamagotchi', description: 'Virtual pet' },
  { name: 'Life Optimizer', path: '/tools/clicker', description: 'Click to optimize your life' },
  { name: 'SeriousCLI', path: '/tools/error-generator', description: 'Productivity terminal' },
  { name: 'Sketch', path: '/tools/sketch', description: 'Drawing canvas' },
  { name: 'Whisper', path: '/tools/whisper', description: 'Voice transcription' },
  { name: 'EMOM Timer', path: '/timer', description: 'Interval timer for workouts' },
  { name: 'RanTim', path: '/tools/rantim', description: 'Random timer' },
  { name: 'Bill Splitter', path: '/tools/bill-splitter', description: 'Split bills with friends' },
  { name: 'Rota Minutes', path: '/tools/rota-minutes', description: 'Generate meeting minutes PDFs' },
]
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-12">
      <h1 class="font-display text-4xl font-bold text-ink mb-6">
        Tools
      </h1>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          v-for="tool in tools"
          :key="tool.path"
          :href="tool.path"
          class="block p-6 border-2 border-warm-border bg-warm-surface rounded-lg hover:bg-cream/50 hover:border-coral transition-colors"
        >
          <h2 class="font-display text-xl font-bold text-ink mb-2">
            {{ tool.name }}
          </h2>
          <p class="text-warm-muted mt-2">
            {{ tool.description }}
          </p>
        </Link>
      </div>
    </div>
</template>