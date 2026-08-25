<script setup>
import { ref, computed } from 'vue'
import { Link, router } from '@inertiajs/vue3'

const props = defineProps({
  articles: Object,
  categories: Array,
  sources: Array,
  filters: Object,
})

const selectedCategory = ref(props.filters.category || '')
const selectedSource = ref(props.filters.source || '')
const selectedDays = ref(props.filters.days || '')

const categoryLabels = {
  politics: 'Politics',
  business: 'Business',
  sports: 'Sports',
  culture: 'Culture',
  health: 'Health',
  technology: 'Technology',
  world: 'World',
  other: 'Other',
}

const categoryColors = {
  politics: 'bg-blue-100 text-blue-800',
  business: 'bg-emerald-100 text-emerald-800',
  sports: 'bg-orange-100 text-orange-800',
  culture: 'bg-purple-100 text-purple-800',
  health: 'bg-rose-100 text-rose-800',
  technology: 'bg-cyan-100 text-cyan-800',
  world: 'bg-amber-100 text-amber-800',
  other: 'bg-gray-100 text-gray-800',
}

const sentimentIcons = {
  positive: '↑',
  negative: '↓',
  neutral: '→',
  mixed: '↕',
}

function applyFilters() {
  const params = {}
  if (selectedCategory.value) params.category = selectedCategory.value
  if (selectedSource.value) params.source = selectedSource.value
  if (selectedDays.value) params.days = selectedDays.value

  router.get('/nepal-news', params, {
    preserveState: true,
    replace: true,
  })
}

function clearFilters() {
  selectedCategory.value = ''
  selectedSource.value = ''
  selectedDays.value = ''
  router.get('/nepal-news', {}, { replace: true })
}

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diffMs = now - d
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffHours < 48) return 'Yesterday'

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-12">
    <header class="mb-8">
      <h1 class="font-display text-4xl font-bold text-ink mb-2">
        Nepal News
      </h1>
      <p class="text-warm-muted">
        AI-aggregated news from Kathmandu Post — updated daily
      </p>
    </header>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-8">
      <select
        v-model="selectedCategory"
        @change="applyFilters"
        class="text-sm bg-warm-surface border border-warm-border rounded px-3 py-2 text-ink focus:outline-none focus:border-coral"
      >
        <option value="">All categories</option>
        <option v-for="cat in categories" :key="cat" :value="cat">
          {{ categoryLabels[cat] || cat }}
        </option>
      </select>

      <select
        v-model="selectedSource"
        @change="applyFilters"
        class="text-sm bg-warm-surface border border-warm-border rounded px-3 py-2 text-ink focus:outline-none focus:border-coral"
      >
        <option value="">All sources</option>
        <option v-for="src in sources" :key="src" :value="src">
          {{ src }}
        </option>
      </select>

      <select
        v-model="selectedDays"
        @change="applyFilters"
        class="text-sm bg-warm-surface border border-warm-border rounded px-3 py-2 text-ink focus:outline-none focus:border-coral"
      >
        <option value="">All time</option>
        <option value="1">Today</option>
        <option value="3">3 days</option>
        <option value="7">This week</option>
        <option value="30">This month</option>
      </select>

      <button
        v-if="selectedCategory || selectedSource || selectedDays"
        @click="clearFilters"
        class="text-sm text-coral hover:text-coral/80 transition-colors px-3 py-2"
      >
        Clear filters
      </button>
    </div>

    <!-- Articles -->
    <div v-if="articles.data.length === 0" class="text-center py-16 text-warm-muted">
      <p class="text-sm">No articles found. Try adjusting your filters.</p>
    </div>

    <div v-else class="space-y-6">
      <article
        v-for="article in articles.data"
        :key="article.id"
        class="border-b border-warm-border pb-6 last:border-b-0"
      >
        <div class="flex items-center gap-2 mb-2">
          <span
            :class="[
              'text-xs px-2 py-0.5 rounded font-medium',
              categoryColors[article.category] || categoryColors.other,
            ]"
          >
            {{ categoryLabels[article.category] || article.category }}
          </span>
          <span class="text-warm-muted text-xs">
            {{ article.source }}
          </span>
          <span class="text-warm-muted text-xs">
            {{ sentimentIcons[article.sentiment] }} {{ article.sentiment }}
          </span>
          <div class="flex-1" />
          <time class="text-xs text-warm-muted whitespace-nowrap">
            {{ formatDate(article.published_at) }}
          </time>
        </div>

        <h2 class="font-display text-xl font-bold text-ink mb-2">
          <Link
            :href="`/nepal-news/${article.slug}`"
            class="hover:text-coral transition-colors"
          >
            {{ article.title }}
          </Link>
          <a
            :href="article.source_url"
            target="_blank"
            rel="noopener"
            class="ml-2 text-xs text-warm-muted hover:text-coral transition-colors align-super"
          >
            ↗
          </a>
        </h2>

        <p v-if="article.summary" class="text-warm-muted text-sm leading-relaxed mb-3">
          {{ article.summary }}
        </p>

        <div v-if="article.keywords_json?.length" class="flex flex-wrap gap-1.5">
          <span
            v-for="keyword in article.keywords_json.slice(0, 5)"
            :key="keyword"
            class="text-xs px-2 py-0.5 bg-warm-surface border border-warm-border rounded text-warm-muted"
          >
            {{ keyword }}
          </span>
        </div>
      </article>
    </div>

    <!-- Pagination -->
    <div v-if="articles.last_page > 1" class="flex justify-center gap-2 mt-10">
      <Link
        v-for="page in articles.last_page"
        :key="page"
        :href="`/nepal-news?page=${page}`"
        :class="[
          'w-9 h-9 flex items-center justify-center rounded text-sm transition-colors',
          page === articles.current_page
            ? 'bg-ink text-white'
            : 'bg-warm-surface border border-warm-border text-warm-muted hover:border-coral hover:text-coral',
        ]"
      >
        {{ page }}
      </Link>
    </div>
  </div>
</template>
