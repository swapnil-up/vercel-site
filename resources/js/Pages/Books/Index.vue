<script setup>
import { computed, ref } from 'vue'
import { Link } from '@inertiajs/vue3'
import Fuse from 'fuse.js'

const props = defineProps({
  books: { type: Array, default: () => [] },
})

const query = ref('')
const status = ref('all')

const statuses = [
  { value: 'all', label: 'All' },
  { value: 'finished', label: 'Finished' },
  { value: 'reading', label: 'Reading' },
  { value: 'want', label: 'Want to read' },
  { value: 'abandoned', label: 'Set aside' },
]

const statusStyles = {
  finished: 'bg-mint/15 text-ink border-mint/40',
  reading: 'bg-mustard/20 text-ink border-mustard/50',
  want: 'bg-sky/10 text-ink border-sky/30',
  abandoned: 'bg-warm-muted/10 text-warm-muted border-warm-border',
}

const fuse = computed(() => new Fuse(props.books, {
  keys: [
    { name: 'title', weight: 0.45 },
    { name: 'author', weight: 0.3 },
    { name: 'tags', weight: 0.15 },
    { name: 'excerpt', weight: 0.1 },
  ],
  threshold: 0.4,
  includeScore: true,
}))

const filteredBooks = computed(() => {
  let list = props.books

  if (status.value !== 'all') {
    list = list.filter(book => book.status === status.value)
  }

  if (query.value.trim()) {
    list = fuse.value.search(query.value).map(result => result.item)
      .filter(book => status.value === 'all' || book.status === status.value)
  }

  return list
})

const availableTags = computed(() => {
  const counts = new Map()

  for (const book of props.books) {
    for (const tag of book.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
})

function statusLabel(value) {
  return statuses.find(item => item.value === value)?.label ?? value
}

function coverStyle(book) {
  const source = `${book.title} ${book.author || ''}`
  let hash = 0

  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash)
  }

  const hue = Math.abs(hash) % 360

  return {
    background: `linear-gradient(145deg, hsl(${hue} 45% 30%), hsl(${(hue + 45) % 360} 55% 16%))`,
  }
}

function initials(book) {
  return (book.title || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase()
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-12">
    <header class="mb-10">
      <p class="text-xs font-bold uppercase tracking-[0.2em] text-coral mb-3">Reading log</p>
      <h1 class="font-display text-5xl md:text-6xl font-bold text-ink mb-3 tracking-tighter">
        Books
      </h1>
      <p class="text-warm-muted max-w-2xl leading-relaxed">
        What I've been reading, where the recommendation came from, and what stayed with me.
        No ratings — just notes.
      </p>
    </header>

    <div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-center mb-8">
      <div class="relative">
        <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="query"
          type="text"
          placeholder="Search by title, author, or tag..."
          class="w-full pl-10 pr-10 py-2.5 text-sm bg-warm-surface border border-warm-border rounded-sm text-ink placeholder:text-warm-muted focus:outline-none focus:border-coral transition-colors"
        />
        <button
          v-if="query"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-warm-muted hover:text-ink transition-colors"
          aria-label="Clear search"
          @click="query = ''"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="item in statuses"
          :key="item.value"
          class="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm border transition-colors"
          :class="status === item.value
            ? 'bg-ink text-cream border-ink'
            : 'bg-warm-surface text-warm-muted border-warm-border hover:border-coral hover:text-ink'"
          @click="status = item.value"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div v-if="availableTags.length" class="flex flex-wrap items-center gap-2 mb-10">
      <span class="text-xs uppercase tracking-wider text-warm-muted mr-1">Tags</span>
      <button
        v-for="[tag, count] in availableTags"
        :key="tag"
        class="px-2.5 py-1 text-xs font-medium rounded-full border transition-colors"
        :class="query === tag
          ? 'bg-coral text-white border-coral'
          : 'bg-warm-surface text-ink border-warm-border hover:border-coral'"
        @click="query = query === tag ? '' : tag"
      >
        {{ tag }} <span class="opacity-50">{{ count }}</span>
      </button>
    </div>

    <div v-if="filteredBooks.length === 0" class="text-center py-20 text-warm-muted">
      <p class="font-display text-xl text-ink mb-1">Nothing on this shelf yet.</p>
      <p class="text-sm">Try a different search or filter.</p>
    </div>

    <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <Link
        v-for="book in filteredBooks"
        :key="book.slug || `hidden-${book.id}`"
        :href="book.hidden ? `/books/${book.id}` : `/books/${book.slug}`"
        class="group flex gap-4 p-4 bg-warm-surface border border-warm-border rounded-sm hover:border-coral hover:shadow-[4px_4px_0_0_var(--color-coral)] transition-all"
      >
        <div class="w-20 shrink-0">
          <div
            v-if="book.hidden"
            class="w-full aspect-[2/3] rounded-sm border border-dashed border-warm-border bg-warm-surface flex items-center justify-center"
            aria-label="Cover withheld"
          >
            <svg class="w-6 h-6 text-warm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.774 3.162 10.066 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243" />
            </svg>
          </div>
          <img
            v-else-if="book.cover_url"
            :src="book.cover_url"
            :alt="`Cover of ${book.title}`"
            class="w-full aspect-[2/3] object-cover rounded-sm border border-warm-border"
            loading="lazy"
          />
          <div
            v-else
            class="w-full aspect-[2/3] rounded-sm border border-black/10 flex items-end p-2"
            :style="coverStyle(book)"
          >
            <span class="font-display text-lg font-bold text-white/80">{{ initials(book) }}</span>
          </div>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2 mb-1">
            <h2 class="font-display text-lg font-bold text-ink leading-tight group-hover:text-coral transition-colors">
              {{ book.title }}
            </h2>
            <span class="shrink-0 text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border" :class="statusStyles[book.status] || statusStyles.finished">
              {{ statusLabel(book.status) }}
            </span>
          </div>

          <p v-if="book.author" class="text-sm text-warm-muted mb-1">{{ book.author }}</p>
          <p v-if="book.hidden" class="text-[0.65rem] font-bold uppercase tracking-wider text-warm-muted mb-1">Title, cover and notes withheld</p>
          <p v-if="book.finished_on" class="text-xs text-warm-muted mb-2">Finished {{ book.finished_on }}</p>

          <p v-if="book.excerpt" class="text-sm text-ink/75 leading-relaxed line-clamp-3">
            {{ book.excerpt }}
          </p>

          <div class="flex flex-wrap gap-1.5 mt-3">
            <span
              v-for="tag in (book.tags || []).slice(0, 3)"
              :key="tag"
              class="text-[0.65rem] px-2 py-0.5 bg-coral/10 text-coral rounded-full"
            >
              {{ tag }}
            </span>
          </div>

          <p v-if="book.stats?.total_read_time_label" class="mt-3 text-xs text-warm-muted">
            {{ book.stats.total_read_time_label }} of reading
            <span v-if="book.stats.percent_per_hour"> · {{ book.stats.percent_per_hour }}% per hour</span>
          </p>
        </div>
      </Link>
    </div>
  </div>
</template>
