<script setup>
import { Link } from '@inertiajs/vue3';

defineProps({
  posts: Array,
  selectedTag: String,
});
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-12">
      <header class="mb-12">
        <Link href="/posts" class="inline-flex items-center gap-2 text-ink hover:text-coral transition-colors mb-4">
          ← All posts
        </Link>
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

      <div class="space-y-8">
        <article v-for="post in posts" :key="post.id" class="border-b border-warm-border pb-6 last:border-b-0 last:pb-0">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <time class="text-sm text-warm-muted sm:mt-0">
              {{ post.published_date }}
            </time>
            <h2 class="font-display text-2xl font-bold text-ink mb-2 sm:mb-0 flex-1">
              <Link :href="`/posts/${post.slug}`" class="hover:text-coral transition-colors">
                {{ post.title }}
              </Link>
            </h2>
          </div>
          <p v-if="post.description" class="text-warm-muted mb-4 leading-relaxed">
            {{ post.description }}
          </p>
          <div class="flex flex-wrap gap-2 mt-3">
            <Link 
              v-for="tag in post.tags" 
              :key="tag"
              :href="`/posts/tag/${tag}`"
              class="text-sm px-3 py-1 bg-coral text-white rounded hover:bg-coral/80 transition-colors"
            >
              {{ tag }}
</Link>
            </div>
          </article>
        </div>
      </div>
</template>
