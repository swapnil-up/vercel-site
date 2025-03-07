<script setup>
import {ref} from 'vue'

const counter = ref(0)
setInterval(() => counter.value++, 1000)
</script>

<template>
        <h1 class="text-3xl font-bold">Swap's musings</h1>
        <p class="mt-4">Explore my latest articles, thoughts, and updates.</p>
        {{ counter }}
</template>
