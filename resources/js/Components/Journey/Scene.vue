<script setup>
import Sky from './Sky.vue'
import Valley from './Valley.vue'
import City from './City.vue'
import Street from './Street.vue'
import Weather from './Weather.vue'
import Foreground from './Foreground.vue'
</script>

<template>
  <div class="dj-scene" aria-hidden="true">
    <Sky />
    <Valley />
    <City />
    <Street />
    <Weather />
    <Foreground />
    <div class="dj-scene__grain"></div>
    <div class="dj-scene__vignette"></div>
    <div class="dj-scene__warm"></div>
  </div>
</template>

<style scoped>
.dj-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.dj-scene__grain {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
  background-size: 160px 160px;
  opacity: 0.055;
  mix-blend-mode: overlay;
  pointer-events: none;
}

.dj-scene__vignette {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 42%, transparent 42%, rgba(12, 8, 18, 0.42) 100%),
    linear-gradient(180deg, transparent 62%, rgba(10, 7, 14, 0.5) 100%);
  pointer-events: none;
}

.dj-scene__warm {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 12% 40%, var(--dj-warm-wash), transparent 45%);
  opacity: calc(0.35 + var(--dj-p) * 0.5);
  mix-blend-mode: screen;
  pointer-events: none;
}
</style>
