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
const viewMode = ref('date')

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
  positive: { label: 'Good News', icon: '↑', accent: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/20', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 ring-1 ring-emerald-500/20' },
  negative: { label: 'Concerning', icon: '↓', accent: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500/20', dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 ring-1 ring-rose-500/20' },
  mixed: { label: 'Mixed', icon: '↕', accent: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 ring-1 ring-amber-500/20' },
  neutral: { label: 'Neutral', icon: '→', accent: 'text-slate-500 dark:text-slate-400', ring: 'ring-slate-500/20', dot: 'bg-slate-400', pill: 'bg-slate-50 text-slate-600 dark:bg-slate-950/40 dark:text-slate-300 ring-1 ring-slate-500/20' },
}

const allArticles = computed(() => props.articles.data || [])

const featuredArticle = computed(() => {
  if (allArticles.value.length === 0 || hasActiveFilters.value) return null
  return [...allArticles.value].sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0))[0]
})

const remainingArticles = computed(() => {
  if (!featuredArticle.value) return allArticles.value
  return allArticles.value.filter(a => a.id !== featuredArticle.value.id)
})

const groupedArticles = computed(() => {
  const groups = { positive: [], negative: [], mixed: [], neutral: [] }
  for (const article of remainingArticles.value) {
    const s = article.sentiment || 'neutral'
    if (groups[s]) groups[s].push(article)
    else groups.neutral.push(article)
  }
  return groups
})

const dateGroups = computed(() => {
  const groups = {}
  for (const article of allArticles.value) {
    const d = article.published_at ? new Date(article.published_at) : null
    const key = d ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown date'
    if (!groups[key]) groups[key] = { date: d, articles: [] }
    groups[key].articles.push(article)
  }
  return Object.values(groups).sort((a, b) => (b.date || 0) - (a.date || 0))
})

const stats = computed(() => ({
  total: allArticles.value.length,
  positive: allArticles.value.filter(a => a.sentiment === 'positive').length,
  negative: allArticles.value.filter(a => a.sentiment === 'negative').length,
  mixed: allArticles.value.filter(a => a.sentiment === 'mixed').length,
}))

const hasActiveFilters = computed(() => selectedCategory.value || selectedSource.value || selectedSentiment.value)

const filterParams = computed(() => {
  const params = new URLSearchParams()
  if (selectedCategory.value) params.set('category', selectedCategory.value)
  if (selectedSource.value) params.set('source', selectedSource.value)
  if (selectedSentiment.value) params.set('sentiment', selectedSentiment.value)
  return params.toString()
})

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

function formatDateFull(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function todayDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function importanceDots(score) {
  const filled = Math.round((score || 0) / 2)
  return Array.from({ length: 5 }, (_, i) => i < filled)
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-10">
    <!-- Masthead -->
    <header class="mb-8">
      <div class="flex items-end justify-between mb-1">
        <div>
          <h1 class="font-display text-5xl font-extrabold text-ink tracking-tight leading-none">
            Nepal News
          </h1>
          <p class="text-warm-muted text-sm mt-1.5 tracking-wide uppercase font-medium">
            {{ todayDate() }}
          </p>
        </div>
        <div class="hidden sm:flex items-center gap-4 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="text-warm-muted">{{ stats.positive }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            <span class="text-warm-muted">{{ stats.negative }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span class="text-warm-muted">{{ stats.mixed }}</span>
          </div>
          <div class="h-4 w-px bg-warm-border"></div>
          <span class="text-warm-muted font-medium">{{ stats.total }} articles</span>
        </div>
      </div>
      <div class="h-px bg-ink mt-4"></div>
      <div class="h-[3px] bg-ink mt-0.5"></div>
    </header>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2 mb-8">
      <button
        v-for="(config, sentiment) in sentimentConfig"
        :key="sentiment"
        @click="selectedSentiment = selectedSentiment === sentiment ? '' : sentiment; applyFilters()"
        :class="[
          'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200',
          selectedSentiment === sentiment
            ? config.pill
            : 'bg-warm-surface text-warm-muted ring-1 ring-warm-border hover:ring-ink/20',
        ]"
      >
        <span class="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" :class="config.dot"></span>
        {{ config.label }}
      </button>

      <span class="w-px h-4 bg-warm-border mx-1"></span>

      <!-- View mode toggle -->
      <div class="flex items-center bg-warm-surface ring-1 ring-warm-border rounded-full p-0.5">
        <button
          @click="viewMode = 'date'"
          :class="[
            'px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200',
            viewMode === 'date' ? 'bg-ink text-white shadow-sm' : 'text-warm-muted hover:text-ink',
          ]"
        >
          By Date
        </button>
        <button
          @click="viewMode = 'sentiment'"
          :class="[
            'px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200',
            viewMode === 'sentiment' ? 'bg-ink text-white shadow-sm' : 'text-warm-muted hover:text-ink',
          ]"
        >
          By Sentiment
        </button>
      </div>

      <span class="w-px h-4 bg-warm-border mx-1"></span>

      <select
        v-model="selectedCategory"
        @change="applyFilters"
        class="text-xs bg-warm-surface ring-1 ring-warm-border rounded-full px-3.5 py-1.5 text-warm-muted font-medium focus:outline-none focus:ring-2 focus:ring-coral/30 transition-all cursor-pointer appearance-none pr-7 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238B8076%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center]"
      >
        <option value="">All topics</option>
        <option v-for="cat in categories" :key="cat" :value="cat">
          {{ categoryIcons[cat] || '📋' }} {{ categoryLabels[cat] || cat }}
        </option>
      </select>

      <select
        v-model="selectedSource"
        @change="applyFilters"
        class="text-xs bg-warm-surface ring-1 ring-warm-border rounded-full px-3.5 py-1.5 text-warm-muted font-medium focus:outline-none focus:ring-2 focus:ring-coral/30 transition-all cursor-pointer appearance-none pr-7 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238B8076%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center]"
      >
        <option value="">All sources</option>
        <option v-for="src in sources" :key="src" :value="src">
          {{ src }}
        </option>
      </select>

      <button
        v-if="hasActiveFilters"
        @click="clearFilters"
        class="text-xs text-coral hover:text-coral/70 font-semibold transition-colors px-2 py-1.5"
      >
        ✕ Clear
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="allArticles.length === 0" class="text-center py-24">
      <div class="text-5xl mb-4">📰</div>
      <p class="text-ink text-xl font-display font-bold mb-1">No articles found</p>
      <p class="text-warm-muted text-sm">Try adjusting your filters or check back later</p>
    </div>

    <!-- Featured article -->
    <article
      v-if="featuredArticle && !hasActiveFilters"
      class="group mb-10 relative"
    >
      <div class="absolute inset-0 rounded-2xl bg-gradient-to-br from-coral/5 via-transparent to-sky/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div class="relative rounded-2xl ring-1 ring-warm-border bg-warm-surface p-8 transition-all duration-300 group-hover:ring-ink/15 group-hover:shadow-xl group-hover:shadow-ink/5">
        <div class="flex items-center gap-3 mb-4">
          <span :class="['inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest', sentimentConfig[featuredArticle.sentiment]?.accent || 'text-warm-muted']">
            <span class="w-2 h-2 rounded-full" :class="sentimentConfig[featuredArticle.sentiment]?.dot || 'bg-warm-muted'"></span>
            {{ sentimentConfig[featuredArticle.sentiment]?.label || 'Neutral' }}
          </span>
          <span class="text-warm-border">·</span>
          <span class="text-xs text-warm-muted font-medium">
            {{ categoryIcons[featuredArticle.category] }} {{ categoryLabels[featuredArticle.category] || featuredArticle.category }}
          </span>
          <span class="text-warm-border">·</span>
          <span class="text-xs text-warm-muted">{{ formatDate(featuredArticle.published_at) }}</span>
        </div>

        <h2 class="font-display text-3xl sm:text-4xl font-extrabold text-ink leading-tight mb-4 tracking-tight">
          <Link
            :href="`/nepal-news/${featuredArticle.slug}`"
            class="hover:text-coral transition-colors duration-200"
          >
            {{ featuredArticle.title }}
          </Link>
        </h2>

        <p v-if="featuredArticle.summary" class="text-warm-muted text-base leading-relaxed mb-6 max-w-3xl">
          {{ featuredArticle.summary }}
        </p>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-xs text-warm-muted font-medium">{{ featuredArticle.source }}</span>
            <Link
              :href="`/nepal-news/${featuredArticle.slug}`"
              class="text-xs font-semibold text-coral hover:text-coral/70 transition-colors"
            >
              Read more →
            </Link>
          </div>
          <div class="flex items-center gap-1">
            <div
              v-for="(filled, i) in importanceDots(featuredArticle.importance_score)"
              :key="i"
              :class="['w-1.5 h-1.5 rounded-full transition-colors', filled ? 'bg-coral' : 'bg-warm-border']"
            ></div>
          </div>
        </div>
      </div>
    </article>

    <!-- Sentiment sections -->
    <div v-if="allArticles.length > 0 && viewMode === 'sentiment'" class="space-y-10">
      <section
        v-for="(config, sentiment) in sentimentConfig"
        :key="sentiment"
        v-show="groupedArticles[sentiment]?.length > 0"
      >
        <!-- Section divider -->
        <div class="flex items-center gap-3 mb-5">
          <span class="w-2.5 h-2.5 rounded-full" :class="config.dot"></span>
          <h2 :class="['font-display text-sm font-bold uppercase tracking-widest', config.accent]">
            {{ config.label }}
          </h2>
          <span class="text-xs text-warm-muted font-medium tabular-nums">
            {{ groupedArticles[sentiment].length }}
          </span>
          <div class="flex-1 h-px bg-warm-border"></div>
        </div>

        <!-- Article cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="article in groupedArticles[sentiment]"
            :key="article.id"
            class="group relative"
          >
            <div class="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              :class="`bg-gradient-to-br ${sentiment === 'positive' ? 'from-emerald-500/10' : sentiment === 'negative' ? 'from-rose-500/10' : sentiment === 'mixed' ? 'from-amber-500/10' : 'from-slate-500/10'}`"
            ></div>
            <div class="relative h-full rounded-xl ring-1 ring-warm-border bg-warm-surface p-5 flex flex-col transition-all duration-300 group-hover:ring-ink/15 group-hover:shadow-lg group-hover:shadow-ink/5">
              <div class="absolute top-0 left-5 right-5 h-px" :class="config.dot.replace('bg-', 'bg-gradient-to-r from-transparent via-') + ' to-transparent opacity-40'"></div>

              <div class="flex items-center justify-between mb-3">
                <span class="text-[11px] font-semibold text-warm-muted uppercase tracking-wider">
                  {{ categoryIcons[article.category] || '📋' }} {{ categoryLabels[article.category] || article.category }}
                </span>
                <time class="text-[11px] text-warm-muted/60 tabular-nums">{{ formatDate(article.published_at) }}</time>
              </div>

              <h3 class="font-display text-base font-bold text-ink mb-2 leading-snug flex-none">
                <Link
                  :href="`/nepal-news/${article.slug}`"
                  class="hover:text-coral transition-colors duration-200"
                >
                  {{ article.title }}
                </Link>
              </h3>

              <p v-if="article.summary" class="text-warm-muted text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                {{ article.summary }}
              </p>
              <div v-else class="flex-1"></div>

              <div class="flex items-center justify-between pt-3 border-t border-warm-border/60">
                <span class="text-[11px] text-warm-muted/60 font-medium">{{ article.source }}</span>
                <div class="flex items-center gap-1">
                  <div
                    v-for="(filled, i) in importanceDots(article.importance_score)"
                    :key="i"
                    :class="['w-1 h-1 rounded-full', filled ? config.dot : 'bg-warm-border']"
                  ></div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <!-- Date group sections -->
    <div v-else-if="allArticles.length > 0 && viewMode === 'date'" class="space-y-10">
      <section
        v-for="(group, gi) in dateGroups"
        :key="gi"
      >
        <div class="flex items-center gap-3 mb-5">
          <h2 class="font-display text-sm font-bold uppercase tracking-widest text-ink">
            {{ group.articles[0] ? formatDateFull(group.date) : '' }}
          </h2>
          <span class="text-xs text-warm-muted font-medium tabular-nums">
            {{ group.articles.length }}
          </span>
          <div class="flex-1 h-px bg-warm-border"></div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="article in group.articles"
            :key="article.id"
            class="group relative"
          >
            <div class="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 from-coral/5 to-sky/5"></div>
            <div class="relative h-full rounded-xl ring-1 ring-warm-border bg-warm-surface p-5 flex flex-col transition-all duration-300 group-hover:ring-ink/15 group-hover:shadow-lg group-hover:shadow-ink/5">
              <div class="flex items-center justify-between mb-3">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                  <span class="w-1.5 h-1.5 rounded-full" :class="sentimentConfig[article.sentiment]?.dot || 'bg-warm-muted'"></span>
                  <span :class="sentimentConfig[article.sentiment]?.accent || 'text-warm-muted'">
                    {{ sentimentConfig[article.sentiment]?.label || 'Neutral' }}
                  </span>
                </span>
                <span class="text-[11px] font-semibold text-warm-muted uppercase tracking-wider">
                  {{ categoryIcons[article.category] || '📋' }} {{ categoryLabels[article.category] || article.category }}
                </span>
              </div>

              <h3 class="font-display text-base font-bold text-ink mb-2 leading-snug flex-none">
                <Link
                  :href="`/nepal-news/${article.slug}`"
                  class="hover:text-coral transition-colors duration-200"
                >
                  {{ article.title }}
                </Link>
              </h3>

              <p v-if="article.summary" class="text-warm-muted text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                {{ article.summary }}
              </p>
              <div v-else class="flex-1"></div>

              <div class="flex items-center justify-between pt-3 border-t border-warm-border/60">
                <span class="text-[11px] text-warm-muted/60 font-medium">{{ article.source }}</span>
                <div class="flex items-center gap-1">
                  <div
                    v-for="(filled, i) in importanceDots(article.importance_score)"
                    :key="i"
                    :class="['w-1 h-1 rounded-full', filled ? 'bg-coral' : 'bg-warm-border']"
                  ></div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <!-- Pagination -->
    <div v-if="articles.last_page > 1" class="flex justify-center items-center gap-1.5 mt-14 pt-8 border-t-2 border-ink/10">
      <Link
        v-for="page in articles.last_page"
        :key="page"
        :href="`/nepal-news?page=${page}${filterParams ? '&' + filterParams : ''}`"
        :class="[
          'w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200',
          page === articles.current_page
            ? 'bg-ink text-white shadow-md shadow-ink/20'
            : 'text-warm-muted hover:bg-warm-surface hover:ring-1 hover:ring-warm-border',
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
