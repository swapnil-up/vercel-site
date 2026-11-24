<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Link } from '@inertiajs/vue3';

interface Dataset {
  id: string;
  title: string;
  description: string;
  status: string;
  grain: string;
  coverage: { start: string; end: string; note?: string };
  sources: Array<{ name: string; url: string }>;
  verification: { status: string; method: string; report?: string };
  license: { code: string; data: string };
  tags: string[];
  freshness: { fingerprints: string[]; commit: string };
  artifact_count: number;
}

const datasets = ref<Dataset[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const KAGAJ_API = 'https://kagaj.swapnilupadhyay.com.np/api';

async function fetchDatasets() {
  try {
    const resp = await fetch(`${KAGAJ_API}/datasets`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    datasets.value = data.datasets || [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load datasets';
  } finally {
    loading.value = false;
  }
}

function formatCoverage(c: Dataset['coverage']): string {
  return `${c.start} – ${c.end}${c.note ? ` (${c.note})` : ''}`;
}

function formatDate(iso?: string): string {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    experimental: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    shipped: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return badges[status] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
}

onMounted(() => {
  fetchDatasets();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-slate-950">
    <!-- Hero -->
    <header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div class="max-w-3xl">
          <h1 class="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Kagaj Datasets
          </h1>
          <p class="text-lg text-slate-600 dark:text-slate-300 mb-6">
            Open, structured data extracted from Nepali government PDFs. Each dataset includes provenance, verification methods, and reproducible builds.
          </p>
          <div class="flex flex-wrap gap-3">
            <Link 
              href="/kagaj/chat" 
              class="inline-flex items-center px-4 py-2 bg-coral-600 text-white rounded-lg hover:bg-coral-700 transition-colors font-medium"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Ask a Question
            </Link>
            <a 
              href="https://github.com/swapnil-up/kagaj" 
              target="_blank" 
              rel="noopener noreferrer"
              class="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
            >
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- Dataset Grid -->
    <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-10 w-10 border-3 border-coral-600 border-t-transparent"></div>
      </div>

      <div v-else-if="error" class="text-center py-12 text-red-600 dark:text-red-400">
        <p class="font-medium">Failed to load datasets</p>
        <p class="text-sm mt-1">{{ error }}</p>
        <button @click="fetchDatasets" class="mt-4 text-coral-600 hover:underline">Retry</button>
      </div>

      <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article 
          v-for="ds in datasets" 
          :key="ds.id"
          class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
        >
          <div class="p-6">
            <div class="flex items-start justify-between mb-3">
              <h2 class="font-display text-xl font-bold text-slate-900 dark:text-white">{{ ds.title }}</h2>
              <span :class="['px-2 py-0.5 text-xs font-medium rounded-full', getStatusBadge(ds.status)]">
                {{ ds.status }}
              </span>
            </div>

            <p class="text-slate-600 dark:text-slate-300 text-sm mb-4 line-clamp-3">{{ ds.description }}</p>

            <dl class="space-y-3 text-sm mb-4">
              <div>
                <dt class="font-medium text-slate-500 dark:text-slate-400">Grain</dt>
                <dd class="text-slate-700 dark:text-slate-300">{{ ds.grain }}</dd>
              </div>
              <div>
                <dt class="font-medium text-slate-500 dark:text-slate-400">Coverage</dt>
                <dd class="text-slate-700 dark:text-slate-300">{{ formatCoverage(ds.coverage) }}</dd>
              </div>
              <div>
                <dt class="font-medium text-slate-500 dark:text-slate-400">Artifacts</dt>
                <dd class="text-slate-700 dark:text-slate-300">{{ ds.artifact_count }} files</dd>
              </div>
              <div>
                <dt class="font-medium text-slate-500 dark:text-slate-400">Last Build</dt>
                <dd class="text-slate-700 dark:text-slate-300 font-mono text-xs">{{ ds.freshness.commit ? ds.freshness.commit.slice(0, 8) : '—' }}</dd>
              </div>
            </dl>

            <div class="flex flex-wrap gap-1.5 mb-4" v-if="ds.tags.length">
              <span 
                v-for="tag in ds.tags.slice(0, 5)" 
                :key="tag"
                class="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded"
              >
                {{ tag }}
              </span>
            </div>

            <div class="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Link 
                :href="`/kagaj/${ds.id}`"
                class="text-sm font-medium text-coral-600 dark:text-coral-400 hover:underline flex-1"
              >
                Explore →
              </Link>
              <a 
                v-if="ds.sources[0]?.url"
                :href="ds.sources[0].url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Source
              </a>
            </div>
          </div>
        </article>
      </div>

      <div v-if="!loading && !error && datasets.length === 0" class="text-center py-12 text-slate-500">
        No datasets found.
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-12">
      <div class="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>Data from <a href="https://github.com/swapnil-up/kagaj" class="underline hover:text-coral-600">Kagaj</a> — Open extraction of Nepali government documents.</p>
        <p class="mt-1">Methodology: <a href="https://github.com/swapnil-up/kagaj/blob/main/docs/architecture.md" class="underline hover:text-coral-600">architecture.md</a> · Verification: <a href="https://github.com/swapnil-up/kagaj/blob/main/docs/data-integrity.md" class="underline hover:text-coral-600">data-integrity.md</a></p>
      </div>
    </footer>
  </div>
</template>