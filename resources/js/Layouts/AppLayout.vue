<script setup>
import { usePage } from '@inertiajs/vue3'
import { computed, watchEffect } from 'vue'
import Navbar from '@/Components/Navbar.vue';
import Footer from '@/Components/Footer.vue';

const key = computed(() => usePage().url)
const meta = computed(() => usePage().props.meta ?? {})

function setMeta(attribute, name, value) {
  if (!value) return
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', value)
}

// The document head is rendered by Laravel on a hard load. Inertia only swaps
// the page body after that, so keep the title and social tags in sync by hand.
watchEffect(() => {
  const data = meta.value

  if (data.title) {
    document.title = data.title
  }

  setMeta('name', 'description', data.description)
  setMeta('property', 'og:title', data.title)
  setMeta('property', 'og:description', data.description)
  setMeta('property', 'og:url', data.url)
  setMeta('property', 'og:image', data.image)
  setMeta('property', 'og:type', data.type)
  setMeta('name', 'twitter:title', data.title)
  setMeta('name', 'twitter:description', data.description)
  setMeta('name', 'twitter:image', data.image)

  const canonical = document.head.querySelector('link[rel="canonical"]')
  if (canonical && data.url) {
    canonical.setAttribute('href', data.url)
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />
    <main class="flex-1">
      <Transition name="page">
        <div :key="key">
          <slot />
        </div>
      </Transition>
    </main>
    <Footer />
  </div>
</template>
