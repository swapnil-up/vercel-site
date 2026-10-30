<template>
  <div class="dj-foreground" aria-hidden="true">
    <div class="dj-foreground__pan">
      <svg viewBox="0 0 1800 420" preserveAspectRatio="none">
        <path
          class="dj-foreground__shadow"
          d="M0,330 C180,312 320,344 520,330 C720,316 880,350 1080,334 C1280,318 1440,352 1800,330 L1800,420 L0,420 Z"
        />

        <g class="dj-foreground__wall">
          <path d="M0,360 C220,344 420,370 640,358 C860,346 1080,376 1300,360 C1500,346 1660,372 1800,356 L1800,420 L0,420 Z" />
        </g>

        <g class="dj-foreground__plants">
          <g transform="translate(120,332) scale(1.15)">
            <path d="M0,70 C-4,36 6,12 12,0 C20,20 18,46 10,70 Z" />
            <path d="M-2,70 C-22,48 -26,24 -22,8 C-6,18 2,40 6,70 Z" />
            <path d="M8,70 C28,50 34,26 30,10 C14,20 8,42 4,70 Z" />
          </g>
          <g transform="translate(1460,340) scale(1.3)">
            <path d="M0,62 C-4,32 6,12 12,0 C20,18 18,42 10,62 Z" />
            <path d="M-2,62 C-22,42 -26,22 -22,6 C-6,16 2,36 6,62 Z" />
            <path d="M8,62 C28,44 34,22 30,8 C14,18 8,38 4,62 Z" />
          </g>
          <g transform="translate(1050,352) scale(0.95)">
            <path d="M0,52 C-4,26 4,10 10,0 C16,16 15,36 8,52 Z" />
            <path d="M-2,52 C-18,36 -22,18 -18,6 C-4,14 2,32 5,52 Z" />
            <path d="M7,52 C23,38 28,20 24,8 C11,16 6,34 3,52 Z" />
          </g>
        </g>

        <g class="dj-foreground__lamps">
          <g transform="translate(360,0)">
            <rect x="-3" y="190" width="6" height="230" rx="3" />
            <path d="M-16,190 L16,190 L10,176 L-10,176 Z" />
            <circle cx="0" cy="206" r="26" opacity="0.14" />
          </g>
          <g transform="translate(1320,0)">
            <rect x="-3" y="180" width="6" height="240" rx="3" />
            <path d="M-16,180 L16,180 L10,166 L-10,166 Z" />
            <circle cx="0" cy="196" r="26" opacity="0.14" />
          </g>
        </g>

        <g class="dj-foreground__wire">
          <path d="M0,120 C300,160 560,92 860,142 C1160,192 1460,110 1800,152" />
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.dj-foreground {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.dj-foreground__pan {
  position: absolute;
  inset: 0;
  width: 160%;
  height: 100%;
  transform: translateX(calc(var(--dj-p) * -52%));
  will-change: transform;
}

.dj-foreground svg {
  width: 100%;
  height: 100%;
  display: block;
}

.dj-foreground__shadow {
  fill: rgba(10, 7, 14, 0.4);
}

.dj-foreground__wall path {
  fill: color-mix(in srgb, var(--dj-ground) 88%, black);
}

.dj-foreground__plants path {
  fill: color-mix(in srgb, var(--dj-wall-a) 82%, black);
}

.dj-foreground__lamps rect,
.dj-foreground__lamps path {
  fill: color-mix(in srgb, var(--dj-wire) 90%, black);
}

.dj-foreground__lamps circle {
  fill: var(--dj-window);
}

.dj-foreground__wire path {
  fill: none;
  stroke: color-mix(in srgb, var(--dj-wire) 80%, black);
  stroke-width: 2.5;
  opacity: 0.65;
}
</style>
