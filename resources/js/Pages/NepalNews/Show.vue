<script setup>
import { Link } from '@inertiajs/vue3'

const props = defineProps({
  article: Object,
})

const categoryConfig = {
  politics: { icon: '🏛', color: 'bg-blue-50 text-blue-700 ring-blue-500/20 dark:bg-blue-950/40 dark:text-blue-300' },
  business: { icon: '📈', color: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300' },
  sports: { icon: '⚽', color: 'bg-orange-50 text-orange-700 ring-orange-500/20 dark:bg-orange-950/40 dark:text-orange-300' },
  culture: { icon: '🎭', color: 'bg-purple-50 text-purple-700 ring-purple-500/20 dark:bg-purple-950/40 dark:text-purple-300' },
  health: { icon: '🏥', color: 'bg-rose-50 text-rose-700 ring-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300' },
  technology: { icon: '💻', color: 'bg-cyan-50 text-cyan-700 ring-cyan-500/20 dark:bg-cyan-950/40 dark:text-cyan-300' },
  world: { icon: '🌏', color: 'bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-950/40 dark:text-amber-300' },
  other: { icon: '📋', color: 'bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-950/40 dark:text-slate-300' },
}

const sentimentConfig = {
  positive: { label: 'Good News', icon: '↑', accent: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  negative: { label: 'Concerning', icon: '↓', accent: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  mixed: { label: 'Mixed', icon: '↕', accent: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  neutral: { label: 'Neutral', icon: '→', accent: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
}

const entityTypeIcons = {
  person: '👤',
  organization: '🏢',
  location: '📍',
  event: '📅',
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDateTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function importanceDots(score) {
  const filled = Math.round((score || 0) / 2)
  return Array.from({ length: 5 }, (_, i) => i < filled)
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 py-10">
    <!-- Back nav -->
    <nav class="mb-8">
      <Link
        href="/nepal-news"
        class="inline-flex items-center gap-1.5 text-sm text-warm-muted hover:text-coral transition-colors duration-200 font-medium group"
      >
        <span class="inline-block transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
        Back to Nepal News
      </Link>
    </nav>

    <article>
      <!-- Article header -->
      <header class="mb-8">
        <!-- Meta row -->
        <div class="flex flex-wrap items-center gap-2.5 mb-5">
          <span
            :class="[
              'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ring-1',
              categoryConfig[article.category]?.color || categoryConfig.other.color,
            ]"
          >
            {{ categoryConfig[article.category]?.icon || '📋' }}
            {{ article.category }}
          </span>

          <span
            v-if="sentimentConfig[article.sentiment]"
            :class="['inline-flex items-center gap-1.5 text-xs font-semibold', sentimentConfig[article.sentiment].accent]"
          >
            <span class="w-2 h-2 rounded-full" :class="sentimentConfig[article.sentiment].dot"></span>
            {{ sentimentConfig[article.sentiment].label }}
          </span>

          <span class="text-warm-border">·</span>

          <span class="text-xs text-warm-muted font-medium">{{ article.source }}</span>
          <span class="text-warm-border">·</span>
          <time class="text-xs text-warm-muted">{{ formatDate(article.published_at) }}</time>
        </div>

        <!-- Title -->
        <h1 class="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-ink mb-5 leading-[1.15] tracking-tight">
          {{ article.title }}
        </h1>

        <!-- Source link -->
        <a
          :href="article.source_url"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1.5 text-sm text-coral hover:text-coral/70 font-semibold transition-colors duration-200 group"
        >
          Read original at {{ article.source }}
          <span class="inline-block transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </a>
      </header>

      <!-- Divider -->
      <div class="h-px bg-ink/10 mb-8"></div>

      <!-- AI Summary -->
      <div v-if="article.summary" class="relative mb-10">
        <div class="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-coral to-coral/30"></div>
        <div class="pl-6">
          <h2 class="text-[11px] font-bold text-coral uppercase tracking-widest mb-2.5">AI Summary</h2>
          <p class="text-ink text-lg leading-relaxed font-body">
            {{ article.summary }}
          </p>
        </div>
      </div>

      <!-- Analysis cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <div class="rounded-xl ring-1 ring-warm-border bg-warm-surface p-4 text-center">
          <div class="text-[11px] text-warm-muted uppercase tracking-wider font-semibold mb-2">Sentiment</div>
          <div class="flex items-center justify-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full" :class="sentimentConfig[article.sentiment]?.dot || 'bg-warm-muted'"></span>
            <span :class="['text-sm font-bold capitalize', sentimentConfig[article.sentiment]?.accent || 'text-warm-muted']">
              {{ article.sentiment || '—' }}
            </span>
          </div>
        </div>
        <div class="rounded-xl ring-1 ring-warm-border bg-warm-surface p-4 text-center">
          <div class="text-[11px] text-warm-muted uppercase tracking-wider font-semibold mb-2">Importance</div>
          <div class="flex items-center justify-center gap-1">
            <div
              v-for="(filled, i) in importanceDots(article.importance_score)"
              :key="i"
              :class="['w-2 h-2 rounded-full transition-colors', filled ? 'bg-coral' : 'bg-warm-border']"
            ></div>
          </div>
          <div class="text-xs text-warm-muted mt-1.5 font-medium tabular-nums">{{ article.importance_score }}/10</div>
        </div>
        <div class="rounded-xl ring-1 ring-warm-border bg-warm-surface p-4 text-center">
          <div class="text-[11px] text-warm-muted uppercase tracking-wider font-semibold mb-2">Processed</div>
          <div class="text-sm text-ink font-medium">{{ formatDateTime(article.processed_at) }}</div>
        </div>
        <div class="rounded-xl ring-1 ring-warm-border bg-warm-surface p-4 text-center">
          <div class="text-[11px] text-warm-muted uppercase tracking-wider font-semibold mb-2">Scraped</div>
          <div class="text-sm text-ink font-medium">{{ formatDateTime(article.scraped_at) }}</div>
        </div>
      </div>

      <!-- Entities -->
      <div v-if="article.entities_json?.length" class="mb-8">
        <h2 class="text-[11px] font-bold text-ink uppercase tracking-widest mb-3">Key Entities</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(entity, i) in article.entities_json"
            :key="i"
            class="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg ring-1 ring-warm-border bg-warm-surface"
          >
            <span class="text-sm">{{ entityTypeIcons[entity.type] || '📌' }}</span>
            <span class="text-warm-muted text-xs">{{ entity.type }}</span>
            <span class="font-semibold text-ink text-xs">{{ entity.name }}</span>
          </span>
        </div>
      </div>

      <!-- Keywords -->
      <div v-if="article.keywords_json?.length" class="mb-10">
        <h2 class="text-[11px] font-bold text-ink uppercase tracking-widest mb-3">Keywords</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="keyword in article.keywords_json"
            :key="keyword"
            class="text-sm px-3 py-1 rounded-lg bg-coral/8 text-coral font-semibold ring-1 ring-coral/15"
          >
            {{ keyword }}
          </span>
        </div>
      </div>

      <!-- Original Body -->
      <div v-if="article.body" class="mt-10 pt-8 border-t-2 border-ink/10">
        <h2 class="text-[11px] font-bold text-ink uppercase tracking-widest mb-5">Original Article</h2>
        <div class="prose prose-warm max-w-none">
          <p class="text-warm-muted leading-[1.8] text-[1.05rem]">{{ article.body }}</p>
        </div>
      </div>
    </article>
  </div>
</template>
