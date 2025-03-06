<script setup>
import { defineProps } from 'vue';

const props = defineProps({
  slug: String,
  content: String,
});
</script>

<template>
  <div>
    <div v-html="props.content"></div>
  </div>
</template>
