<script setup>
import { computed } from 'vue'

const props = defineProps({
  stop: {
    type: Object,
    required: true,
  },
  focus: {
    type: Number,
    default: 0,
  },
  align: {
    type: String,
    default: 'center',
  },
  rotation: {
    type: Number,
    default: 0,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const here = computed(() => props.focus >= 0.72)
const visible = computed(() => props.focus > 0.01)
const labelId = computed(() => `dj-stop-${props.stop.id}`)

const paperStyle = computed(() => ({
  '--dj-rot': `${props.compact ? 0 : props.rotation}deg`,
}))

const panelStyle = computed(() => ({
  '--dj-focus': props.focus,
  zIndex: here.value ? 6 : 5,
}))
</script>

<template>
  <section
    class="dj-panel"
    :class="[
      `dj-panel--${align}`,
      {
        'is-here': here,
        'is-visible': visible,
      },
    ]"
    :style="panelStyle"
    :inert="!here"
    :aria-hidden="!visible"
    :aria-labelledby="labelId"
  >
    <div class="dj-panel__paper" :style="paperStyle">
      <span class="dj-panel__pin" aria-hidden="true"></span>
      <h2 :id="labelId" class="dj-panel__sr">{{ stop.label }} — {{ stop.sub }}</h2>
      <div class="dj-panel__body">
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped>
.dj-panel {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  padding: clamp(84px, 12vh, 130px) clamp(18px, 6vw, 90px) clamp(120px, 18vh, 190px);
  padding-left: max(clamp(18px, 6vw, 90px), var(--dj-content-lane, 0px));
  pointer-events: none;
  z-index: 5;
}

.dj-panel--left {
  justify-content: flex-start;
}
.dj-panel--right {
  justify-content: flex-end;
}
.dj-panel--center {
  justify-content: center;
}

.dj-panel__paper {
  position: relative;
  width: min(540px, 92vw);
  max-width: 100%;
  max-height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: clamp(22px, 3vw, 38px);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-cream) 96%, white) 0%, var(--color-cream) 100%);
  color: var(--color-ink);
  border: 3px solid var(--color-ink);
  border-radius: 6px;
  box-shadow: 8px 8px 0 color-mix(in srgb, var(--color-ink) 85%, transparent);
  opacity: var(--dj-focus, 0);
  transform:
    translate3d(0, calc((1 - var(--dj-focus, 0)) * 24px), 0)
    rotate(var(--dj-rot))
    scale(calc(0.96 + var(--dj-focus, 0) * 0.04));
  will-change: transform, opacity;
  pointer-events: auto;
  scrollbar-width: thin;
}

.dj-panel:not(.is-here) .dj-panel__paper {
  pointer-events: none;
}

.dj-panel__pin {
  position: absolute;
  top: -13px;
  left: 50%;
  width: 46px;
  height: 22px;
  margin-left: -23px;
  background: color-mix(in srgb, var(--color-mustard) 70%, transparent);
  border: 2px solid color-mix(in srgb, var(--color-ink) 35%, transparent);
  transform: rotate(-2deg);
  opacity: 0.75;
}

.dj-panel__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.dj-panel__body {
  position: relative;
}

.dj-panel__body > * {
  opacity: var(--dj-focus, 0);
  transform: translateY(calc((1 - var(--dj-focus, 0)) * 14px));
}

@media (max-width: 720px) {
  .dj-panel {
    padding: 78px 14px 128px;
    align-items: flex-start;
  }

  .dj-panel--left,
  .dj-panel--right,
  .dj-panel--center {
    justify-content: center;
  }

  .dj-panel__paper {
    width: 100%;
    max-height: min(62vh, 520px);
    box-shadow: 5px 5px 0 color-mix(in srgb, var(--color-ink) 80%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dj-panel__paper,
  .dj-panel__body > * {
    transition: none;
    will-change: auto;
  }
}
</style>
