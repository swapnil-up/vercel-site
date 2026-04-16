<script setup>
import { ref, onMounted } from 'vue'
import { Link } from '@inertiajs/vue3'
import ErrorMessageGenerator from '../Components/ErrorMessageGenerator.vue'
import ClickerGame from '../Components/ClickerGame.vue'

const counter = ref(0)
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
  setInterval(() => counter.value++, 1000)
  fetchRandomQuote()
})
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="text-3xl font-bold">Swap's musings</h1>
    <p class="mt-4 text-gray-600">Explore my latest articles, thoughts, and updates.</p>
    
    <div class="mt-6 flex gap-6">
      <a href="https://slides.swapnilupadhyay.com.np" target="_blank" class="text-indigo-600 hover:text-indigo-800 font-medium">
        Slides ↗
      </a>
      <Link href="/tools" class="text-indigo-600 hover:text-indigo-800 font-medium">
        Tools →
      </Link>
      <Link href="/about" class="text-indigo-600 hover:text-indigo-800 font-medium">
        About →
      </Link>
    </div>
  
    <div class="mt-8 text-center">
      <blockquote class="text-xl italic text-gray-700">
        "{{ quote.quote }}"
      </blockquote>
      <p class="text-gray-500 mt-2">— {{ quote.author }}</p>
    </div>
    
    <p class="mt-8 text-gray-400 text-sm">Time since page load: {{ counter }} seconds</p>

    <ErrorMessageGenerator />

    <div class="mt-8">
      <ClickerGame />
    </div>
  </div>
</template>