<script setup>
import { ref, onMounted } from 'vue';

const nowContent = ref('');

const fetchNowContent = async () => {
    try {
        const response = await fetch('/data/now');
        const data = await response.json();
        nowContent.value = data.content;
    } catch (error) {
        console.error('Failed to load now page content:', error);
    }
};

onMounted(() => {
    fetchNowContent();
});
</script>

<template>
    <div class="markdown-content max-w-none" v-html="nowContent"></div>
</template>