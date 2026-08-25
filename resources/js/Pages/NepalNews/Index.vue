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
const selectedSentiment = ref(props.filters.sentiment || '')

const categoryLabels = {
  politics: 'Politics',
  business: 'Business',
  sports: 'Sports',
  culture: 'Culture',
  health: 'Health',
  technology: 'Tech',
  world: 'World',
  other: 'Other',
}

const categoryIcons = {
  politics: '🏛',
  business: '📈',
  sports: '⚽',
  culture: '🎭',
  health: '🏥',
  technology: '💻',
  world: '🌏',
  other: '📋',
}

const sentimentConfig = {
  positive: { label: 'Good News', icon: '↑', color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  negative: { label: 'Concerning', icon: '↓', color: 'rose', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200' },
  mixed: { label: 'Mixed', icon: '↕', color: 'amber', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  neutral: { label: 'Neutral', icon: '→', color: 'slate', bg: 'bg-slate-50 dark:bg-slate-950/30', border: 'border-slate-200 dark:border-slate-800', text: 'text-slate-700 dark:text-slate-300', badge: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200' },
}

const allArticles = computed(() => props.articles.data || [])

const groupedArticles = computed(() => {
  const groups = { positive: [], negative: [], mixed: [], neutral: [] }
  for (const article of allArticles.value) {
    const s = article.sentiment || 'neutral'
    if (groups[s]) groups[s].push(article)
    else groups.neutral.push(article)
  }
  return groups
})

const stats = computed(() => ({
  total: allArticles.value.length,
  positive: groupedArticles.value.positive.length,
  negative: groupedArticles.value.negative.length,
  mixed: groupedArticles.value.mixed.length,
}))

function applyFilters() {
  const params = {}
  if (selectedCategory.value) params.category = selectedCategory.value
  if (selectedSource.value) params.source = selectedSource.value
  if (selectedSentiment.value) params.sentiment = selectedSentiment.value
  router.get('/nepal-news', params, { preserveState: true, replace: true })
}

function clearFilters() {
  selectedCategory.value = ''
  selectedSource.value = ''
  selectedSentiment.value = ''
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

function todayDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-12">
    <!-- Hero -->
    <header class="mb-10">
      <div class="flex items-baseline gap-3 mb-1">
        <h1 class="font-display text-4xl font-bold text-ink">
          Nepal News
        </h1>
        <span class="text-warm-muted text-sm">·</span>
        <time class="text-sm text-warm-muted">{{ todayDate() }}</time>
      </div>
      <p class="text-warm-muted text-sm">
        {{ stats.total }} articles
        <span v-if="stats.positive" class="text-emerald-600 dark:text-emerald-400"> · {{ stats.positive }} good</span>
        <span v-if="stats.negative" class="text-rose-600 dark:text-rose-400"> · {{ stats.negative }} concerning</span>
        <span v-if="stats.mixed" class="text-amber-600 dark:text-amber-400"> · {{ stats.mixed }} mixed</span>
      </p>
    </header>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2 mb-10">
      <!-- Sentiment pills -->
      <button
        v-for="(config, sentiment) in sentimentConfig"
        :key="sentiment"
        @click="selectedSentiment = selectedSentiment === sentiment ? '' : sentiment; applyFilters()"
        :class="[
          'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
          selectedSentiment === sentiment
            ? `${config.bg} ${config.border} ${config.text}`
            : 'bg-warm-surface border-warm-border text-warm-muted hover:border-ink/30',
        ]"
      >
        {{ config.icon }} {{ config.label }}
      </button>

      <span class="w-px h-4 bg-warm-border mx-1"></span>

      <!-- Category select -->
      <select
        v-model="selectedCategory"
        @change="applyFilters"
        class="text-xs bg-warm-surface border border-warm-border rounded-full px-3 py-1.5 text-warm-muted focus:outline-none focus:border-coral transition-colors cursor-pointer"
      >
        <option value="">All topics</option>
        <option v-for="cat in categories" :key="cat" :value="cat">
          {{ categoryIcons[cat] || '📋' }} {{ categoryLabels[cat] || cat }}
        </option>
      </select>

      <!-- Source select -->
      <select
        v-model="selectedSource"
        @change="applyFilters"
        class="text-xs bg-warm-surface border border-warm-border rounded-full px-3 py-1.5 text-warm-muted focus:outline-none focus:border-coral transition-colors cursor-pointer"
      >
        <option value="">All sources</option>
        <option v-for="src in sources" :key="src" :value="src">
          {{ src }}
        </option>
      </select>

      <button
        v-if="selectedCategory || selectedSource || selectedSentiment"
        @click="clearFilters"
        class="text-xs text-coral hover:text-coral/80 transition-colors px-2 py-1.5"
      >
        ✕ Clear
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="allArticles.length === 0" class="text-center py-20">
      <p class="text-warm-muted text-lg mb-2">No articles found</p>
      <p class="text-warm-muted/60 text-sm">Try adjusting your filters or check back later</p>
    </div>

    <!-- Sentiment sections -->
    <div v-else class="space-y-12">
      <section
        v-for="(config, sentiment) in sentimentConfig"
        :key="sentiment"
        v-show="groupedArticles[sentiment]?.length > 0"
      >
        <!-- Section header -->
        <div class="flex items-center gap-3 mb-5">
          <span :class="['text-lg', config.text]">{{ config.icon }}</span>
          <h2 :class="['font-display text-lg font-bold', config.text]">
            {{ config.label }}
          </h2>
          <span :class="['text-xs px-2 py-0.5 rounded-full font-medium', config.badge]">
            {{ groupedArticles[sentiment].length }}
          </span>
          <div class="flex-1 h-px" :class="config.border"></div>
        </div>

        <!-- Article cards -->
        <div class="grid gap-4" :class="sentiment === 'positive' ? 'md:grid-cols-2' : ''">
          <article
            v-for="article in groupedArticles[sentiment]"
            :key="article.id"
            :class="[
              'group rounded-xl border p-5 transition-all hover:shadow-lg hover:-translate-y-0.5',
              config.bg, config.border,
            ]"
          >
            <!-- Top row: category + time -->
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-medium opacity-70">
                {{ categoryIcons[article.category] || '📋' }} {{ categoryLabels[article.category] || article.category }}
              </span>
              <time class="text-xs opacity-50">{{ formatDate(article.published_at) }}</time>
            </div>

            <!-- Title -->
            <h3 class="font-display text-lg font-bold text-ink mb-2 leading-snug">
              <Link
                :href="`/nepal-news/${article.slug}`"
                class="hover:text-coral transition-colors"
              >
                {{ article.title }}
              </Link>
            </h3>

            <!-- Summary -->
            <p v-if="article.summary" class="text-warm-muted text-sm leading-relaxed mb-4 line-clamp-3">
              {{ article.summary }}
            </p>

            <!-- Bottom row: source + importance -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-warm-muted/60">{{ article.source }}</span>
              <div class="flex items-center gap-1">
                <div
                  v-for="i in 5"
                  :key="i"
                  :class="[
                    'w-1.5 h-1.5 rounded-full',
                    i <= Math.round(article.importance_score / 2)
                      ? config.text.replace('text-', 'bg-')
                      : 'bg-warm-border',
                  ]"
                ></div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <!-- Pagination -->
    <div v-if="articles.last_page > 1" class="flex justify-center gap-2 mt-12 pt-8 border-t border-warm-border">
      <Link
        v-for="page in articles.last_page"
        :key="page"
        :href="`/nepal-news?page=${page}`"
        :class="[
          'w-9 h-9 flex items-center justify-center rounded-full text-sm transition-all',
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

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
