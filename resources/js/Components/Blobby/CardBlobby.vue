<script setup>
import { computed, defineAsyncComponent, onUnmounted, ref } from 'vue'
import { useBlobbyPet } from '@/Composables/useBlobbyPet.js'
import {
  CARD_BLOBBY_COOLDOWN_MS,
  CARD_BLOBBY_MOODS,
  answerCardBlobby,
  createCardBlobbySession,
  expireCardBlobbySession,
} from '@/Utils/cardBlobbySession.js'

const BlobbyCanvas = defineAsyncComponent(() => import('./BlobbyCanvas.vue'))

const props = defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
})

const {
  reaction,
  reactionId,
  reactionMessage,
  recordReview,
  celebrate,
  markEngaged,
  react,
} = useBlobbyPet()

const rendererReady = ref(false)
const canvas = ref(null)
const session = ref(createCardBlobbySession())
let cooldownTimer = null

const displayMood = computed(() => session.value.mood)
const bubbleVisible = computed(() => Boolean(reactionMessage.value))
const moodLabel = computed(() => {
  const labels = {
    happy: 'Blobby is happy',
    excited: 'Blobby is excited',
    content: 'Blobby is content',
  }
  return labels[displayMood.value] || 'Blobby is here'
})

const scheduleCooldown = (duration = CARD_BLOBBY_COOLDOWN_MS) => {
  window.clearTimeout(cooldownTimer)
  cooldownTimer = window.setTimeout(() => {
    session.value = expireCardBlobbySession(session.value)
    react('idle', '', 0)
  }, duration)
}

const answer = (kind = 'good', cardId = null) => {
  markEngaged()

  const { session: nextSession, action, message } = answerCardBlobby(
    session.value,
    { kind, cardId }
  )

  session.value = nextSession
  react(action, message, message ? 1_400 : 0)
  scheduleCooldown()

  return nextSession
}

const acknowledge = ({ announce = true } = {}) => {
  markEngaged()
  session.value = {
    ...session.value,
    mood: CARD_BLOBBY_MOODS.HAPPY,
  }
  scheduleCooldown()
  if (announce) react('love', 'Still here. We can do this.', 900)
}

const handleReview = (rating, cardId = null) => {
  recordReview(rating, Date.now(), { announce: false })
  return answer(rating === 'again' ? 'again' : 'good', cardId)
}

const handleCelebrate = () => {
  celebrate()
  session.value = {
    ...session.value,
    mood: CARD_BLOBBY_MOODS.EXCITED,
  }
  scheduleCooldown(6_000)
}

onUnmounted(() => {
  window.clearTimeout(cooldownTimer)
})

defineExpose({
  acknowledge,
  celebrate: handleCelebrate,
  recordReview: handleReview,
  answer,
})
</script>

<template>
  <aside
    class="card-blobby"
    :class="{ 'card-blobby--compact': props.compact }"
    aria-label="Blobby study companion"
  >
    <Transition name="blobby-bubble">
      <p v-if="bubbleVisible" class="card-blobby__bubble" role="status">
        {{ reactionMessage }}
      </p>
    </Transition>

    <div class="card-blobby__stage">
      <div
        v-if="!rendererReady"
        class="card-blobby__placeholder"
        aria-hidden="true"
      >
        <span></span>
      </div>

      <div class="card-blobby__canvas">
        <BlobbyCanvas
          ref="canvas"
          class="h-full w-full"
          :mood="displayMood"
          :action="reaction"
          :action-id="reactionId"
          :compact="true"
          :interactive="true"
          :show-environment="false"
          @ready="rendererReady = true"
          @interact="acknowledge"
        />
      </div>
    </div>

    <span class="sr-only" aria-live="polite">{{ moodLabel }}</span>
  </aside>
</template>

<style scoped>
.card-blobby {
  position: absolute;
  z-index: 8;
  top: 12px;
  right: 18px;
  width: 138px;
  height: 142px;
  pointer-events: none;
  user-select: none;
}

.card-blobby__stage {
  position: absolute;
  inset: 0;
}

.card-blobby__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
  cursor: pointer;
}

.card-blobby__placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 62px;
  height: 58px;
  border-radius: 48% 52% 44% 56% / 58% 45% 55% 42%;
  background: radial-gradient(circle at 35% 25%, #eee6ff, #b49be8 58%, #7660aa);
  box-shadow:
    0 12px 28px rgb(0 0 0 / 28%),
    0 0 24px rgb(116 128 252 / 20%);
  opacity: 0.72;
  transform: translate(-50%, -50%);
  animation: card-blobby-breathe 2.4s ease-in-out infinite;
}

.card-blobby__placeholder span {
  position: absolute;
  top: 20px;
  left: 17px;
  width: 8px;
  height: 10px;
  border-radius: 50%;
  background: #241f2b;
  box-shadow: 22px 0 0 #241f2b;
}

.card-blobby__bubble {
  position: absolute;
  z-index: 2;
  top: 5px;
  right: 112px;
  width: max-content;
  max-width: 210px;
  border: 1px solid rgb(226 169 79 / 42%);
  border-radius: 4px;
  padding: 8px 10px;
  background: rgb(22 23 29 / 94%);
  box-shadow: 0 12px 32px rgb(0 0 0 / 35%);
  color: #e4cfaa;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 9px;
  letter-spacing: 0.04em;
  line-height: 1.45;
  pointer-events: none;
}

.card-blobby__bubble::after {
  position: absolute;
  top: 18px;
  right: -5px;
  width: 8px;
  height: 8px;
  border-top: 1px solid rgb(226 169 79 / 42%);
  border-right: 1px solid rgb(226 169 79 / 42%);
  background: #16171d;
  content: '';
  transform: rotate(45deg);
}

.card-blobby.card-blobby--compact {
  top: auto;
  right: 8px;
  bottom: 12px;
  width: 82px;
  height: 86px;
}

.card-blobby.card-blobby--compact .card-blobby__bubble {
  right: 66px;
  max-width: 170px;
}

.blobby-bubble-enter-active,
.blobby-bubble-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.blobby-bubble-enter-from,
.blobby-bubble-leave-to {
  opacity: 0;
  transform: translateY(5px) scale(0.98);
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

@keyframes card-blobby-breathe {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.97);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.03);
  }
}

@media (max-width: 1050px) {
  .card-blobby {
    width: 104px;
    height: 108px;
  }

  .card-blobby__bubble {
    right: 88px;
    max-width: 180px;
  }
}

@media (max-width: 1000px) and (min-width: 761px) {
  .card-blobby {
    top: auto;
    right: 8px;
    bottom: 12px;
    width: 82px;
    height: 86px;
  }

  .card-blobby__bubble {
    right: 66px;
    max-width: 170px;
  }
}

@media (max-width: 760px) {
  .card-blobby {
    top: auto;
    right: 8px;
    bottom: 12px;
    width: 76px;
    height: 78px;
  }

  .card-blobby__bubble {
    top: -3px;
    right: 64px;
    max-width: 150px;
    padding: 6px 8px;
    font-size: 8px;
  }

  .card-blobby__bubble::after {
    top: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-blobby__placeholder {
    animation: none;
  }
}
</style>
