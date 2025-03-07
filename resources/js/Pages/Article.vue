<script setup>
import { ref } from 'vue';
import { defineProps, onMounted } from 'vue';

const props = defineProps({
  slug: String,
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
            const slug = url.pathname.split("/articles/")[1];
            console.log(slug)
            openLinkedArticle(slug);
        }
    }
}


onMounted(() => {
    document.body.addEventListener("click", handleClick);
});
</script>

<template>
  <div class="flex">
    <div class="w-1/2 p-6">
      <div v-html="props.content"></div>
    </div>

    <div v-if="showSecondArticle" class="w-1/2 p-6 bg-gray-100">
      <div v-html="secondArticle.content"></div>
    </div>
  </div>
</template>


<style scoped>
/* Optional: You can style the container if you need to make the split screen look better */
.flex {
  display: flex;
  height: 100vh;
}
</style>