<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  quote: {
    type: Object,
    default: null,
  },
})

const current = ref(props.quote)
const loading = ref(false)
const error = ref('')

watch(
  () => props.quote,
  (quote) => {
    current.value = quote
  },
)

async function anotherQuote() {
  if (loading.value) return

  loading.value = true
  error.value = ''

  try {
    const exclude = current.value?.id ? `?exclude=${current.value.id}` : ''
    const response = await fetch(`/data/quote/random${exclude}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) throw new Error('Quote request failed')

    const quote = await response.json()

    if (!quote?.quote) throw new Error('No quote returned')

    current.value = quote
  } catch {
    error.value = 'The flags are tangled. Try again in a moment.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="dj-stop">
    <p class="dj-kicker">Gumba · the prayer-flag courtyard</p>
    <h2 class="dj-h2">Flags worth repeating</h2>
    <p class="dj-lede">A wall of borrowed words, pinned up as it goes.</p>

    <div aria-live="polite">
      <blockquote v-if="current" class="dj-chalkboard dj-quote">
        <p>“{{ current.quote }}”</p>
        <cite v-if="current.author">— {{ current.author }}</cite>
      </blockquote>
      <p v-else class="dj-body">The wall is waiting for its first flag.</p>
    </div>

    <div class="dj-actions">
      <button
        type="button"
        class="dj-cta dj-quote__button"
        :disabled="loading"
        @click="anotherQuote"
      >
        <span aria-hidden="true">↻</span>
        {{ loading ? 'Pulling another flag…' : 'Another quote' }}
      </button>
    </div>

    <p v-if="error" class="dj-hint-line" role="status">{{ error }}</p>
    <p v-else class="dj-hint-line">A different thought each time you ask.</p>
  </div>
</template>

<style scoped>
.dj-quote {
  margin-top: 20px;
  padding: 18px 18px 16px;
}

.dj-quote p {
  font-size: clamp(1rem, 1.7vw, 1.12rem);
  line-height: 1.55;
}

.dj-quote cite {
  margin-top: 10px;
}

.dj-quote__button {
  border: 0;
  cursor: pointer;
}

.dj-quote__button:disabled {
  cursor: wait;
  opacity: 0.7;
  transform: none;
}
</style>
