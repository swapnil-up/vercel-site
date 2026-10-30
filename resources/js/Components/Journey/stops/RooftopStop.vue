<script setup>
import { Link } from '@inertiajs/vue3'

defineProps({
  now: {
    type: String,
    default: null,
  },
})
</script>

<template>
  <div class="dj-stop">
    <p class="dj-kicker">Thamel · the rooftop</p>
    <h2 class="dj-h2">On a Thamel roof, right now</h2>
    <p class="dj-lede">Laundry on the line, a radio in the corner, the valley going soft.</p>

    <div v-if="now" class="dj-note">
      <p class="dj-note__label">Now</p>
      <p class="dj-note__body">{{ now }}</p>
    </div>
    <p v-else class="dj-body">The rooftop is quiet this evening.</p>

    <div class="dj-actions">
      <Link href="/now" class="dj-cta">What I'm doing now <span aria-hidden="true">→</span></Link>
      <Link href="/nepal-news" class="dj-link">Nepal News</Link>
    </div>
  </div>
</template>
