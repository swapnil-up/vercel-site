<script setup>
import { Link } from '@inertiajs/vue3';

defineProps({
  post: Object,
  linkedPosts: Array,
  seriesPosts: Array,
});

const emit = defineEmits(['open-post', 'highlight-tag']);

const handlePostClick = (slug) => {
  emit('open-post', slug);
};

const handleTagClick = (tag, event) => {
  if (event && event.shiftKey) {
    emit('highlight-tag', tag);
  } else {
    window.location.href = `/posts/tag/${encodeURIComponent(tag)}`;
  }
};
</script>

<template>
  <div class="graph-post-viewer">
    <article class="post-content">
      <header class="post-header">
        <time class="post-date">
          {{ post.published_date }}
          <span v-if="post.updated_at && post.updated_at !== post.published_date" class="post-updated">
            · Updated {{ post.updated_at }}
          </span>
        </time>
        <h1 class="post-title">{{ post.title }}</h1>
        <p v-if="post.description" class="post-description">
          {{ post.description }}
        </p>
        <div class="post-tags">
          <button 
            v-for="tag in post.tags" 
            :key="tag"
            @click="handleTagClick(tag)"
            class="tag-button"
          >
            {{ tag }}
          </button>
        </div>
      </header>

      <!-- Series Navigation -->
      <div v-if="seriesPosts && seriesPosts.length > 1" class="series-navigation">
        <h3 class="series-title">
          Part {{ post.series_order }} of "{{ post.series }}"
        </h3>
        <ol class="series-list">
          <li v-for="(p, idx) in seriesPosts" :key="p.slug">
            <span v-if="p.slug === post.slug" class="series-current">
              {{ idx + 1 }}. {{ p.title }} (current)
            </span>
            <button 
              v-else
              @click="handlePostClick(p.slug)"
              class="series-link"
            >
              {{ idx + 1 }}. {{ p.title }}
            </button>
          </li>
        </ol>
      </div>

      <!-- Content -->
      <div 
        class="prose-content"
        v-html="post.content_html || post.content"
      />

      <!-- Linked Posts -->
      <div v-if="linkedPosts && linkedPosts.length > 0" class="linked-posts">
        <h3 class="linked-posts-title">
          Related Posts
        </h3>
        <div class="linked-posts-list">
          <button 
            v-for="linked in linkedPosts" 
            :key="linked.slug"
            @click="handlePostClick(linked.slug)"
            class="linked-post-card"
          >
            <h4 class="linked-post-title">
              {{ linked.title }}
            </h4>
            <p v-if="linked.description" class="linked-post-description">
              {{ linked.description }}
            </p>
          </button>
        </div>
      </div>
    </article>
  </div>
</template>

<style scoped>
.graph-post-viewer {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
}

.post-content {
  font-family: var(--font-body, "DM Sans", sans-serif);
  max-width: 100%;
}

.post-header {
  margin-bottom: 2rem;
}

.post-date {
  display: block;
  font-size: 0.875rem;
  color: var(--color-warm-muted);
  margin-bottom: 0.75rem;
}

.post-updated {
  margin-left: 0.5rem;
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
  color: var(--color-warm-border);
  border-radius: 9999px;
  border: none;
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
  border: 1px solid var(--color-sky);
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

.series-current {
  font-size: 0.875rem;
  color: var(--color-ink);
  font-weight: 500;
}

.series-link {
  font-size: 0.875rem;
  color: var(--color-ink);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  padding: 0;
  transition: color 0.2s;
}

.series-link:hover {
  color: var(--color-ink);
  text-decoration: underline;
}

.prose-content {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--color-warm-border);
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

