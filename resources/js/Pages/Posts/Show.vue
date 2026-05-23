<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Link } from '@inertiajs/vue3'

defineProps({
  post: Object,
  linkedPosts: Array,
  seriesPosts: Array,
})

const progress = ref(0)

const handleScroll = () => {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  progress.value = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="bg-cream min-h-screen">
    <div class="progress-bar" :style="{ width: progress + '%' }" />

    <article class="max-w-4xl mx-auto px-6 py-12">
      <Link href="/posts" class="inline-flex items-center gap-2 text-warm-muted hover:text-coral transition-colors mb-4 group">
        <span class="group-hover:-translate-x-1 transition-transform">←</span>
        Back to posts
      </Link>

      <header class="mb-12">
        <div class="flex items-center gap-3 text-sm text-warm-muted mb-4">
          <time>{{ post.published_date }}</time>
          <span v-if="post.updated_at && post.updated_at !== post.published_date" class="before:content-['·'] before:mr-3">
            Updated {{ post.updated_at }}
          </span>
        </div>

        <h1 class="font-display text-5xl md:text-6xl font-bold text-ink mb-4 leading-tight tracking-tighter">
          {{ post.title }}
        </h1>

        <p v-if="post.description" class="text-xl text-warm-muted leading-relaxed max-w-3xl">
          {{ post.description }}
        </p>

        <div class="flex flex-wrap gap-2 mt-6">
          <Link
            v-for="tag in post.tags"
            :key="tag"
            :href="`/posts/tag/${tag}`"
            class="text-sm px-3 py-1 bg-coral text-white rounded hover:bg-coral/80 transition-colors"
          >
            {{ tag }}
          </Link>
        </div>
      </header>

      <div v-if="seriesPosts && seriesPosts.length > 1" class="mb-10 p-6 bg-sky text-white rounded-sm">
        <h3 class="font-display text-sm font-bold mb-3">
          Part {{ post.series_order }} of "{{ post.series }}"
        </h3>
        <ol class="space-y-2">
          <li v-for="(p, idx) in seriesPosts" :key="p.slug">
            <span v-if="p.slug === post.slug" class="font-medium text-white">
              {{ idx + 1 }}. {{ p.title }} (current)
            </span>
            <Link
              v-else
              :href="`/posts/${p.slug}`"
              class="hover:text-coral transition-colors text-sm"
            >
              {{ idx + 1 }}. {{ p.title }}
            </Link>
          </li>
        </ol>
      </div>

      <div class="article-content max-w-none" v-html="post.content_html" />

      <div v-if="linkedPosts && linkedPosts.length > 0" class="mt-16 pt-8 border-t border-warm-border">
        <h3 class="font-display text-lg font-bold text-ink mb-4 flex items-center gap-2">
          <span class="w-1.5 h-6 bg-coral rounded-sm inline-block"></span>
          Related Posts
        </h3>
        <div class="space-y-4">
          <Link
            v-for="linked in linkedPosts"
            :key="linked.slug"
            :href="`/posts/${linked.slug}`"
            class="block p-5 bg-warm-surface border border-warm-border rounded-sm hover:bg-coral/5 hover:border-coral transition-all"
          >
            <h4 class="font-display font-semibold text-ink mb-1">
              {{ linked.title }}
            </h4>
            <p v-if="linked.description" class="text-sm text-ink/70">
              {{ linked.description }}
            </p>
          </Link>
        </div>
      </div>
    </article>
  </div>
</template>
