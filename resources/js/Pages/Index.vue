<script setup>
import { ref, onMounted } from 'vue'

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
  <h1 class="text-3xl font-bold">Swap's musings</h1>
  <p class="mt-4">Explore my latest articles, thoughts, and updates.</p>
  
  <div class="mt-8 text-center">
    <blockquote class="text-xl italic text-gray-700">
      "{{ quote.quote }}"
    </blockquote>
    <p class="text-gray-500 mt-2">- {{ quote.author }}</p>
  </div>
  
  <p class="mt-4 text-gray-400">Time since page load: {{ counter }} seconds</p>
</template>