<script setup>
import { Link } from '@inertiajs/vue3'
import { featuredTools } from '@/Data/journey'
</script>

<template>
  <div class="dj-stop">
    <p class="dj-kicker">Bazaar · the gadget stalls</p>
    <h2 class="dj-h2">Things that whirr and blink</h2>
    <p class="dj-lede">Tools, toys and experiments, mostly built for the joy of building them.</p>

    <ul class="dj-tool-list">
      <li v-for="tool in featuredTools" :key="tool.href">
        <Link :href="tool.href" class="dj-tool" :data-accent="tool.accent">
          <span class="dj-tool__title">{{ tool.title }}</span>
          <span class="dj-tool__blurb">{{ tool.blurb }}</span>
          <span class="dj-tool__go" aria-hidden="true">↗</span>
        </Link>
      </li>
    </ul>

    <div class="dj-actions">
      <Link href="/tools" class="dj-cta">All tools <span aria-hidden="true">→</span></Link>
    </div>
  </div>
</template>
