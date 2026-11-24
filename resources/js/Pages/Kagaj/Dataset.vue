<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { usePage } from '@inertiajs/vue3';
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
  pipeline: { package: string; cli: string; plan?: string };
  license: { code: string; data: string };
  tags: string[];
  notes: string[];
  docs: string[];
  inventories: string[];
  freshness: { fingerprints: string[]; commit: string };
  artifacts: Array<{ path: string; role: string; format: string; bytes: number; columns?: string[]; sha256: string; description?: string }>;
}

const page = usePage();
const datasetId = page.props.id as string;

const dataset = ref<Dataset | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const activeTab = ref<'overview' | 'artifacts' | 'verification' | 'chat'>('overview');

const KAGAJ_API = 'https://kagaj.swapnilupadhyay.com.np/api';

async function fetchDataset() {
  try {
    const resp = await fetch(`${KAGAJ_API}/datasets`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const ds = data.datasets?.find((d: Dataset) => d.id === datasetId);
    if (ds) {
      // Fetch full dataset details from the manifest
      const manifestResp = await fetch('https://raw.githubusercontent.com/swapnil-up/kagaj/main/datasets/index.json');
      if (manifestResp.ok) {
        const manifest = await manifestResp.json();
        const fullDs = manifest.datasets.find((d: any) => d.id === datasetId);
        if (fullDs) dataset.value = fullDs;
        else dataset.value = ds;
      } else {
        dataset.value = ds;
      }
    } else {
      error.value = 'Dataset not found';
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load dataset';
  } finally {
    loading.value = false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  fetchDataset();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-slate-950">
    <!-- Header -->
    <header v-if="dataset" class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link href="/kagaj" class="text-sm text-slate-500 dark:text-slate-400 hover:text-coral-600 mb-2 inline-block">
              ← All Datasets
            </Link>
            <div class="flex items-center gap-3">
              <h1 class="font-display text-3xl font-bold text-slate-900 dark:text-white">{{ dataset.title }}</h1>
              <span :class="['px-3 py-1 text-sm font-medium rounded-full', getStatusBadge(dataset.status)]">
                {{ dataset.status }}
              </span>
            </div>
            <p class="mt-2 text-slate-600 dark:text-slate-300 max-w-3xl">{{ dataset.description }}</p>
          </div>
          <div class="flex items-center gap-3">
            <a 
              v-if="dataset.sources[0]?.url"
              :href="dataset.sources[0].url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-coral-600 dark:text-coral-400 hover:underline"
            >
              View Source
            </a>
            <a 
              :href="`https://github.com/swapnil-up/kagaj/tree/main/datasets/${dataset.id}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-slate-500 dark:text-slate-400 hover:text-coral-600"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- Loading/Error -->
    <div v-if="loading" class="max-w-6xl mx-auto px-4 py-12 flex justify-center">
      <div class="animate-spin rounded-full h-10 w-10 border-3 border-coral-600 border-t-transparent"></div>
    </div>

    <div v-else-if="error" class="max-w-6xl mx-auto px-4 py-12 text-center text-red-600">
      <p class="font-medium">{{ error }}</p>
    </div>

    <!-- Content -->
    <main v-else-if="dataset" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Tabs -->
      <div class="border-b border-slate-200 dark:border-slate-700 mb-8">
        <nav class="flex gap-8" aria-label="Dataset sections">
          <button 
            v-for="tab in ['overview', 'artifacts', 'verification', 'chat']" 
            :key="tab"
            @click="activeTab = tab"
            :class="[
              'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab 
                ? 'border-coral-600 text-coral-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            ]"
          >
            {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
          </button>
        </nav>
      </div>

      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="space-y-8">
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <dl class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <dt class="font-medium text-slate-500 dark:text-slate-400">Grain</dt>
            <dd class="mt-1 text-slate-900 dark:text-white">{{ dataset.grain }}</dd>
          </dl>
          <dl class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <dt class="font-medium text-slate-500 dark:text-slate-400">Coverage</dt>
            <dd class="mt-1 text-slate-900 dark:text-white">{{ dataset.coverage.start }} – {{ dataset.coverage.end }}
              <span v-if="dataset.coverage.note" class="text-slate-500 dark:text-slate-400 ml-2">({{ dataset.coverage.note }})</span>
            </dd>
          </dl>
          <dl class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <dt class="font-medium text-slate-500 dark:text-slate-400">Artifacts</dt>
            <dd class="mt-1 text-slate-900 dark:text-white">{{ dataset.artifacts.length }} files</dd>
          </dl>
          <dl class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 sm:col-span-2 lg:col-span-3">
            <dt class="font-medium text-slate-500 dark:text-slate-400">Sources</dt>
            <dd class="mt-1">
              <ul class="space-y-1">
                <li v-for="s in dataset.sources" :key="s.url" class="text-slate-700 dark:text-slate-300">
                  <a :href="s.url" target="_blank" rel="noopener noreferrer" class="text-coral-600 hover:underline">{{ s.name }}</a>
                </li>
              </ul>
            </dd>
          </dl>
          <dl class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <dt class="font-medium text-slate-500 dark:text-slate-400">License (Code)</dt>
            <dd class="mt-1 text-slate-900 dark:text-white">{{ dataset.license.code }}</dd>
          </dl>
          <dl class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <dt class="font-medium text-slate-500 dark:text-slate-400">License (Data)</dt>
            <dd class="mt-1 text-slate-900 dark:text-white">{{ dataset.license.data }}</dd>
          </dl>
          <dl class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 sm:col-span-2 lg:col-span-3">
            <dt class="font-medium text-slate-500 dark:text-slate-400">Pipeline</dt>
            <dd class="mt-1 space-y-1">
              <p class="text-slate-700 dark:text-slate-300"><strong>Package:</strong> {{ dataset.pipeline.package }}</p>
              <p class="text-slate-700 dark:text-slate-300 font-mono text-sm">{{ dataset.pipeline.cli }}</p>
              <p v-if="dataset.pipeline.plan" class="text-slate-700 dark:text-slate-300"><strong>Plan:</strong> {{ dataset.pipeline.plan }}</p>
            </dd>
          </dl>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6" v-if="dataset.notes.length">
          <h3 class="font-display text-lg font-bold text-slate-900 dark:text-white mb-3">Notes</h3>
          <ul class="space-y-2 text-slate-700 dark:text-slate-300">
            <li v-for="(note, i) in dataset.notes" :key="i" class="flex items-start gap-2">
              <span class="text-coral-600">•</span>
              {{ note }}
            </li>
          </ul>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6" v-if="dataset.docs.length">
          <h3 class="font-display text-lg font-bold text-slate-900 dark:text-white mb-3">Documentation</h3>
          <ul class="space-y-1">
            <li v-for="doc in dataset.docs" :key="doc">
              <a :href="`https://github.com/swapnil-up/kagaj/blob/main/datasets/${dataset.id}/${doc}`" target="_blank" rel="noopener noreferrer" class="text-coral-600 hover:underline">{{ doc }}</a>
            </li>
          </ul>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6" v-if="dataset.inventories.length">
          <h3 class="font-display text-lg font-bold text-slate-900 dark:text-white mb-3">Inventories</h3>
          <ul class="space-y-1">
            <li v-for="inv in dataset.inventories" :key="inv">
              <a :href="`https://github.com/swapnil-up/kagaj/blob/main/${inv}`" target="_blank" rel="noopener noreferrer" class="text-coral-600 hover:underline">{{ inv }}</a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Artifacts Tab -->
      <div v-if="activeTab === 'artifacts'" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table class="w-full">
          <thead class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th class="text-left p-4 font-medium text-slate-700 dark:text-slate-300">Path</th>
              <th class="text-left p-4 font-medium text-slate-700 dark:text-slate-300">Role</th>
              <th class="text-left p-4 font-medium text-slate-700 dark:text-slate-300">Format</th>
              <th class="text-right p-4 font-medium text-slate-700 dark:text-slate-300">Size</th>
              <th class="text-left p-4 font-medium text-slate-700 dark:text-slate-300">SHA256</th>
              <th class="text-left p-4 font-medium text-slate-700 dark:text-slate-300">Description</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
            <tr v-for="a in dataset.artifacts" :key="a.path" class="hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <td class="p-4 font-mono text-sm text-slate-900 dark:text-white">{{ a.path }}</td>
              <td class="p-4 text-sm text-slate-700 dark:text-slate-300">
                <span class="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 rounded">{{ a.role }}</span>
              </td>
              <td class="p-4 text-sm text-slate-700 dark:text-slate-300 font-mono">{{ a.format }}</td>
              <td class="p-4 text-sm text-right text-slate-700 dark:text-slate-300">{{ formatBytes(a.bytes) }}</td>
              <td class="p-4 text-sm text-slate-500 dark:text-slate-400 font-mono">{{ a.sha256.slice(0, 16) }}…</td>
              <td class="p-4 text-sm text-slate-700 dark:text-slate-300">{{ a.description || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Verification Tab -->
      <div v-if="activeTab === 'verification'" class="space-y-6">
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 class="font-display text-lg font-bold text-slate-900 dark:text-white mb-3">Verification Status</h3>
          <dl class="space-y-4">
            <div>
              <dt class="font-medium text-slate-500 dark:text-slate-400">Status</dt>
              <dd class="mt-1">
                <span :class="['px-3 py-1 text-sm font-medium rounded-full', getStatusBadge(dataset.verification.status)]">
                  {{ dataset.verification.status }}
                </span>
              </dd>
            </div>
            <div>
              <dt class="font-medium text-slate-500 dark:text-slate-400">Method</dt>
              <dd class="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{{ dataset.verification.method }}</dd>
            </div>
            <div v-if="dataset.verification.report">
              <dt class="font-medium text-slate-500 dark:text-slate-400">Report</dt>
              <dd class="mt-1">
                <a :href="`https://github.com/swapnil-up/kagaj/blob/main/datasets/${dataset.id}/${dataset.verification.report}`" target="_blank" rel="noopener noreferrer" class="text-coral-600 hover:underline">{{ dataset.verification.report }}</a>
              </dd>
            </div>
          </dl>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 class="font-display text-lg font-bold text-slate-900 dark:text-white mb-3">Freshness</h3>
          <dl class="space-y-2">
            <div class="grid grid-cols-2 gap-4">
              <dt class="font-medium text-slate-500 dark:text-slate-400">Build Commit</dt>
              <dd class="text-slate-900 dark:text-white font-mono text-sm">{{ dataset.freshness.commit || '—' }}</dd>
              <dt class="font-medium text-slate-500 dark:text-slate-400">Fingerprints</dt>
              <dd class="text-slate-900 dark:text-white font-mono text-sm">{{ dataset.freshness.fingerprints.join(', ') || '—' }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Chat Tab -->
      <div v-if="activeTab === 'chat'" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <KagajChat :dataset-id="dataset.id" :dataset-title="dataset.title" />
      </div>
    </main>
  </div>
</template>