<script setup>
import { computed } from 'vue'
import { Link } from '@inertiajs/vue3'

const props = defineProps({
  book: Object,
})

const statusLabels = {
  finished: 'Finished',
  reading: 'Reading',
  want: 'Want to read',
  abandoned: 'Set aside',
}

const statusStyles = {
  finished: 'bg-mint/15 text-ink border-mint/40',
  reading: 'bg-mustard/20 text-ink border-mustard/50',
  want: 'bg-sky/10 text-ink border-sky/30',
  abandoned: 'bg-warm-muted/10 text-warm-muted border-warm-border',
}

const stats = computed(() => {
  const raw = props.book?.stats || {}
  const items = [
    { label: 'Reading time', value: raw.total_read_time_label },
    { label: 'Pages read', value: raw.read_pages && raw.total_pages ? `${raw.read_pages} / ${raw.total_pages}` : raw.read_pages },
    { label: 'Reading days', value: raw.reading_days },
    { label: 'Sessions', value: raw.sessions },
    { label: 'Pages / day', value: raw.pages_per_day },
    { label: 'Pages / hour', value: raw.pages_per_hour },
    { label: 'Minutes / page', value: raw.minutes_per_page },
    { label: 'Highlights', value: raw.highlights },
    { label: 'Notes', value: raw.notes },
    { label: 'Language', value: raw.language },
    { label: 'Series', value: raw.series },
  ]

  return items.filter(item => item.value !== null && item.value !== undefined && item.value !== '')
})

const coverStyle = computed(() => {
  const source = `${props.book?.title || ''} ${props.book?.author || ''}`
  let hash = 0

  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash)
  }

  const hue = Math.abs(hash) % 360

  return {
    background: `linear-gradient(145deg, hsl(${hue} 45% 30%), hsl(${(hue + 45) % 360} 55% 16%))`,
  }
})

const initials = computed(() => (props.book?.title || '?')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(word => word[0])
  .join('')
  .toUpperCase())
</script>

<template>
  <div class="bg-cream min-h-screen">
    <article class="max-w-5xl mx-auto px-6 py-12">
      <Link href="/books" class="inline-flex items-center gap-2 text-warm-muted hover:text-coral transition-colors group mb-10">
        <span class="group-hover:-translate-x-1 transition-transform">←</span>
        Back to books
      </Link>

      <div class="grid gap-10 md:grid-cols-[220px_1fr] md:items-start">
        <div class="mx-auto w-40 md:w-full md:sticky md:top-24">
          <img
            v-if="book.cover_url"
            :src="book.cover_url"
            :alt="`Cover of ${book.title}`"
            class="w-full aspect-[2/3] object-cover rounded-sm border border-warm-border shadow-[6px_6px_0_0_var(--color-warm-border)]"
          />
          <div
            v-else
            class="w-full aspect-[2/3] rounded-sm border border-black/10 shadow-[6px_6px_0_0_var(--color-warm-border)] flex items-end p-4"
            :style="coverStyle"
          >
            <span class="font-display text-4xl font-bold text-white/80">{{ initials }}</span>
          </div>
        </div>

        <div>
          <header class="mb-8">
            <div class="flex flex-wrap items-center gap-3 mb-3">
              <span
                class="text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                :class="statusStyles[book.status] || statusStyles.finished"
              >
                {{ statusLabels[book.status] || book.status }}
              </span>
              <span v-if="book.finished_on" class="text-sm text-warm-muted">Finished {{ book.finished_on }}</span>
              <span v-else-if="book.started_on" class="text-sm text-warm-muted">Started {{ book.started_on }}</span>
            </div>

            <h1 class="font-display text-4xl md:text-5xl font-bold text-ink leading-tight tracking-tighter mb-2">
              {{ book.title }}
            </h1>

            <p v-if="book.author" class="text-xl text-warm-muted">{{ book.author }}</p>

            <div class="flex flex-wrap gap-2 mt-5">
              <span
                v-for="tag in book.tags"
                :key="tag"
                class="text-xs px-2.5 py-1 bg-coral/10 text-coral rounded-full"
              >
                {{ tag }}
              </span>
            </div>
          </header>

          <div v-if="book.recommended_by" class="mb-8 p-4 bg-sky/10 border border-sky/20 rounded-sm">
            <p class="text-[0.65rem] font-bold uppercase tracking-wider text-sky mb-1">Where it came from</p>
            <p class="text-ink leading-relaxed">{{ book.recommended_by }}</p>
          </div>

          <div v-if="book.started_on && book.finished_on" class="mb-8 flex items-center gap-3 text-sm text-warm-muted">
            <span>{{ book.started_on }}</span>
            <span class="flex-1 max-w-24 h-px bg-warm-border"></span>
            <span>{{ book.finished_on }}</span>
          </div>

          <div v-if="stats.length" class="mb-10 p-5 bg-warm-surface border border-warm-border rounded-sm">
            <h2 class="font-display text-sm font-bold uppercase tracking-wider text-warm-muted mb-4">Reading stats</h2>
            <dl class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div v-for="item in stats" :key="item.label">
                <dt class="text-[0.65rem] uppercase tracking-wider text-warm-muted mb-0.5">{{ item.label }}</dt>
                <dd class="font-display text-lg font-bold text-ink">{{ item.value }}</dd>
              </div>
            </dl>
          </div>

          <div v-if="book.thoughts_html" class="article-content max-w-none" v-html="book.thoughts_html" />
          <p v-else class="text-warm-muted italic">No notes on this one yet.</p>
        </div>
      </div>
    </article>
  </div>
</template>
