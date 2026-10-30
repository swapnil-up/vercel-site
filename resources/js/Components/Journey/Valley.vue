<template>
  <div class="dj-valley" aria-hidden="true">
    <div class="dj-valley__pan">
      <svg viewBox="0 0 1800 620" preserveAspectRatio="none">
        <defs>
          <linearGradient id="dj-ridge-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--dj-ridge-far-top)" />
            <stop offset="100%" stop-color="var(--dj-ridge-far-bottom)" />
          </linearGradient>
          <linearGradient id="dj-ridge-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--dj-ridge-mid-top)" />
            <stop offset="100%" stop-color="var(--dj-ridge-mid-bottom)" />
          </linearGradient>
        </defs>

        <path
          d="M0,520 L120,420 L180,452 L260,360 L330,432 L420,300 L500,402 L560,342 L650,452 L740,382 L820,472 L900,392 L980,300 L1060,412 L1140,342 L1220,442 L1300,372 L1380,462 L1470,382 L1560,452 L1650,392 L1740,472 L1800,520 L1800,620 L0,620 Z"
          fill="url(#dj-ridge-far)"
        />

        <g fill="var(--dj-snow)">
          <path d="M385,362 L420,300 L455,362 L440,356 L432,372 L420,360 L408,372 L400,356 Z" />
          <path d="M945,362 L980,300 L1015,362 L1000,356 L992,372 L980,360 L968,372 L960,356 Z" />
          <path d="M232,408 L260,360 L288,408 L276,402 L268,416 L260,406 L250,416 L244,402 Z" />
          <path d="M1105,384 L1140,342 L1175,384 L1162,378 L1154,392 L1140,382 L1128,392 L1118,378 Z" />
          <path d="M1272,414 L1300,372 L1328,414 L1316,408 L1308,422 L1300,412 L1290,422 L1284,408 Z" />
          <path d="M1548,428 L1560,452 L1572,428 Z" opacity="0.7" />
        </g>

        <path
          d="M0,560 C200,518 320,556 480,540 C650,524 760,562 920,548 C1080,534 1200,568 1360,552 C1520,536 1660,568 1800,548 L1800,620 L0,620 Z"
          fill="url(#dj-ridge-mid)"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.dj-valley {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.dj-valley__pan {
  width: 150%;
  height: 100%;
  transform: translateX(calc(var(--dj-p) * -8%));
  will-change: transform;
}

.dj-valley svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
