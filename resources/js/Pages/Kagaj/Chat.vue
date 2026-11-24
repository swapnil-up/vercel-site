<script setup lang="ts">
import { ref, onMounted } from 'vue';
import KagajChat from '@/Components/KagajChat.vue';

const KAGAJ_API = 'https://kagaj.swapnilupadhyay.com.np/api';
const availableDatasets = ref<string[]>([]);

async function fetchDatasets() {
  try {
    const resp = await fetch(`${KAGAJ_API}/datasets`);
    const data = await resp.json();
    availableDatasets.value = data.datasets?.map((d: any) => d.id) || [];
  } catch (e) {
    console.warn('Failed to fetch datasets', e);
  }
}

onMounted(() => {
  fetchDatasets();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-slate-950">
    <header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div class="max-w-4xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="font-display text-3xl font-bold text-slate-900 dark:text-white">Kagaj Chat</h1>
            <p class="mt-1 text-slate-600 dark:text-slate-400">
              Ask questions across Nepali government datasets. Filter by dataset or search all.
            </p>
          </div>
          <a href="/kagaj" class="text-sm text-coral-600 hover:underline">← Browse Datasets</a>
        </div>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-8">
      <KagajChat />
    </main>

    <footer class="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-12">
      <div class="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>Powered by <a href="https://github.com/swapnil-up/kagaj" class="underline hover:text-coral-600">Kagaj</a> — Open extraction of Nepali government documents.</p>
        <p class="mt-1">Uses Cloudflare Workers AI (BGE-m3 embeddings, Llama 3.3 70B) + Vectorize.</p>
      </div>
    </footer>
  </div>
</template>