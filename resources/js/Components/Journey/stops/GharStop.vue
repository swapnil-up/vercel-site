<script setup>
import { Link } from '@inertiajs/vue3'
</script>

<template>
  <div class="dj-stop dj-stop--intro">
    <p class="dj-kicker">Kathmandu · dusk</p>
    <h1 class="dj-h1">
      Swap's <span class="dj-accent">musings</span>
    </h1>
    <p class="dj-lede">Code, career, and curiosity — written in public.</p>
    <p class="dj-body">
      A slow walk through the parts of this site I'm proudest of. No menu, no
      dashboard — just the city at golden hour and a small dog who thinks he's
      the guide.
    </p>
    <div class="dj-actions">
      <Link href="/posts" class="dj-cta">Read the blog <span aria-hidden="true">→</span></Link>
      <Link href="/about" class="dj-link">About</Link>
      <Link href="/now" class="dj-link">Now</Link>
    </div>
    <p class="dj-hint-line">Scroll, swipe or press ↓ — Blobby will lead the way.</p>
  </div>
</template>
