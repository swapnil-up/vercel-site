<script setup>
const baseY = 660

const buildings = [
  { x: -40, w: 170, h: 210 },
  { x: 140, w: 130, h: 305 },
  { x: 280, w: 110, h: 165 },
  { x: 560, w: 160, h: 340 },
  { x: 730, w: 120, h: 240 },
  { x: 860, w: 140, h: 185 },
  { x: 1080, w: 180, h: 385 },
  { x: 1270, w: 120, h: 240 },
  { x: 1390, w: 150, h: 200 },
  { x: 1660, w: 130, h: 180 },
  { x: 1800, w: 170, h: 275 },
  { x: 1980, w: 150, h: 215 },
  { x: 2140, w: 160, h: 190 },
]

function seeded(seed) {
  let value = seed % 2147483647
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

const random = seeded(2026)
const windows = []

for (const [index, building] of buildings.entries()) {
  const cols = Math.max(1, Math.floor((building.w - 22) / 30))
  const rows = Math.max(1, Math.floor((building.h - 26) / 34))

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (random() > 0.55) continue
      windows.push({
        id: `${index}-${row}-${col}`,
        x: building.x + 14 + col * 30,
        y: baseY - building.h + 16 + row * 34,
        opacity: 0.35 + random() * 0.55,
      })
    }
  }
}
</script>

<template>
  <div class="dj-city" aria-hidden="true">
    <div class="dj-city__glow"></div>
    <div class="dj-city__pan">
      <svg viewBox="0 0 2200 700" preserveAspectRatio="none">
        <g class="dj-city__far">
          <rect
            v-for="(building, index) in buildings"
            :key="`b-${index}`"
            :x="building.x"
            :y="baseY - building.h"
            :width="building.w"
            :height="building.h"
            rx="3"
          />
          <rect
            v-for="window in windows"
            :key="window.id"
            class="dj-city__win"
            :x="window.x"
            :y="window.y"
            width="7"
            height="10"
            :style="{ opacity: window.opacity }"
          />
          <rect
            v-for="(building, index) in buildings.slice(0, 6)"
            :key="`tank-${index}`"
            :x="building.x + building.w * 0.55"
            :y="baseY - building.h - 16"
            width="22"
            height="16"
            rx="4"
          />
        </g>

        <g class="dj-city__near">
          <path d="M0,660 L0,624 L2200,624 L2200,660 Z" />

          <!-- Boudhanath-style stupa -->
          <g class="dj-city__stupa">
            <rect x="360" y="596" width="250" height="34" rx="3" />
            <rect x="398" y="566" width="174" height="30" rx="3" />
            <path d="M414,566 C414,478 556,478 556,566 Z" />
            <rect x="470" y="452" width="32" height="26" rx="2" />
            <path d="M486,452 L478,376 L494,376 Z" />
            <path d="M474,392 L498,392 M476,404 L496,404 M477,416 L495,416 M479,428 L493,428 M480,440 L492,440" />
            <path d="M486,376 L486,362 M468,366 L504,366" />
            <g class="dj-city__flags">
              <path d="M486,368 L380,318" />
              <path d="M486,368 L600,320" />
              <path d="M486,368 L430,300" />
              <path d="M486,368 L548,298" />
            </g>
          </g>

          <!-- Pagoda temple -->
          <g class="dj-city__pagoda">
            <rect x="1440" y="598" width="210" height="30" rx="3" />
            <path d="M1436,598 L1654,598 L1640,576 L1450,576 Z" />
            <path d="M1452,576 L1638,576 L1618,552 L1472,552 Z" />
            <path d="M1472,552 L1618,552 L1598,530 L1492,530 Z" />
            <path d="M1446,578 L1420,588 L1440,598 Z" />
            <path d="M1644,578 L1670,588 L1650,598 Z" />
            <rect x="1536" y="470" width="18" height="60" rx="2" />
            <path d="M1545,470 L1545,452 M1531,456 L1559,456" />
          </g>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.dj-city {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.dj-city__glow {
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: 8%;
  height: 46%;
  background: radial-gradient(ellipse at 50% 100%, var(--dj-city-glow), transparent 70%);
  opacity: calc(0.25 + var(--dj-p) * 0.75);
}

.dj-city__pan {
  position: absolute;
  inset: 0;
  width: 170%;
  height: 100%;
  transform: translateX(calc(var(--dj-p) * -18%));
  will-change: transform;
}

.dj-city svg {
  width: 100%;
  height: 100%;
  display: block;
}

.dj-city__far rect {
  fill: var(--dj-city-far);
}

.dj-city__far .dj-city__win {
  fill: var(--dj-window);
}

.dj-city__near {
  fill: var(--dj-city-near);
}

.dj-city__stupa path,
.dj-city__stupa rect,
.dj-city__pagoda path,
.dj-city__pagoda rect {
  fill: var(--dj-city-near);
}

.dj-city__flags path {
  fill: none;
  stroke: var(--dj-flag-line);
  stroke-width: 2;
  stroke-dasharray: 5 7;
}

.dj-city__pagoda path:first-of-type,
.dj-city__pagoda path:nth-of-type(2),
.dj-city__pagoda path:nth-of-type(3) {
  fill: var(--dj-roof);
}
</style>
