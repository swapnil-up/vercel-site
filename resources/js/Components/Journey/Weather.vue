<script setup>
function seeded(seed) {
  let value = seed % 2147483647
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

const random = seeded(88)

const petals = Array.from({ length: 14 }, (_, id) => ({
  id,
  left: Math.round(random() * 1000) / 10,
  delay: Math.round(random() * 120) / 10,
  duration: Math.round(90 + random() * 90) / 10,
  drift: Math.round((random() * 60 - 30) * 10) / 10,
  scale: 0.6 + Math.round(random() * 8) / 10,
}))

const fireflies = Array.from({ length: 18 }, (_, id) => ({
  id,
  left: Math.round(random() * 1000) / 10,
  top: Math.round((30 + random() * 55) * 10) / 10,
  delay: Math.round(random() * 80) / 10,
  duration: Math.round(40 + random() * 50) / 10,
}))
</script>

<template>
  <div class="dj-weather" aria-hidden="true">
    <span
      v-for="petal in petals"
      :key="`petal-${petal.id}`"
      class="dj-weather__petal"
      :style="{
        left: `${petal.left}%`,
        animationDelay: `${petal.delay}s`,
        '--dur': `${petal.duration}s`,
        '--drift': `${petal.drift}vw`,
        '--scale': petal.scale,
      }"
    />
    <span
      v-for="fly in fireflies"
      :key="`fly-${fly.id}`"
      class="dj-weather__firefly"
      :style="{
        left: `${fly.left}%`,
        top: `${fly.top}%`,
        animationDelay: `${fly.delay}s`,
        '--dur': `${fly.duration}s`,
      }"
    />
  </div>
</template>

<style scoped>
.dj-weather {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  --dj-weather-k: calc(1 - var(--dj-v, 0) * 0.55);
}

.dj-weather__petal {
  position: absolute;
  top: -6%;
  width: calc(8px * var(--scale));
  height: calc(6px * var(--scale));
  border-radius: 60% 40% 55% 45%;
  background: linear-gradient(135deg, var(--dj-petal-a), var(--dj-petal-b));
  opacity: 0.85;
  animation-name: dj-fall;
  animation-duration: calc(var(--dur, 12s) * var(--dj-weather-k));
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.dj-weather__firefly {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--dj-firefly);
  box-shadow: 0 0 10px 3px var(--dj-firefly-glow);
  opacity: 0;
  animation-name: dj-firefly;
  animation-duration: calc(var(--dur, 6s) * var(--dj-weather-k));
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

@keyframes dj-fall {
  0% {
    transform: translate3d(0, -6vh, 0) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.9;
  }
  90% {
    opacity: 0.7;
  }
  100% {
    transform: translate3d(var(--drift), 108vh, 0) rotate(320deg);
    opacity: 0;
  }
}

@keyframes dj-firefly {
  0%,
  100% {
    opacity: 0;
    transform: translate3d(0, 0, 0) scale(0.7);
  }
  45%,
  55% {
    opacity: calc(var(--dj-p) * 0.9);
    transform: translate3d(12px, -18px, 0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dj-weather {
    display: none;
  }
}
</style>
