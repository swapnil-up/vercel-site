<script setup>
const groundY = 664

const facades = [
  { x: -60, w: 240, h: 185 },
  { x: 180, w: 200, h: 225 },
  { x: 380, w: 220, h: 160 },
  { x: 600, w: 180, h: 200 },
  { x: 780, w: 240, h: 170 },
  { x: 1020, w: 200, h: 240 },
  { x: 1220, w: 220, h: 175 },
  { x: 1440, w: 180, h: 210 },
  { x: 1620, w: 240, h: 160 },
  { x: 1860, w: 210, h: 225 },
  { x: 2070, w: 230, h: 175 },
  { x: 2300, w: 220, h: 200 },
  { x: 2520, w: 160, h: 170 },
]

function seeded(seed) {
  let value = seed % 2147483647
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

const random = seeded(1400)

const windows = []
for (const [index, facade] of facades.entries()) {
  const cols = Math.max(1, Math.floor((facade.w - 34) / 44))
  const rows = Math.max(1, Math.floor((facade.h - 70) / 52))

  for (let row = 0; row < rows; row++) {
    const y = groundY - facade.h + 24 + row * 52

    for (let col = 0; col < cols; col++) {
      windows.push({
        id: `${index}-${row}-${col}`,
        x: facade.x + 22 + col * 44,
        y,
        w: 24,
        h: 30,
        lit: random() > 0.42,
        flicker: random() > 0.93,
        delay: Math.round(random() * 80) / 10,
      })
    }
  }
}

const flags = Array.from({ length: 46 }, (_, index) => ({
  id: index,
  x: -20 + index * 60,
  y: 68 + Math.sin(index * 0.55) * 20,
  color: index % 5,
}))

const pots = Array.from({ length: 16 }, (_, index) => ({
  id: index,
  x: 40 + index * 165 + Math.round(random() * 40),
  scale: 0.8 + random() * 0.5,
}))

const flagColors = [
  'var(--dj-flag-blue)',
  'var(--dj-flag-white)',
  'var(--dj-flag-red)',
  'var(--dj-flag-green)',
  'var(--dj-flag-yellow)',
]
</script>

<template>
  <div class="dj-street" aria-hidden="true">
    <div class="dj-street__pan">
      <svg viewBox="0 0 2680 800" preserveAspectRatio="none">
        <!-- prayer flags -->
        <path
          class="dj-street__string"
          d="M-20,60 C420,110 900,30 1340,74 C1780,118 2260,36 2700,78"
        />
        <polygon
          v-for="flag in flags"
          :key="`flag-${flag.id}`"
          class="dj-street__flag"
          :points="`${flag.x},${flag.y} ${flag.x + 22},${flag.y + 2} ${flag.x + 11},${flag.y + 28}`"
          :fill="flagColors[flag.color]"
          opacity="0.85"
          :style="{ animationDelay: `${(flag.id % 7) * 0.21}s` }"
        />

        <!-- utility wires -->
        <path class="dj-street__wire" d="M0,210 C400,250 700,190 1080,236 C1460,282 1860,200 2680,250" />
        <path class="dj-street__wire" d="M0,240 C420,286 760,214 1120,262 C1520,314 1980,228 2680,282" />

        <!-- facades -->
        <g v-for="(facade, index) in facades" :key="`facade-${index}`" class="dj-street__facade">
          <rect
            :x="facade.x"
            :y="groundY - facade.h"
            :width="facade.w"
            :height="facade.h"
            rx="4"
            :class="index % 2 === 0 ? 'dj-street__wall-a' : 'dj-street__wall-b'"
          />
          <rect
            :x="facade.x + 10"
            :y="groundY - facade.h - 8"
            :width="facade.w - 20"
            height="10"
            rx="2"
            class="dj-street__cornice"
          />

        </g>

        <!-- windows -->
        <g>
          <rect
            v-for="window in windows"
            :key="window.id"
            :x="window.x"
            :y="window.y"
            :width="window.w"
            :height="window.h"
            rx="2"
            :class="[
              window.lit ? 'dj-street__window dj-street__window--lit' : 'dj-street__window',
              window.lit && window.flicker ? 'dj-street__window--flicker' : '',
            ]"
            :style="window.lit && window.flicker ? { animationDelay: `${window.delay}s` } : undefined"
          />
        </g>

        <!-- ground -->
        <rect x="0" y="664" width="2680" height="136" class="dj-street__ground" />
        <path d="M0,700 L2680,700" class="dj-street__curb" />
        <g class="dj-street__bricks">
          <path v-for="n in 14" :key="`brick-${n}`" :d="`M0,${664 + n * 9} L2680,${664 + n * 9}`" />
        </g>

        <!-- marigold pots -->
        <g v-for="pot in pots" :key="`pot-${pot.id}`" :transform="`translate(${pot.x}, 664) scale(${pot.scale})`">
          <rect x="-10" y="0" width="20" height="16" rx="3" class="dj-street__pot" />
          <circle cx="0" cy="-6" r="9" class="dj-street__bloom" />
          <circle cx="-8" cy="-2" r="7" class="dj-street__bloom" />
          <circle cx="8" cy="-2" r="7" class="dj-street__bloom" />
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.dj-street {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.dj-street__pan {
  position: absolute;
  inset: 0;
  width: 190%;
  height: 100%;
  transform: translateX(calc(var(--dj-p) * -36%));
  will-change: transform;
}

.dj-street svg {
  width: 100%;
  height: 100%;
  display: block;
}

.dj-street__string {
  fill: none;
  stroke: var(--dj-flag-line);
  stroke-width: 2;
}

.dj-street__flag {
  transform-box: fill-box;
  transform-origin: 50% 0%;
  animation: dj-flag-flutter 3.4s ease-in-out infinite;
}

.dj-street__wire {
  fill: none;
  stroke: var(--dj-wire);
  stroke-width: 2.5;
  opacity: 0.7;
}

.dj-street__wall-a {
  fill: var(--dj-wall-a);
}
.dj-street__wall-b {
  fill: var(--dj-wall-b);
}

.dj-street__cornice {
  fill: var(--dj-cornice);
}

.dj-street__window {
  fill: var(--dj-window-off);
}

.dj-street__window--lit {
  fill: var(--dj-window);
}

.dj-street__window--flicker {
  animation: dj-window-flicker 7.5s steps(1, end) infinite;
}

.dj-street__ground {
  fill: var(--dj-ground);
}

.dj-street__curb {
  stroke: var(--dj-curb);
  stroke-width: 3;
}

.dj-street__bricks path {
  stroke: var(--dj-brick);
  stroke-width: 1;
  opacity: 0.4;
}

.dj-street__pot {
  fill: var(--dj-pot);
}

.dj-street__bloom {
  fill: var(--dj-bloom);
}

@keyframes dj-flag-flutter {
  0%,
  100% {
    transform: skewX(0deg) scaleY(1);
  }
  50% {
    transform: skewX(4deg) scaleY(0.97);
  }
}

@keyframes dj-window-flicker {
  0%,
  90%,
  100% {
    opacity: 1;
  }
  91% {
    opacity: 0.3;
  }
  92% {
    opacity: 1;
  }
  94% {
    opacity: 0.45;
  }
  95% {
    opacity: 1;
  }
}


@media (prefers-reduced-motion: reduce) {
  .dj-street__flag,
  .dj-street__window--flicker {
    animation: none;
  }
}
</style>
