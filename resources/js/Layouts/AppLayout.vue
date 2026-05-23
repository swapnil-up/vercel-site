<script setup>
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import Navbar from '@/Components/Navbar.vue';
import Footer from '@/Components/Footer.vue';

const key = computed(() => usePage().url)
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />
    <main class="flex-1">
      <Transition name="page">
        <div :key="key">
          <slot />
        </div>
      </Transition>
    </main>
    <Footer />
  </div>
</template>