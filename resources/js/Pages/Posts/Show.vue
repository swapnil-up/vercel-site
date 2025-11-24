<script setup>
import { Link } from '@inertiajs/vue3';

defineProps({
  post: Object,
  linkedPosts: Array,
  seriesPosts: Array,
});
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <article class="max-w-2xl mx-auto px-6 py-16">
      <header class="mb-12">
        <Link href="/posts" class="text-sm text-neutral-600 hover:text-neutral-900 mb-8 inline-block">
          ← Back to posts
        </Link>
        <time class="text-sm text-neutral-500 block mb-3">
          {{ post.published_date }}
          <span v-if="post.updated_at && post.updated_at !== post.published_date" class="ml-2">
            · Updated {{ post.updated_at }}
          </span>
        </time>
        <h1 class="text-4xl font-bold text-neutral-900 mb-4 leading-tight">
          {{ post.title }}
        </h1>
        <p v-if="post.description" class="text-xl text-neutral-600 leading-relaxed">
          {{ post.description }}
        </p>
        <div class="flex flex-wrap gap-2 mt-6">
          <Link 
            v-for="tag in post.tags" 
            :key="tag"
            :href="`/posts/tag/${tag}`"
            class="text-sm px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full hover:bg-neutral-200 transition-colors"
          >
            {{ tag }}
          </Link>
        </div>
      </header>

      <!-- Series Navigation -->
      <div v-if="seriesPosts && seriesPosts.length > 1" class="mb-12 p-6 bg-blue-50 rounded-lg border border-blue-100">
        <h3 class="text-sm font-semibold text-blue-900 mb-3">
          Part {{ post.series_order }} of "{{ post.series }}"
        </h3>
        <ol class="space-y-2">
          <li v-for="(p, idx) in seriesPosts" :key="p.slug">
            <span v-if="p.slug === post.slug" class="text-sm text-blue-900 font-medium">
              {{ idx + 1 }}. {{ p.title }} (current)
            </span>
            <Link 
              v-else
              :href="`/posts/${p.slug}`"
              class="text-sm text-blue-700 hover:text-blue-900 hover:underline"
            >
              {{ idx + 1 }}. {{ p.title }}
            </Link>
          </li>
        </ol>
      </div>

      <!-- Content -->
      <div 
        class="prose prose-neutral prose-lg max-w-none
          prose-headings:font-bold prose-headings:text-neutral-900
          prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-neutral-700 prose-p:leading-relaxed prose-p:mb-6
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-code:text-neutral-900 prose-code:bg-neutral-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
          prose-pre:bg-neutral-900 prose-pre:text-neutral-100
          prose-strong:text-neutral-900 prose-strong:font-semibold
          prose-blockquote:border-l-4 prose-blockquote:border-neutral-300 prose-blockquote:pl-4"
        v-html="post.content_html"
      />

      <!-- Linked Posts -->
      <div v-if="linkedPosts && linkedPosts.length > 0" class="mt-16 pt-8 border-t border-neutral-200">
        <h3 class="text-lg font-semibold text-neutral-900 mb-4">
          Related Posts
        </h3>
        <div class="space-y-4">
          <Link 
            v-for="linked in linkedPosts" 
            :key="linked.slug"
            :href="`/posts/${linked.slug}`"
            class="block p-4 bg-white rounded-lg border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all"
          >
            <h4 class="font-medium text-neutral-900 mb-1">
              {{ linked.title }}
            </h4>
            <p v-if="linked.description" class="text-sm text-neutral-600">
              {{ linked.description }}
            </p>
          </Link>
        </div>
      </div>
    </article>
  </div>
</template>