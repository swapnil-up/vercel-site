<script setup>
import { Link } from '@inertiajs/vue3'
import { socials } from '@/Data/journey'

const emit = defineEmits(['restart'])
</script>

<template>
  <div class="dj-stop dj-stop--finale">
    <p class="dj-kicker">Swayambhu · the overlook</p>
    <h2 class="dj-h2">The city lights come on</h2>
    <p class="dj-lede">Thanks for walking with us. The kettle's still warm.</p>
    <p class="dj-body">
      If something here made you curious, say hello. The fastest way to reach me
      is wherever you already found this site — or through the links below.
    </p>

    <div class="dj-actions">
      <Link href="/about" class="dj-cta">Say hello <span aria-hidden="true">→</span></Link>
      <button type="button" class="dj-link dj-link--button" @click="emit('restart')">
        Walk back to the start
      </button>
    </div>

    <ul class="dj-socials">
      <li v-for="social in socials" :key="social.href">
        <a :href="social.href" class="dj-social" :target="social.href.startsWith('http') ? '_blank' : undefined" :rel="social.href.startsWith('http') ? 'noopener noreferrer' : undefined">
          {{ social.label }}
        </a>
      </li>
    </ul>

    <p class="dj-hint-line">— Swapnil &amp; Blobby</p>
  </div>
</template>
