<script setup>
import { ref } from 'vue';
import { defineProps, onMounted } from 'vue';

const props = defineProps({
  slug: String,
  frontmatter: Object,
  content: String,
});


const articleContent = ref("");
const showSecondArticle = ref(false);

function openLinkedArticle(slug) {
    showSecondArticle.value = true;

    fetch(`/linked-article/${slug}`)
        .then(response => response.json())
        .then(data => {
            articleContent.value = data.content; 
        })
        .catch((error) => {
            console.error("Failed to load article", error);
        });
}

function handleClick(event) {
    const link = event.target.closest("a");
    if (link) {
        const url = new URL(link.href);
        if (url.origin === window.location.origin && url.pathname.startsWith("/articles/")) {
            event.preventDefault();
            const slug = url.pathname.split("/articles/")[1].replace('.md', '');
            openLinkedArticle(slug);
        }
    }
}


onMounted(() => {
    document.body.addEventListener("click", handleClick);
});
</script>

<template>
  <div class="flex-col">
    <header class="mb-6 border-b pb-4">
      <h3 class="text-3xl font-bold">{{ frontmatter.title }}</h3>
      <p class="text-gray-600 text-sm">
        <span>{{ frontmatter.date }}</span>
        <span v-if="frontmatter.categories" class="ml-4">Category: {{ frontmatter.categories.join(", ") }}</span>
      </p>
      <div v-if="frontmatter.tags" class="mt-2">
        <span v-for="tag in frontmatter.tags" :key="tag" class="px-2 py-1 text-xs bg-gray-200 rounded mr-2">
          #{{ tag }}
        </span>
      </div>
    </header>
    <div class="w-1/2 p-6">
      <div v-html="props.content"></div>
    </div>

    <div v-if="showSecondArticle" class="w-1/2 p-6 bg-gray-100">
      <div v-html="articleContent"></div>
    </div>
  </div>
</template>

