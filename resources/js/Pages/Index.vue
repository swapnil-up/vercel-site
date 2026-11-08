<script setup>
import { computed } from 'vue'
import HeroJourney from '@/Components/Home/HeroJourney.vue'
import HomeSections from '@/Components/Home/HomeSections.vue'

const props = defineProps({
  latestPosts: { type: Array, default: () => [] },
  now: { type: String, default: null },
  quote: { type: Object, default: null },
  graphStats: { type: Object, default: () => ({ notes: 0, connections: 0 }) },
})

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
const forceMotion = params?.get('motion') === '1'

// Motion is off for ?static=1 and for reduced-motion users (unless ?motion=1).
// When off, the hero renders as a calm, non-pinned block instead of hijacking scroll.
const motionEnabled = computed(
  () => params?.get('static') !== '1' && (!prefersReducedMotion || forceMotion),
)
</script>

<template>
  <HeroJourney
    :enabled="motionEnabled"
    :latest-posts="props.latestPosts"
    :now="props.now"
    :quote="props.quote"
    :graph-stats="props.graphStats"
  />

  <HomeSections
    :latest-posts="props.latestPosts"
    :now="props.now"
    :quote="props.quote"
    :graph-stats="props.graphStats"
  />
</template>
