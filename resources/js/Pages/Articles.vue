<script setup>
import { defineProps } from 'vue';
import { Link } from '@inertiajs/vue3';

const props = defineProps({
  articles: Array
});
</script>

<template>
  <div>
    <h1>All Articles</h1>
    <ul>
      <li v-for="article in props.articles" :key="article">
        <Link :href="`/articles/${article}`">{{ article }}</Link>
      </li>
    </ul>
  </div>
</template>
