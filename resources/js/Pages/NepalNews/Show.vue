<script setup>
import { Link } from '@inertiajs/vue3'

const props = defineProps({
  article: Object,
})

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

const sentimentLabels = {
  positive: { icon: '↑', color: 'text-emerald-600' },
  negative: { icon: '↓', color: 'text-rose-600' },
  neutral: { icon: '→', color: 'text-warm-muted' },
  mixed: { icon: '↕', color: 'text-amber-600' },
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
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 py-12">
    <nav class="mb-6">
      <Link href="/nepal-news" class="text-sm text-coral hover:text-coral/80 transition-colors">
        ← Back to Nepal News
      </Link>
    </nav>

    <article>
      <!-- Meta -->
      <div class="flex items-center gap-2 mb-4">
        <span
          :class="[
            'text-xs px-2 py-0.5 rounded font-medium',
            categoryColors[article.category] || categoryColors.other,
          ]"
        >
          {{ article.category }}
        </span>
        <span class="text-warm-muted text-xs">{{ article.source }}</span>
        <div class="flex-1" />
        <time class="text-xs text-warm-muted">
          {{ formatDate(article.published_at) }}
        </time>
      </div>

      <!-- Title -->
      <h1 class="font-display text-3xl font-bold text-ink mb-4 leading-tight">
        {{ article.title }}
      </h1>

      <!-- Source link -->
      <a
        :href="article.source_url"
        target="_blank"
        rel="noopener"
        class="inline-block text-sm text-coral hover:text-coral/80 transition-colors mb-8"
      >
        Read original at {{ article.source }} →
      </a>

      <!-- AI Summary -->
      <div v-if="article.summary" class="bg-warm-surface border border-warm-border rounded-lg p-6 mb-8">
        <h2 class="text-sm font-semibold text-ink mb-2 uppercase tracking-wide">AI Summary</h2>
        <p class="text-warm-muted leading-relaxed">
          {{ article.summary }}
        </p>
      </div>

      <!-- Analysis Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-warm-surface border border-warm-border rounded-lg p-4">
          <div class="text-xs text-warm-muted mb-1">Sentiment</div>
          <div :class="['text-lg font-semibold', sentimentLabels[article.sentiment]?.color || 'text-warm-muted']">
            {{ sentimentLabels[article.sentiment]?.icon || '→' }}
            {{ article.sentiment }}
          </div>
        </div>
        <div class="bg-warm-surface border border-warm-border rounded-lg p-4">
          <div class="text-xs text-warm-muted mb-1">Importance</div>
          <div class="text-lg font-semibold text-ink">
            {{ article.importance_score }}/10
          </div>
        </div>
        <div class="bg-warm-surface border border-warm-border rounded-lg p-4">
          <div class="text-xs text-warm-muted mb-1">Processed</div>
          <div class="text-sm text-ink">
            {{ formatDateTime(article.processed_at) }}
          </div>
        </div>
        <div class="bg-warm-surface border border-warm-border rounded-lg p-4">
          <div class="text-xs text-warm-muted mb-1">Scraped</div>
          <div class="text-sm text-ink">
            {{ formatDateTime(article.scraped_at) }}
          </div>
        </div>
      </div>

      <!-- Entities -->
      <div v-if="article.entities_json?.length" class="mb-8">
        <h2 class="text-sm font-semibold text-ink mb-3 uppercase tracking-wide">Key Entities</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(entity, i) in article.entities_json"
            :key="i"
            class="text-sm px-3 py-1 bg-warm-surface border border-warm-border rounded-full"
          >
            <span class="text-warm-muted">{{ entity.type }}:</span>
            <span class="font-medium text-ink ml-1">{{ entity.name }}</span>
          </span>
        </div>
      </div>

      <!-- Keywords -->
      <div v-if="article.keywords_json?.length" class="mb-8">
        <h2 class="text-sm font-semibold text-ink mb-3 uppercase tracking-wide">Keywords</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="keyword in article.keywords_json"
            :key="keyword"
            class="text-sm px-3 py-1 bg-coral/10 text-coral rounded-full font-medium"
          >
            {{ keyword }}
          </span>
        </div>
      </div>

      <!-- Original Body -->
      <div v-if="article.body" class="mt-10 pt-8 border-t border-warm-border">
        <h2 class="text-sm font-semibold text-ink mb-4 uppercase tracking-wide">Original Article</h2>
        <div class="prose prose-warm max-w-none text-warm-muted leading-relaxed">
          <p>{{ article.body }}</p>
        </div>
      </div>
    </article>
  </div>
</template>
