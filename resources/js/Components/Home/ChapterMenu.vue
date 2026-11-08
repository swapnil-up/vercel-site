<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Link } from '@inertiajs/vue3'

const props = defineProps({
  chapters: { type: Array, required: true },
  active: { type: Number, default: 0 },
})

const emit = defineEmits(['select'])

const open = ref(false)
const dialog = ref(null)
let lastFocused = null

function focusables() {
  if (!dialog.value) return []
  return Array.from(
    dialog.value.querySelectorAll('a[href], button:not([disabled])'),
  )
}

function openMenu() {
  lastFocused = document.activeElement
  open.value = true
}

function closeMenu() {
  open.value = false
  if (lastFocused instanceof HTMLElement) lastFocused.focus()
}

function choose(index) {
  emit('select', index)
  closeMenu()
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu()
    return
  }
  if (event.key !== 'Tab') return

  const items = focusables()
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(open, async (value) => {
  if (value) {
    await nextTick()
    focusables()[0]?.focus()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})

watch(open, (value) => {
  if (value) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="cmenu">
    <button
      type="button"
      class="cmenu__trigger"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="openMenu"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      <span>Chapters</span>
    </button>

    <Transition name="cmenu">
      <div
        v-if="open"
        class="cmenu__overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Jump to a chapter"
        @click.self="closeMenu"
      >
        <div ref="dialog" class="cmenu__panel">
          <header class="cmenu__head">
            <p class="cmenu__kicker">Dulna Jaam · the walk</p>
            <h2 class="cmenu__title">Pick a chapter</h2>
          </header>

          <ol class="cmenu__list">
            <li v-for="(chapter, index) in chapters" :key="chapter.id">
              <div class="cmenu__row" :class="{ 'is-active': index === active }">
                <button type="button" class="cmenu__jump" @click="choose(index)">
                  <span class="cmenu__num">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span class="cmenu__text">
                    <span class="cmenu__label">{{ chapter.label }}</span>
                    <span class="cmenu__sub">{{ chapter.sub }} · {{ chapter.hint }}</span>
                  </span>
                </button>
                <Link :href="chapter.href" class="cmenu__go">
                  {{ chapter.cta }}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </li>
          </ol>

          <button type="button" class="cmenu__close" @click="closeMenu">Close</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cmenu {
  position: absolute;
  top: clamp(12px, 2.2vh, 22px);
  right: clamp(14px, 3vw, 40px);
  z-index: 13;
}

.cmenu__trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 14px;
  border: 2px solid var(--color-ink);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-cream) 86%, transparent);
  color: var(--color-ink);
  box-shadow: 3px 3px 0 color-mix(in srgb, var(--color-ink) 85%, transparent);
  font-family: var(--font-display);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.15s ease, color 0.15s ease;
}

.cmenu__trigger svg {
  width: 16px;
  height: 16px;
}

.cmenu__trigger:hover {
  background: var(--color-coral);
  color: #fff8f0;
}

.cmenu__overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 20px;
  background: color-mix(in srgb, #140e18 72%, transparent);
  backdrop-filter: blur(4px);
}

.cmenu__panel {
  width: min(560px, 100%);
  max-height: min(80vh, 640px);
  overflow-y: auto;
  padding: clamp(20px, 4vw, 34px);
  background: var(--color-cream);
  color: var(--color-ink);
  border: 3px solid var(--color-ink);
  border-radius: 8px;
  box-shadow: 8px 8px 0 color-mix(in srgb, var(--color-ink) 85%, transparent);
}

.cmenu__kicker {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-warm-muted);
}

.cmenu__title {
  margin: 4px 0 18px;
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 800;
}

.cmenu__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
}

.cmenu__row {
  display: flex;
  align-items: stretch;
  gap: 8px;
  border: 2px solid var(--color-warm-border);
  border-radius: 10px;
  overflow: hidden;
}

.cmenu__row.is-active {
  border-color: var(--color-coral);
}

.cmenu__jump {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-height: 52px;
  padding: 8px 12px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.cmenu__jump:hover {
  background: color-mix(in srgb, var(--color-coral) 12%, transparent);
}

.cmenu__num {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--color-coral);
}

.cmenu__text {
  display: flex;
  flex-direction: column;
}

.cmenu__label {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
}

.cmenu__sub {
  font-size: 0.76rem;
  color: var(--color-warm-muted);
}

.cmenu__go {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 14px;
  background: color-mix(in srgb, var(--color-mustard) 26%, transparent);
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.cmenu__go:hover {
  background: var(--color-coral);
  color: #fff8f0;
}

.cmenu__close {
  display: block;
  width: 100%;
  min-height: 44px;
  border: 2px solid var(--color-ink);
  border-radius: 999px;
  background: transparent;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-weight: 700;
  cursor: pointer;
}

.cmenu__close:hover {
  background: var(--color-ink);
  color: var(--color-cream);
}

.cmenu-enter-active,
.cmenu-leave-active {
  transition: opacity 0.18s ease;
}

.cmenu-enter-from,
.cmenu-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .cmenu-enter-active,
  .cmenu-leave-active {
    transition: none;
  }
}
</style>
