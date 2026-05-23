<script setup>
import { ref, onMounted } from 'vue';
import { Link } from '@inertiajs/vue3';

const nowContent = ref('');

const fetchNowContent = async () => {
  try {
    const response = await fetch('/data/now');
    const data = await response.json();
    nowContent.value = data.content;
  } catch (error) {
    console.error('Failed to load now page content:', error);
    nowContent.value = '<p>Loading...</p>';
  }
};

onMounted(() => {
  fetchNowContent();
});
</script>

<template>
  <div class="bg-cream min-h-screen">
    <article class="max-w-4xl mx-auto px-6 py-12">
      <header class="mb-10">
        <Link href="/" class="inline-flex items-center gap-2 text-warm-muted hover:text-coral transition-colors mb-4 group">
          <span class="group-hover:-translate-x-1 transition-transform">←</span>
          Home
        </Link>
        <h1 class="font-display text-5xl font-bold text-ink mb-2 tracking-tighter">
          Now
        </h1>
        <p class="text-lg text-warm-muted">
          What I'm currently focused on
        </p>
      </header>

      <div class="article-content max-w-none" v-html="nowContent" />
    </article>
  </div>
</template>
