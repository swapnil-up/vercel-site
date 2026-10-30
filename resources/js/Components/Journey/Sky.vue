<script setup>
function seeded(seed) {
  let value = seed % 2147483647
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

const random = seeded(717)
const stars = Array.from({ length: 48 }, (_, id) => ({
  id,
  x: Math.round(random() * 100 * 10) / 10,
  y: Math.round(random() * 52 * 10) / 10,
  r: Math.round((0.08 + random() * 0.18) * 1000) / 1000,
  delay: Math.round(random() * 40) / 10,
}))
</script>

<template>
  <div class="dj-sky" aria-hidden="true">
    <div class="dj-sky__night"></div>
    <div class="dj-sky__sun"></div>
    <div class="dj-sky__moon"></div>
    <svg class="dj-sky__stars" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice">
      <circle
        v-for="star in stars"
        :key="star.id"
        :cx="star.x"
        :cy="star.y"
        :r="star.r"
        :style="{ animationDelay: `${star.delay}s` }"
      />
    </svg>
    <div class="dj-sky__haze"></div>
  </div>
</template>

<style scoped>
.dj-sky {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    var(--dj-sky-top) 0%,
    var(--dj-sky-mid) 46%,
    var(--dj-sky-low) 74%,
    var(--dj-sky-bottom) 100%
  );
}

.dj-sky__night {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    var(--dj-night-top) 0%,
    var(--dj-night-mid) 55%,
    var(--dj-night-bottom) 100%
  );
  opacity: calc(var(--dj-p) * 0.88);
}

.dj-sky__sun {
  position: absolute;
  top: 18%;
  left: 66%;
  width: clamp(56px, 8vw, 116px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 38%, #ffe9a8, #f4b942 52%, #ff7a45 100%);
  box-shadow: 0 0 70px 24px rgba(255, 145, 64, 0.45);
  transform: translateY(calc(var(--dj-p) * 34vh)) scale(calc(1 + var(--dj-p) * 0.18));
  opacity: calc(1 - var(--dj-p) * 1.35);
}

.dj-sky__moon {
  position: absolute;
  top: 14%;
  right: 18%;
  width: clamp(38px, 5vw, 74px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 35%, #fffdf4, #f3ecd2 60%, #d8cfae 100%);
  box-shadow: 0 0 48px 14px rgba(243, 236, 210, 0.28);
  opacity: calc(var(--dj-p) * 1.5 - 0.45);
}

.dj-sky__stars {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 62%;
  fill: #fff6d8;
  opacity: calc(var(--dj-p) * 1.4 - 0.35);
}

.dj-sky__stars circle {
  animation: dj-twinkle 4.5s ease-in-out infinite;
}

.dj-sky__haze {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 70% 24%, rgba(255, 176, 92, 0.28), transparent 55%),
    linear-gradient(180deg, transparent 58%, var(--dj-haze) 100%);
}

@keyframes dj-twinkle {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dj-sky__stars circle {
    animation: none;
  }
}
</style>
