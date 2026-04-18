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
  max-width: 100%;
}

.post-header {
  margin-bottom: 2rem;
}

.post-date {
  display: block;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.post-updated {
  margin-left: 0.5rem;
}

.post-title {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.post-description {
  font-size: 1.125rem;
  color: #4b5563;
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
  background-color: #f3f4f6;
  color: #374151;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-button:hover {
  background-color: #e5e7eb;
  color: #111827;
}

.series-navigation {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: #eff6ff;
  border-radius: 0.5rem;
  border: 1px solid #dbeafe;
}

.series-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e3a8a;
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
  color: #1e3a8a;
  font-weight: 500;
}

.series-link {
  font-size: 0.875rem;
  color: #1e40af;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  padding: 0;
  transition: color 0.2s;
}

.series-link:hover {
  color: #1e3a8a;
  text-decoration: underline;
}

.prose-content {
  font-size: 1rem;
  line-height: 1.75;
  color: #374151;
}

.prose-content :deep(h2) {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-top: 3rem;
  margin-bottom: 1rem;
}

.prose-content :deep(h3) {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

.prose-content :deep(p) {
  margin-bottom: 1.5rem;
}

.prose-content :deep(a) {
  color: #2563eb;
  text-decoration: none;
}

.prose-content :deep(a:hover) {
  text-decoration: underline;
}

.prose-content :deep(code) {
  font-size: 0.875rem;
  background-color: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  color: #111827;
}

.prose-content :deep(pre) {
  background-color: #111827;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}

.prose-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.prose-content :deep(strong) {
  color: #111827;
  font-weight: 600;
}

.prose-content :deep(blockquote) {
  border-left: 4px solid #d1d5db;
  padding-left: 1rem;
  color: #6b7280;
}

.linked-posts {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.linked-posts-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
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
  background-color: white;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.linked-post-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.linked-post-title {
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
}

.linked-post-description {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Dark mode support */
.dark-mode .post-title,
.dark-mode .linked-post-title {
  color: #f9fafb;
}

.dark-mode .post-description,
.dark-mode .linked-post-description {
  color: #d1d5db;
}

.dark-mode .prose-content {
  color: #d1d5db;
}

.dark-mode .prose-content :deep(h2),
.dark-mode .prose-content :deep(h3) {
  color: #f9fafb;
}

.dark-mode .prose-content :deep(code) {
  background-color: #374151;
  color: #f9fafb;
}

.dark-mode .prose-content :deep(strong) {
  color: #f9fafb;
}

.dark-mode .prose-content :deep(blockquote) {
  border-left-color: #4b5563;
  color: #9ca3af;
}

.dark-mode .tag-button {
  background-color: #374151;
  color: #d1d5db;
}

.dark-mode .tag-button:hover {
  background-color: #4b5563;
  color: #f9fafb;
}

.dark-mode .series-navigation {
  background-color: #1e3a8a;
  border-color: #1e40af;
}

.dark-mode .series-title {
  color: #dbeafe;
}

.dark-mode .series-current {
  color: #dbeafe;
}

.dark-mode .series-link {
  color: #60a5fa;
}

.dark-mode .series-link:hover {
  color: #93c5fd;
}

.dark-mode .linked-post-card {
  background-color: #1f2937;
  border-color: #374151;
}

.dark-mode .linked-post-card:hover {
  border-color: #4b5563;
}
</style>