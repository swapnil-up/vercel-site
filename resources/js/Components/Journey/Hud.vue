<script setup>
import { computed } from 'vue'
import { useDarkMode } from '@/Composables/useDarkMode'
import { useAmbience } from '@/Composables/useAmbience'

const props = defineProps({
  stops: {
    type: Array,
    required: true,
  },
  active: {
    type: Number,
    default: 0,
  },
  position: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['select', 'prev', 'next'])

const { isDark, toggle } = useDarkMode()
const { enabled: soundOn, supported: soundSupported, toggle: toggleSound } = useAmbience()

const activeStop = computed(() => props.stops[props.active] ?? props.stops[0])
const isLast = computed(() => props.active >= props.stops.length - 1)
const walkProgress = computed(() => props.position / Math.max(props.stops.length - 1, 1))

function tickOffset(index) {
  return `${(index / Math.max(props.stops.length - 1, 1)) * 100}%`
}
</script>

<template>
  <div class="dj-hud">
    <header class="dj-hud__top">
      <div class="dj-hud__brand">
        <span class="dj-hud__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M6 14c0-3 2.6-6 6-6s6 3 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <circle cx="9" cy="9" r="1.6" fill="currentColor" />
            <circle cx="15" cy="9" r="1.6" fill="currentColor" />
            <path d="M9 15.5c1.6 1.4 4.4 1.4 6 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </span>
        <div>
          <p class="dj-hud__title">Dulna Jaam</p>
          <p class="dj-hud__subtitle">Swap's musings, on foot</p>
        </div>
      </div>

      <div class="dj-hud__actions">
        <button
          v-if="soundSupported"
          type="button"
          class="dj-hud__btn"
          :class="{ 'is-on': soundOn }"
          :aria-label="soundOn ? 'Turn off street ambience' : 'Turn on street ambience'"
          :aria-pressed="soundOn"
          :title="soundOn ? 'Sound off' : 'Sound on'"
          @click="toggleSound"
        >
          <svg v-if="soundOn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="m16 9 5 6M21 9l-5 6" />
          </svg>
        </button>
        <button
          type="button"
          class="dj-hud__btn"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="isDark ? 'Light mode' : 'Dark mode'"
          @click="toggle"
        >
          <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
        <a class="dj-hud__btn dj-hud__btn--text" href="/?static=1">
          Read as a page
        </a>
      </div>
    </header>

    <footer class="dj-hud__bottom">
      <div class="dj-hud__rail" aria-hidden="true">
        <span class="dj-hud__rail-fill" :style="{ width: `${walkProgress * 100}%` }"></span>
      </div>

      <nav class="dj-hud__places" aria-label="Places along the walk">
        <button
          v-for="(stop, index) in stops"
          :key="stop.id"
          type="button"
          class="dj-hud__place"
          :class="{
            'is-active': index === active,
            'is-done': index < active,
          }"
          :style="{ left: tickOffset(index) }"
          :aria-label="`Jump to ${stop.label}, ${stop.sub}`"
          :title="`${stop.label} · ${stop.sub}`"
          :aria-current="index === active ? 'step' : undefined"
          @click="emit('select', index)"
        >
          <span class="dj-hud__dot" aria-hidden="true"></span>
        </button>
      </nav>

      <div class="dj-hud__meta">
        <p class="dj-hud__hint">
          <span class="dj-hud__hint-desktop">Scroll to walk · jump along the rail</span>
          <span class="dj-hud__hint-mobile">swipe up to walk</span>
        </p>
        <div class="dj-hud__travel">
          <p class="dj-hud__here" aria-live="polite" aria-atomic="true">{{ activeStop.label }} · {{ activeStop.sub }}</p>
          <button
            v-if="active > 0"
            type="button"
            class="dj-hud__step"
            aria-label="Walk back"
            @click="emit('prev')"
          >←</button>
          <button
            v-if="!isLast"
            type="button"
            class="dj-hud__step dj-hud__step--next"
            aria-label="Walk further"
            @click="emit('next')"
          >→</button>
          <button
            v-else
            type="button"
            class="dj-hud__step dj-hud__step--next"
            aria-label="Walk back to Ghar"
            @click="emit('select', 0)"
          >↺</button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.dj-hud {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.dj-hud__top,
.dj-hud__bottom {
  pointer-events: auto;
}

.dj-hud__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: clamp(16px, 2.4vw, 28px) clamp(18px, 3vw, 40px);
}

.dj-hud__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 8px 10px;
  background: color-mix(in srgb, var(--color-cream) 82%, transparent);
  border: 2px solid var(--color-ink);
  border-radius: 999px;
  box-shadow: 3px 3px 0 var(--color-ink);
  backdrop-filter: blur(6px);
}

.dj-hud__mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--color-coral);
  color: var(--color-cream);
}

.dj-hud__mark svg {
  width: 20px;
  height: 20px;
}

.dj-hud__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.1;
  color: var(--color-ink);
  white-space: nowrap;
}

.dj-hud__subtitle {
  margin: 1px 0 0;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-warm-muted);
}

.dj-hud__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dj-hud__btn {
  display: inline-grid;
  place-items: center;
  min-width: 38px;
  height: 38px;
  padding: 0 10px;
  border: 2px solid var(--color-ink);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-cream) 82%, transparent);
  color: var(--color-ink);
  box-shadow: 3px 3px 0 var(--color-ink);
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.dj-hud__btn svg {
  width: 18px;
  height: 18px;
}

.dj-hud__btn:hover {
  background: var(--color-coral);
  color: var(--color-cream);
  transform: translate(-1px, -1px);
}

.dj-hud__btn.is-on {
  background: var(--color-coral);
  color: var(--color-cream);
}

.dj-hud__btn--text {
  width: auto;
  padding: 0 14px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.dj-hud__bottom {
  padding: 0 clamp(18px, 3vw, 40px) clamp(14px, 2.4vw, 26px);
}

.dj-hud__rail {
  position: relative;
  height: 3px;
  margin-bottom: 15px;
  border-radius: 999px;
  background: var(--dj-hud-line);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
}

.dj-hud__rail-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-coral), var(--color-mustard));
  transition: width 0.12s linear;
}

.dj-hud__places {
  position: relative;
  height: 18px;
  margin: -24px 0 10px;
  pointer-events: none;
}

.dj-hud__place {
  position: absolute;
  top: 50%;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--dj-hud-soft);
  cursor: pointer;
  translate: -50% -50%;
  pointer-events: auto;
}

.dj-hud__place .dj-hud__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.6;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.45);
  transition: transform 0.2s ease, opacity 0.2s ease, background 0.2s ease;
}

.dj-hud__place.is-done .dj-hud__dot {
  opacity: 0.9;
}

.dj-hud__place.is-active .dj-hud__dot {
  background: var(--color-coral);
  opacity: 1;
  transform: scale(1.55);
}

.dj-hud__place:hover .dj-hud__dot,
.dj-hud__place:focus-visible .dj-hud__dot {
  background: var(--color-mustard);
  opacity: 1;
}

.dj-hud__place:focus-visible {
  outline: 2px solid var(--color-cream);
  outline-offset: 2px;
}

.dj-hud__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 6px;
}

.dj-hud__hint,
.dj-hud__here {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--dj-hud-soft);
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
}

.dj-hud__here {
  font-family: var(--font-display);
  font-weight: 600;
  white-space: nowrap;
}

.dj-hud__travel {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dj-hud__step {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1.5px solid color-mix(in srgb, var(--dj-hud-fg) 55%, transparent);
  border-radius: 50%;
  background: rgba(20, 14, 24, 0.45);
  color: var(--dj-hud-fg);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background 0.15s ease, border-color 0.15s ease;
}

.dj-hud__step:hover {
  background: var(--color-coral);
  border-color: var(--color-coral);
}

.dj-hud__hint-mobile {
  display: none;
}

@media (max-width: 720px) {
  .dj-hud__brand {
    gap: 8px;
    padding: 6px 10px 6px 8px;
  }

  .dj-hud__mark {
    width: 26px;
    height: 26px;
  }

  .dj-hud__title {
    font-size: 13px;
  }

  .dj-hud__actions {
    gap: 6px;
  }

  .dj-hud__btn {
    min-width: 34px;
    height: 34px;
    padding: 0 7px;
  }

  .dj-hud__subtitle,
  .dj-hud__hint-desktop,
  .dj-hud__here {
    display: none;
  }

  .dj-hud__hint-mobile {
    display: inline;
  }

  .dj-hud__btn--text {
    font-size: 10px;
    padding: 0 8px;
  }
}
</style>
