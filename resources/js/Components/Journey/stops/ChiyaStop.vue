<script setup>
import { Link } from '@inertiajs/vue3'
import { techChips } from '@/Data/journey'
</script>

<template>
  <div class="dj-stop">
    <p class="dj-kicker">Chiya pasal · the tea shop</p>
    <h2 class="dj-h2">Namaste, I'm Swapnil</h2>
    <p class="dj-lede">Full-stack developer, open-source enthusiast, learning in public.</p>
    <p class="dj-body">
      I build web products end to end and write about what I learn on the way.
      This is my digital garden: notes, essays and experiments, mostly about
      software, career and curiosity.
    </p>

    <ul class="dj-chips" aria-label="Tech I work with">
      <li v-for="chip in techChips" :key="chip" class="dj-chip">{{ chip }}</li>
    </ul>

    <div class="dj-actions">
      <Link href="/about" class="dj-cta">More about me <span aria-hidden="true">→</span></Link>
    </div>

    <p class="dj-hint-line">Based in Kathmandu, Nepal · writing publicly since 2020</p>
  </div>
</template>
