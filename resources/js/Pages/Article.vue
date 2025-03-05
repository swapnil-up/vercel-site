<template>
    <div v-if="articleContent" v-html="articleContent"></div>
    <div v-else>
        <p>Loading...</p>
    </div>
</template>

<script>
export default {
    props: {
        slug: String,
    },
    data() {
        return {
            articleContent: null,
        };
    },
    mounted() {
        this.fetchArticle();
    },
    methods: {
        async fetchArticle() {
            try {
                const response = await fetch(`/articles/${this.slug}`);
                const data = await response.json();
                if (data.content) {
                    this.articleContent = data.content;
                } else {
                    console.error("Article not found");
                }
            } catch (error) {
                console.error(error);
            }
        },
    },
};
</script>
