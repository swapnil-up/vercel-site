<script setup>
import PostDisplay from './PostDisplay.vue'

defineProps({
  post: Object,
  linkedPosts: Array,
  seriesPosts: Array,
})

const emit = defineEmits(['open-post', 'highlight-tag'])
</script>

<template>
  <div class="graph-post-viewer">
    <PostDisplay
      :post="post"
      :linkedPosts="linkedPosts"
      :seriesPosts="seriesPosts"
      @open-post="emit('open-post', $event)"
      @highlight-tag="emit('highlight-tag', $event)"
    />
  </div>
</template>

<style scoped>
.graph-post-viewer {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
}
</style>

