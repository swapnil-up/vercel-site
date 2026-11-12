<script setup>
defineProps({
  chapters: { type: Array, required: true },
  active: { type: Number, default: 0 },
  progress: { type: Number, default: 0 },
})

defineEmits(['select'])
</script>

<template>
  <nav class="rail" aria-label="Chapters along the walk">
    <div class="rail__track" aria-hidden="true">
      <span class="rail__fill" :style="{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }"></span>
    </div>

    <ol class="rail__list">
      <li v-for="(chapter, index) in chapters" :key="chapter.id">
        <button
          type="button"
          class="rail__btn"
          :class="{ 'is-active': index === active, 'is-done': index < active }"
          :aria-current="index === active ? 'step' : undefined"
          @click="$emit('select', index)"
        >
          <span class="rail__num" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="rail__text">
            <span class="rail__label">{{ chapter.label }}</span>
            <span class="rail__sub">{{ chapter.sub }}</span>
          </span>
        </button>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.rail {
  position: absolute;
  left: 50%;
  bottom: clamp(14px, 2.6vh, 26px);
  z-index: 11;
  width: min(880px, calc(100% - 32px));
  translate: -50% 0;
  padding: 12px 16px 10px;
  background: color-mix(in srgb, var(--color-cream) 84%, transparent);
  border: 2px solid var(--color-ink);
  border-radius: 16px;
  box-shadow: 4px 4px 0 color-mix(in srgb, var(--color-ink) 85%, transparent);
  backdrop-filter: blur(8px);
  color: var(--color-ink);
}

.rail__track {
  position: relative;
  height: 3px;
  margin-bottom: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-ink) 18%, transparent);
  overflow: hidden;
}

.rail__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-coral), var(--color-mustard));
}

.rail__list {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rail__btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 6px 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: color 0.15s ease;
}

.rail__btn:hover,
.rail__btn:focus-visible {
  background: color-mix(in srgb, var(--color-coral) 14%, transparent);
  outline: none;
}

.rail__btn:focus-visible {
  box-shadow: 0 0 0 2px var(--color-coral);
}

.rail__num {
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--color-warm-muted);
}

.rail__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rail__label {
  font-family: var(--font-display);
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rail__sub {
  font-size: 0.66rem;
  line-height: 1.2;
  color: var(--color-warm-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rail__btn.is-done .rail__num {
  color: var(--color-coral-ink);
}

.rail__btn.is-active {
  background: var(--color-coral);
  color: var(--color-ink);
}

.rail__btn.is-active .rail__num,
.rail__btn.is-active .rail__sub {
  color: var(--color-ink);
}

@media (max-width: 720px) {
  .rail {
    width: calc(100% - 20px);
    padding: 9px 10px 7px;
    border-radius: 13px;
  }

  .rail__sub {
    display: none;
  }

  .rail__btn {
    flex-direction: column;
    gap: 2px;
    justify-content: center;
    padding: 4px 2px;
  }

  .rail__label {
    font-size: 0.68rem;
    text-align: center;
  }
}
</style>
