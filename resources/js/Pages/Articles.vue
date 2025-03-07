<script setup>
import { ref, defineProps } from 'vue';
import { Link } from '@inertiajs/vue3';

const props = defineProps({
  articles: Array
});

const previewContent = ref(null);
const hoveredArticle = ref(null);

const fetchPreview = async (slug) => {
    try {
        const response = await fetch(`/articles/${slug}/preview`);
        const data = await response.json();
        previewContent.value = data.preview 
        hoveredArticle.value = slug;
    } catch (error) {
        console.error("Failed to fetch preview", error);
    }
};

const hidePreview = () => {
    previewContent.value = null;
    hoveredArticle.value = null;
};
</script>

<template>
  <div>
    <h1>All Articles</h1>
    <ul>
      <li v-for="article in props.articles" :key="article">
        <Link :href="`/articles/${article}`"  @mouseenter="fetchPreview(article)" @mouseleave="hidePreview">
          {{ article }}</Link>
          <div v-if="hoveredArticle === article" class="tooltip">
                    {{ previewContent }}
                </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tooltip {
    position: absolute;
    background: white;
    border: 1px solid gray;
    padding: 10px;
    width: 500px;
    box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
    z-index: 100;
}
</style>