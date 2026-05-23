<script setup>
import { ref, computed } from 'vue'
import { Link } from '@inertiajs/vue3'
import Fuse from 'fuse.js'

const props = defineProps({
  posts: Array,
  selectedTag: String,
})

const query = ref('')

const fuse = computed(() => new Fuse(props.posts, {
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'description', weight: 0.3 },
    { name: 'tags', weight: 0.2 },
  ],
  threshold: 0.4,
  includeScore: true,
}))

const filteredPosts = computed(() => {
  if (!query.value.trim()) return props.posts
  return fuse.value.search(query.value).map(r => r.item)
})

function clear() {
  query.value = ''
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-12">
    <header class="mb-8">
      <h1 class="font-display text-4xl font-bold text-ink mb-2">
        Writing
      </h1>
      <p class="text-warm-muted">
        Thoughts on code, career, and productivity
      </p>
      <p v-if="selectedTag" class="mt-2 inline-block bg-coral text-white px-3 py-1 rounded text-sm font-medium">
        Tagged: {{ selectedTag }}
      </p>
    </header>

    <div class="relative mb-10">
      <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="query"
        type="text"
        placeholder="Search posts..."
        class="w-full pl-10 pr-10 py-2.5 text-sm bg-warm-surface border border-warm-border rounded-sm text-ink placeholder:text-warm-muted focus:outline-none focus:border-coral transition-colors"
      />
      <button
        v-if="query"
        @click="clear"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-warm-muted hover:text-ink transition-colors"
        aria-label="Clear search"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div v-if="filteredPosts.length === 0" class="text-center py-16 text-warm-muted">
      <p class="text-sm">No posts match "{{ query }}"</p>
    </div>

    <div v-else class="space-y-8">
      <article v-for="post in filteredPosts" :key="post.id" class="border-b border-warm-border pb-8 last:border-b-0 last:pb-0">
        <div class="flex items-baseline justify-between gap-4 mb-2">
          <time class="text-sm text-warm-muted whitespace-nowrap">
            {{ post.published_date }}
          </time>
          <div class="flex-1" />
          <Link
            v-for="tag in post.tags"
            :key="tag"
            :href="`/posts/tag/${tag}`"
            class="text-xs px-2 py-0.5 bg-coral text-white rounded hover:bg-coral/80 transition-colors"
          >
            {{ tag }}
          </Link>
        </div>
        <h2 class="font-display text-2xl font-bold text-ink mb-2">
          <Link :href="`/posts/${post.slug}`" class="hover:text-coral transition-colors">
            {{ post.title }}
          </Link>
        </h2>
        <p v-if="post.description" class="text-warm-muted leading-relaxed">
          {{ post.description }}
        </p>
      </article>
    </div>
  </div>
</template>
