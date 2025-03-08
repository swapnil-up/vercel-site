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
const secondArticleFrontmatter = ref({});

function openLinkedArticle(slug) {
    showSecondArticle.value = true;

    fetch(`/linked-article/${slug}`)
        .then(response => response.json())
        .then(data => {
            secondArticleFrontmatter.value = data.frontmatter;
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

function closeSecondArticle() {
    showSecondArticle.value = false; 
}

onMounted(() => {
    document.body.addEventListener("click", handleClick);
});
</script>

<template>
  <div class="flex flex-col lg:flex-row">
    <!-- Main Article -->
    <div 
      class="article-1 mb-6 lg:mr-6 flex-1"
      :class="{ 'max-h-screen overflow-y-auto': showSecondArticle }"
    >
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
      
      <div class="w-full p-6">
        <div v-html="props.content"></div>
      </div>
    </div>

    <!-- Side Article (Second Article) -->
    <div 
      v-if="showSecondArticle" 
      class="article-2 lg:w-1/2 w-full p-6 bg-gray-100 border-l-4 border-blue-500 shadow-lg relative max-h-screen overflow-y-auto"
    >
      <!-- Close Button -->
      <button @click="closeSecondArticle" class="absolute top-2 right-2 text-xl text-gray-600 hover:text-gray-900">
        &times;
      </button>
      
      <header class="mb-6 border-b pb-4">
        <h3 class="text-3xl font-bold">{{ secondArticleFrontmatter.title }}</h3>
        <p class="text-gray-600 text-sm">
          <span>{{ secondArticleFrontmatter.date }}</span>
          <span v-if="secondArticleFrontmatter.categories" class="ml-4">Category: {{ secondArticleFrontmatter.categories.join(", ") }}</span>
        </p>
        <div v-if="secondArticleFrontmatter.tags" class="mt-2">
          <span v-for="tag in secondArticleFrontmatter.tags" :key="tag" class="px-2 py-1 text-xs bg-gray-200 rounded mr-2">
            #{{ tag }}
          </span>
        </div>
      </header>

      <div class="w-full p-6">
        <div v-html="articleContent"></div>
      </div>
    </div>
  </div>
</template>





<style scoped>
.article-1 {
  /* Original article - no additional styling needed */
}

.article-2 {
  background-color: #f1f5f9; /* Light gray background to differentiate */
  border-left: 4px solid #4c9aff; /* Blue left border to highlight it */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Slight shadow for emphasis */
  padding: 20px;
}

.article-2 header {
  border-bottom: 2px solid #d1d5db; /* Subtle bottom border in second article header */
}

.article-2 h3 {
  color: #1e40af; /* Dark blue color for title */
}

.article-2 p {
  color: #4b5563; /* Gray color for date and category */
}

.article-2 .tag {
  background-color: #93c5fd; /* Blue background for tags */
}
</style>
