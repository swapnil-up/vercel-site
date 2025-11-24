<script setup>
import { Link } from '@inertiajs/vue3';

defineProps({
  posts: Array,
  selectedTag: String,
});
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <div class="max-w-3xl mx-auto px-6 py-16">
      <header class="mb-16">
        <h1 class="text-4xl font-bold text-neutral-900 mb-2">Writing</h1>
        <p class="text-neutral-600">Thoughts on code, career, and productivity</p>
      </header>

      <div class="space-y-12">
        <article v-for="post in posts" :key="post.id" class="group">
          <time class="text-sm text-neutral-500 mb-2 block">
            {{ post.published_date }}
          </time>
          <h2 class="text-2xl font-semibold text-neutral-900 mb-3 group-hover:text-blue-600 transition-colors">
            <Link :href="`/posts/${post.slug}`">
              {{ post.title }}
            </Link>
          </h2>
          <p v-if="post.description" class="text-neutral-600 mb-4 leading-relaxed">
            {{ post.description }}
          </p>
          <div class="flex flex-wrap gap-2">
            <Link 
              v-for="tag in post.tags" 
              :key="tag"
              :href="`/posts/tag/${tag}`"
              class="text-sm px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full hover:bg-neutral-200 transition-colors"
            >
              {{ tag }}
            </Link>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>