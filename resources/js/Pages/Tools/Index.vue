<script setup>
const tools = [
  { name: 'Blobby', path: '/tools/tamagotchi', description: 'Virtual pet' },
  { name: 'Life Optimizer', path: '/tools/clicker', description: 'Click to optimize your life' },
  { name: 'SeriousCLI', path: '/tools/error-generator', description: 'Productivity terminal' },
  { name: 'Sketch', path: '/tools/sketch', description: 'Drawing canvas' },
  { name: 'Whisper', path: '/tools/whisper', description: 'Voice transcription' },
  { name: 'EMOM Timer', path: '/timer', description: 'Interval timer for workouts' },
  { name: 'RanTim', path: '/tools/rantim', description: 'Random timer' },
  { name: 'Bill Splitter', path: '/tools/bill-splitter', description: 'Split bills with friends' },
]
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">Tools</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <a
        v-for="tool in tools"
        :key="tool.path"
        :href="tool.path"
        class="block p-6 border rounded-lg hover:bg-gray-50 transition"
      >
        <h2 class="text-xl font-semibold">{{ tool.name }}</h2>
        <p class="text-gray-600 mt-2">{{ tool.description }}</p>
      </a>
    </div>
  </div>
</template>