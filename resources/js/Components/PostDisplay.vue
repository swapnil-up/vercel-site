<script setup>
import { router } from '@inertiajs/vue3'

defineProps({
  post: Object,
  linkedPosts: Array,
  seriesPosts: Array,
})

const emit = defineEmits(['open-post', 'highlight-tag'])

const handlePostClick = (slug) => {
  emit('open-post', slug)
}

const handleTagClick = (tag, event) => {
  if (event?.shiftKey) {
    emit('highlight-tag', tag)
  } else {
    router.visit(`/posts/tag/${encodeURIComponent(tag)}`)
  }
}

const handleProseClick = (event) => {
  const link = event.target.closest('a')
  if (!link) return
  const href = link.getAttribute('href')
  if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#')) return
  event.preventDefault()
  router.visit(href)
}
</script>

<template>
  <article class="post-content">
    <header class="post-header">
      <div class="post-meta">
        <time class="post-date">{{ post.published_date }}</time>
        <span v-if="post.updated_at && post.updated_at !== post.published_date" class="post-updated">
          · Updated {{ post.updated_at }}
        </span>
      </div>

      <h1 class="post-title">{{ post.title }}</h1>

      <p v-if="post.description" class="post-description">
        {{ post.description }}
      </p>

      <div class="post-tags">
        <button
          v-for="tag in post.tags"
          :key="tag"
          @click="handleTagClick(tag, $event)"
          class="tag-button"
        >
          {{ tag }}
        </button>
      </div>
    </header>

    <div v-if="seriesPosts && seriesPosts.length > 1" class="series-navigation">
      <h3 class="series-title">
        Part {{ post.series_order }} of "{{ post.series }}"
      </h3>
      <ol class="series-list">
        <li v-for="(p, idx) in seriesPosts" :key="p.slug">
          <span v-if="p.slug === post.slug" class="series-current">
            {{ idx + 1 }}. {{ p.title }} (current)
          </span>
          <button v-else @click="handlePostClick(p.slug)" class="series-link-sidebar">
            {{ idx + 1 }}. {{ p.title }}
          </button>
        </li>
      </ol>
    </div>

    <div class="prose-content" v-html="post.content_html" @click="handleProseClick" />

    <div v-if="linkedPosts && linkedPosts.length > 0" class="linked-posts">
      <h3 class="linked-posts-title">Related Posts</h3>
      <div class="linked-posts-list">
        <button
          v-for="linked in linkedPosts"
          :key="linked.slug"
          @click="handlePostClick(linked.slug)"
          class="linked-post-card"
        >
          <h4 class="linked-post-title">{{ linked.title }}</h4>
          <p v-if="linked.description" class="linked-post-description">{{ linked.description }}</p>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.post-content {
  font-family: var(--font-body, "DM Sans", sans-serif);
  max-width: 100%;
}

.post-header {
  margin-bottom: 2rem;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-warm-muted);
  margin-bottom: 0.75rem;
}

.post-title {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-ink);
  margin-bottom: 1rem;
  line-height: 1.2;
}

.post-description {
  font-size: 1.125rem;
  color: var(--color-warm-muted);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.tag-button {
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
  background-color: var(--color-warm-surface);
  color: var(--color-warm-muted);
  border-radius: 9999px;
  border: 1px solid var(--color-warm-border);
  cursor: pointer;
  transition: all 0.2s;
}

.tag-button:hover {
  background-color: var(--color-warm-border);
  color: var(--color-ink);
}

.series-navigation {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: var(--color-sky);
  border-radius: 0.125rem;
}

.series-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-ink);
  margin-bottom: 0.75rem;
}

.series-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.series-list li {
  font-size: 0.875rem;
}

.series-current {
  font-weight: 500;
  color: var(--color-ink);
}

.series-link-sidebar {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-ink);
  padding: 0;
  text-align: left;
}

.series-link-sidebar:hover {
  text-decoration: underline;
}

.prose-content {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--color-ink);
}

.prose-content :deep(h2) {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-ink);
  margin-top: 3rem;
  margin-bottom: 1rem;
}

.prose-content :deep(h3) {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-ink);
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

.prose-content :deep(p) {
  margin-bottom: 1.5rem;
}

.prose-content :deep(a) {
  color: var(--color-coral);
  text-decoration: none;
}

.prose-content :deep(a:hover) {
  text-decoration: underline;
}

.prose-content :deep(code) {
  font-size: 0.875rem;
  background-color: var(--color-warm-surface);
  padding: 0.125rem 0.375rem;
  border-radius: 0.125rem;
  color: var(--color-ink);
}

.prose-content :deep(pre) {
  background-color: var(--color-ink);
  color: var(--color-cream);
  padding: 1rem;
  border-radius: 0.125rem;
  overflow-x: auto;
}

.prose-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.prose-content :deep(strong) {
  color: var(--color-ink);
  font-weight: 600;
}

.prose-content :deep(blockquote) {
  border-left: 4px solid var(--color-warm-border);
  padding-left: 1rem;
  color: var(--color-warm-muted);
}

.linked-posts {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-warm-border);
}

.linked-posts-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-ink);
  margin-bottom: 1rem;
}

.linked-posts-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.linked-post-card {
  display: block;
  padding: 1rem;
  background-color: var(--color-cream);
  border-radius: 0.125rem;
  border: 1px solid var(--color-warm-border);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  color: inherit;
  text-decoration: none;
  width: 100%;
}

.linked-post-card:hover {
  border-color: var(--color-warm-border);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.linked-post-title {
  font-weight: 500;
  color: var(--color-ink);
  margin-bottom: 0.25rem;
}

.linked-post-description {
  font-size: 0.875rem;
  color: var(--color-warm-muted);
}
</style>
