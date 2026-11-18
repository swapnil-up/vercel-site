<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import {
  createIdentityOrder,
  createShuffledOrder,
  normalizeDeckState,
  parseCardDeck,
} from '@/Utils/cardViewer.js'

const STORAGE_KEY = 'card-viewer:v2'
const LEGACY_STORAGE_KEY = 'card-viewer:v1'

const cards = ref([])
const order = ref([])
const position = ref(0)
const isFlipped = ref(false)
const isShuffled = ref(false)
const deckText = ref('')
const deckName = ref('')
const errorMessage = ref('')
const isDragging = ref(false)
const isJumpOpen = ref(false)
const jumpValue = ref('')
const fileInput = ref(null)
const jumpInput = ref(null)

const hasDeck = computed(() => cards.value.length > 0)
const currentCard = computed(() => {
  const cardIndex = order.value[position.value]
  return cardIndex === undefined ? null : cards.value[cardIndex]
})
const cardNumber = computed(() => `${position.value + 1} / ${order.value.length}`)
const progress = computed(() =>
  order.value.length ? ((position.value + 1) / order.value.length) * 100 : 0
)
const canGoPrevious = computed(() => position.value > 0)
const canGoNext = computed(() => position.value < order.value.length - 1)
const accessibleCard = computed(() => {
  if (!currentCard.value) return ''

  return isFlipped.value
    ? `Answer: ${currentCard.value.answer}`
    : `Question: ${currentCard.value.question}. Activate to reveal the answer.`
})

const persistDeck = () => {
  if (!hasDeck.value || !deckText.value) return

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        text: deckText.value,
        name: deckName.value,
        pos: position.value,
        order: order.value,
        shuffled: isShuffled.value,
      })
    )
  } catch {
    // The deck still works when storage is unavailable or full.
  }
}

const loadDeck = (text, name, savedState = null) => {
  const parsedCards = parseCardDeck(text)

  if (!parsedCards.length) {
    errorMessage.value = 'No cards found. Expected question | answer | extra lines.'
    return false
  }

  const restoredState = normalizeDeckState(savedState, parsedCards.length)

  cards.value = parsedCards
  deckText.value = text
  deckName.value = name || 'restored deck'
  order.value = restoredState.order
  position.value = restoredState.position
  isShuffled.value = restoredState.shuffled
  isFlipped.value = false
  isJumpOpen.value = false
  errorMessage.value = ''

  persistDeck()
  return true
}

const restoreDeck = () => {
  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue

      const saved = JSON.parse(raw)
      if (saved?.text) {
        loadDeck(saved.text, saved.name || 'restored deck', saved)
        return
      }
    } catch {
      // Ignore unreadable or legacy-corrupt state and keep the empty state.
    }
  }
}

const openFilePicker = () => fileInput.value?.click()

const readFile = async (file) => {
  if (!file) return

  try {
    const text = await file.text()
    loadDeck(text, file.name)
  } catch {
    errorMessage.value = 'That file could not be read.'
  }
}

const onFileChange = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  readFile(file)
}

const onDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  readFile(file)
}

const onDragOver = () => {
  isDragging.value = true
}

const onDragLeave = (event) => {
  if (!event.relatedTarget) isDragging.value = false
}

const flip = () => {
  if (hasDeck.value) isFlipped.value = !isFlipped.value
}

const go = (amount) => {
  const nextPosition = position.value + amount
  if (nextPosition < 0 || nextPosition >= order.value.length) return

  position.value = nextPosition
  isFlipped.value = false
  persistDeck()
}

const toggleShuffle = () => {
  if (!hasDeck.value) return

  isShuffled.value = !isShuffled.value
  order.value = isShuffled.value
    ? createShuffledOrder(cards.value.length)
    : createIdentityOrder(cards.value.length)
  position.value = 0
  isFlipped.value = false
  persistDeck()
}

const openJump = async () => {
  if (!hasDeck.value) return

  isJumpOpen.value = true
  jumpValue.value = String(position.value + 1)
  await nextTick()
  jumpInput.value?.focus()
  jumpInput.value?.select()
}

const closeJump = () => {
  isJumpOpen.value = false
}

const submitJump = () => {
  const requestedPosition = Number.parseInt(jumpValue.value, 10)

  if (
    Number.isInteger(requestedPosition) &&
    requestedPosition >= 1 &&
    requestedPosition <= order.value.length
  ) {
    position.value = requestedPosition - 1
    isFlipped.value = false
    persistDeck()
  }

  closeJump()
}

const handleJumpKeydown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    submitJump()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeJump()
  }
}

const handleKeydown = (event) => {
  if (!hasDeck.value || event.metaKey || event.ctrlKey || event.altKey) return

  const targetTag = event.target?.tagName
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) || event.target?.isContentEditable) {
    return
  }

  if (event.key === ' ') {
    if (['BUTTON', 'A'].includes(targetTag)) return
    event.preventDefault()
    flip()
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
    flip()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    go(1)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    go(-1)
  } else if (event.key.toLowerCase() === 's') {
    toggleShuffle()
  } else if (event.key.toLowerCase() === 'g') {
    event.preventDefault()
    openJump()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  restoreDeck()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    class="card-viewer"
    :class="{ 'is-dragging': isDragging }"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="grain" aria-hidden="true"></div>
    <div class="progress" :style="{ width: `${progress}%` }" aria-hidden="true"></div>

    <header>
      <div class="file-summary" :title="deckName">
        <template v-if="hasDeck">
          <span class="file-name">{{ deckName }}</span>
          <span aria-hidden="true">·</span>
          <b>{{ cards.length }} cards</b>
        </template>
        <template v-else>
          <span>no deck loaded</span>
        </template>
      </div>

      <span class="spacer"></span>

      <div v-if="hasDeck" class="position-controls">
        <button
          v-if="!isJumpOpen"
          type="button"
          class="counter"
          title="Jump to a card"
          aria-label="Jump to a card"
          @click="openJump"
        >
          <b>{{ position + 1 }}</b> / {{ cards.length }}
        </button>
        <input
          v-else
          ref="jumpInput"
          v-model="jumpValue"
          class="jump"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          aria-label="Card number"
          @keydown="handleJumpKeydown"
          @blur="closeJump"
        />
      </div>

      <button
        v-if="hasDeck"
        type="button"
        class="tool-button"
        :class="{ active: isShuffled }"
        :aria-pressed="isShuffled"
        title="Shuffle cards (S)"
        @click="toggleShuffle"
      >
        shuffle
      </button>

      <button type="button" class="tool-button" title="Load a CSV deck" @click="openFilePicker">
        load csv
      </button>
    </header>

    <main>
      <button
        v-if="!hasDeck"
        type="button"
        class="empty-state"
        :class="{ dragging: isDragging }"
        @click="openFilePicker"
      >
        <span class="empty-title">drop a deck <em>here</em></span>
        <span class="empty-subtitle">or click to browse — any *-anki.csv</span>
        <span class="empty-format">pipe format · question | answer | extra · no header</span>
      </button>

      <section v-else class="stage" aria-label="Flashcard deck">
        <div class="card-wrap">
          <button
            type="button"
            class="card"
            :class="{ flipped: isFlipped }"
            :aria-label="accessibleCard"
            :aria-pressed="isFlipped"
            title="Click to flip"
            @click="flip"
          >
            <span class="face front" aria-hidden="true">
              <span class="tag">
                <span>question</span>
                <span class="card-number">{{ cardNumber }}</span>
              </span>
              <span class="question-text">{{ currentCard.question }}</span>
            </span>

            <span class="face back" aria-hidden="true">
              <span class="tag">
                <span>answer</span>
                <span class="card-number">{{ cardNumber }}</span>
              </span>
              <span class="answer-text">{{ currentCard.answer }}</span>
              <span v-if="currentCard.extra" class="context">
                <span class="context-label">context</span>
                <span class="context-text">{{ currentCard.extra }}</span>
              </span>
            </span>
          </button>
        </div>

        <nav class="navigation" aria-label="Card navigation">
          <button
            type="button"
            :disabled="!canGoPrevious"
            aria-label="Previous card"
            @click="go(-1)"
          >
            ‹
          </button>

          <span class="hint">
            <kbd>space</kbd>/<kbd>↑</kbd><kbd>↓</kbd> flip
            <span class="hint-divider">·</span>
            <kbd>←</kbd><kbd>→</kbd> move
            <span class="hint-divider">·</span>
            <kbd>S</kbd> shuffle
            <span class="hint-divider">·</span>
            <kbd>G</kbd> jump
          </span>

          <button
            type="button"
            :disabled="!canGoNext"
            aria-label="Next card"
            @click="go(1)"
          >
            ›
          </button>
        </nav>
      </section>
    </main>

    <input
      ref="fileInput"
      type="file"
      accept=".csv,.txt,text/csv,text/plain"
      hidden
      @change="onFileChange"
    />

    <p v-if="errorMessage" class="error-toast" role="alert">
      <span>{{ errorMessage }}</span>
      <button type="button" aria-label="Dismiss error" @click="errorMessage = ''">×</button>
    </p>

    <span class="sr-only" aria-live="polite">{{ accessibleCard }}</span>
  </div>
</template>

<style scoped>
.card-viewer {
  --desk: #14151a;
  --paper: #f4eee1;
  --paper-shade: #ebe3d3;
  --ink: #232019;
  --ink-soft: #5c564a;
  --faint: #7d776b;
  --accent: #c4442a;
  --amber: #e2a94f;

  position: relative;
  isolation: isolate;
  display: flex;
  height: calc(100svh - 4rem);
  min-height: 560px;
  flex-direction: column;
  overflow: hidden;
  color: #cfc9bd;
  background:
    radial-gradient(1200px 700px at 50% -10%, #23252e 0%, transparent 60%),
    radial-gradient(900px 900px at 50% 120%, #191b22 0%, transparent 55%),
    var(--desk);
  color-scheme: dark;
  font-family: 'DM Sans', ui-sans-serif, sans-serif;
}

.card-viewer,
.card-viewer * {
  box-sizing: border-box;
}

.grain {
  position: fixed;
  z-index: 20;
  inset: -50%;
  pointer-events: none;
  opacity: 0.055;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.progress {
  position: absolute;
  z-index: 4;
  top: 0;
  left: 0;
  height: 2px;
  background: var(--amber);
  box-shadow: 0 0 8px rgb(226 169 79 / 50%);
  transition: width 0.35s ease;
}

header {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 26px 0;
  color: var(--faint);
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  user-select: none;
}

.file-summary {
  display: flex;
  min-width: 0;
  max-width: 50%;
  align-items: center;
  gap: 8px;
  color: #b7b0a2;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-summary b {
  color: var(--amber);
  font-weight: 500;
  white-space: nowrap;
}

.spacer {
  flex: 1;
}

.position-controls {
  display: flex;
  align-items: center;
}

.counter {
  border: 0;
  padding: 0;
  background: none;
  color: #9d968a;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 0.1em;
  cursor: pointer;
}

.counter b {
  color: var(--amber);
  font-size: 17px;
  font-weight: 500;
}

.counter:hover {
  color: #cfc9bd;
}

.counter:focus-visible,
.tool-button:focus-visible,
.navigation button:focus-visible,
.card:focus-visible,
.empty-state:focus-visible,
.error-toast button:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 3px;
}

.jump {
  width: 4.5em;
  border: 1px solid var(--amber);
  border-radius: 2px;
  padding: 3px 4px;
  outline: none;
  background: rgb(226 169 79 / 10%);
  color: var(--amber);
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 0.1em;
  text-align: center;
}

.tool-button {
  border: 1px solid #33353d;
  border-radius: 2px;
  padding: 6px 12px;
  background: none;
  color: #8d8779;
  font-family: inherit;
  font-size: inherit;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.tool-button:hover {
  border-color: #5a5c66;
  color: #cfc9bd;
}

.tool-button.active {
  border-color: var(--amber);
  color: var(--amber);
}

main {
  display: grid;
  min-height: 0;
  flex: 1;
  place-items: center;
  padding: 26px;
}

.empty-state {
  display: flex;
  width: min(620px, 92vw);
  flex-direction: column;
  align-items: center;
  border: 1.5px dashed #3a3c45;
  border-radius: 4px;
  padding: 70px 40px;
  background: rgb(255 255 255 / 1.2%);
  color: var(--faint);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}

.empty-state:hover,
.empty-state.dragging,
.card-viewer.is-dragging .empty-state {
  border-color: var(--amber);
  background: rgb(226 169 79 / 5%);
  transform: translateY(-2px);
}

.empty-title {
  margin-bottom: 16px;
  color: #d8d2c4;
  font-family: 'Bricolage Grotesque', ui-sans-serif, sans-serif;
  font-size: clamp(26px, 4vw, 38px);
  font-weight: 500;
  letter-spacing: 0.01em;
}

.empty-title em {
  color: var(--amber);
  font-style: italic;
}

.empty-subtitle {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.empty-format {
  margin-top: 26px;
  color: #565248;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
}

.stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stage::before,
.stage::after {
  position: absolute;
  z-index: -1;
  inset: -30px;
  pointer-events: none;
  background:
    linear-gradient(var(--accent), var(--accent)) left 0 top 0 / 16px 1.5px,
    linear-gradient(var(--accent), var(--accent)) left 0 top 0 / 1.5px 16px,
    linear-gradient(var(--accent), var(--accent)) right 0 top 0 / 16px 1.5px,
    linear-gradient(var(--accent), var(--accent)) right 0 top 0 / 1.5px 16px,
    linear-gradient(var(--accent), var(--accent)) left 0 bottom 0 / 16px 1.5px,
    linear-gradient(var(--accent), var(--accent)) left 0 bottom 0 / 1.5px 16px,
    linear-gradient(var(--accent), var(--accent)) right 0 bottom 0 / 16px 1.5px,
    linear-gradient(var(--accent), var(--accent)) right 0 bottom 0 / 1.5px 16px;
  background-repeat: no-repeat;
  opacity: 0.65;
}

.card-wrap {
  width: min(700px, 88vw);
  perspective: 1800px;
}

.card {
  display: grid;
  width: 100%;
  min-height: 300px;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  transform-style: preserve-3d;
  cursor: pointer;
  transition: transform 0.55s cubic-bezier(0.25, 0.9, 0.25, 1.02);
}

.card.flipped {
  transform: rotateY(180deg);
}

.face {
  display: flex;
  grid-area: 1 / 1;
  min-height: 300px;
  max-height: 74vh;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  border-radius: 3px;
  padding: 38px 46px 42px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 50%), rgb(0 0 0 / 3%) 12%, transparent 30%),
    var(--paper);
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 25%),
    0 2px 3px rgb(0 0 0 / 35%),
    0 30px 70px -18px rgb(0 0 0 / 80%),
    0 90px 100px -60px rgb(0 0 0 / 90%);
  color: var(--ink);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.face.back {
  transform: rotateY(180deg);
  background:
    linear-gradient(180deg, rgb(255 255 255 / 40%), rgb(0 0 0 / 3%) 12%, transparent 30%),
    var(--paper-shade);
}

.tag {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--accent);
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.tag::after {
  height: 1.5px;
  flex: 1;
  background: currentColor;
  content: '';
  opacity: 0.5;
}

.card-number {
  color: #a09a8c;
  font-weight: 400;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.question-text,
.answer-text {
  font-family: 'Bricolage Grotesque', ui-sans-serif, sans-serif;
  font-size: clamp(21px, 2.6vw, 30px);
  font-weight: 430;
  letter-spacing: 0.002em;
  line-height: 1.38;
}

.answer-text {
  font-weight: 470;
}

.context {
  margin-top: auto;
  border-top: 1px dashed #c2b9a5;
  padding-top: 18px;
}

.context-label {
  display: block;
  margin-bottom: 8px;
  color: #a09a8c;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.context-text {
  display: block;
  color: var(--ink-soft);
  font-size: 13px;
  font-style: italic;
  line-height: 1.65;
}

.navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 26px;
  margin-top: 34px;
  user-select: none;
}

.navigation button {
  width: 52px;
  height: 40px;
  border: 1px solid #34363f;
  border-radius: 2px;
  background: none;
  color: #8d8779;
  font-family: inherit;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.navigation button:hover:not(:disabled) {
  border-color: var(--amber);
  color: var(--amber);
}

.navigation button:disabled {
  cursor: default;
  opacity: 0.25;
}

.hint {
  color: #605b51;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hint kbd {
  border: 1px solid #3a3c45;
  border-bottom-width: 2px;
  border-radius: 3px;
  padding: 1px 6px;
  background: rgb(255 255 255 / 3%);
  color: #9d968a;
  font: inherit;
}

.hint-divider {
  margin: 0 5px;
}

.error-toast {
  position: absolute;
  z-index: 30;
  bottom: 18px;
  left: 50%;
  display: flex;
  max-width: min(520px, calc(100vw - 32px));
  align-items: center;
  gap: 16px;
  border: 1px solid var(--accent);
  border-radius: 3px;
  padding: 10px 12px 10px 14px;
  background: #241a19;
  box-shadow: 0 12px 36px rgb(0 0 0 / 45%);
  color: #f2c5ba;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  transform: translateX(-50%);
}

.error-toast button {
  border: 0;
  padding: 0;
  background: none;
  color: #f2c5ba;
  font: inherit;
  font-size: 18px;
  cursor: pointer;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .progress,
  .empty-state {
    transition: none;
  }
}

@media (max-width: 640px) {
  .card-viewer {
    min-height: 520px;
  }

  header {
    flex-wrap: wrap;
    gap: 10px 14px;
    padding: 14px 16px 0;
  }

  .file-summary {
    max-width: 100%;
  }

  .spacer {
    display: none;
  }

  .position-controls {
    margin-left: auto;
  }

  main {
    padding: 18px 16px;
  }

  .empty-state {
    padding: 48px 22px;
  }

  .face {
    min-height: 270px;
    padding: 28px 24px 32px;
  }

  .card-wrap {
    width: min(700px, 92vw);
  }

  .navigation {
    margin-top: 28px;
  }

  .hint {
    display: none;
  }
}
</style>
