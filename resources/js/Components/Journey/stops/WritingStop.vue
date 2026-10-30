<script setup>
import { Link } from '@inertiajs/vue3'

defineProps({
  posts: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <div class="dj-stop">
    <p class="dj-kicker">Pustak pasal · the bookstall</p>
    <h2 class="dj-h2">Field notes</h2>
    <p class="dj-lede">Technical articles, essays and maps of content, written in public.</p>

    <ul v-if="posts.length" class="dj-post-list">
      <li v-for="post in posts" :key="post.slug" class="dj-post">
        <Link :href="`/posts/${post.slug}`" class="dj-post__link">
          <span class="dj-post__date">{{ post.published_date }}</span>
          <span class="dj-post__title">{{ post.title }}</span>
          <span v-if="post.description" class="dj-post__desc">{{ post.description }}</span>
        </Link>
      </li>
    </ul>
    <p v-else class="dj-body">The bookstall is being restocked. Check back soon.</p>

    <div class="dj-actions">
      <Link href="/posts" class="dj-cta">All writing <span aria-hidden="true">→</span></Link>
    </div>
  </div>
</template>
