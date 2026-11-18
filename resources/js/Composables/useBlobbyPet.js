import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  BLOBBY_REVIEW_RATINGS,
  BLOBBY_STORAGE_KEY,
  adjustBlobbyStats,
  applyBlobbyBonus,
  applyBlobbyDecay,
  applyBlobbyReview,
  createDefaultBlobbyState,
  getBlobbyMood,
  markBlobbyEngagement,
  parseBlobbyState,
  serializeBlobbyState,
} from '@/Utils/blobbyPet.js'

const pet = ref(createDefaultBlobbyState())
const clock = ref(Date.now())
const isHydrated = ref(false)
const reaction = ref('idle')
const reactionMessage = ref('')
const reactionId = ref(0)

let consumers = 0
let clockTimer = null
let reactionTimer = null
let lastDecayAt = Date.now()
let decayPaused = false

const petMood = computed(() => getBlobbyMood(pet.value, { now: clock.value }))

const saveProgress = (now = Date.now()) => {
  if (typeof localStorage === 'undefined') return false

  try {
    localStorage.setItem(
      BLOBBY_STORAGE_KEY,
      serializeBlobbyState(pet.value, now)
    )
    return true
  } catch {
    return false
  }
}

const hydrateProgress = (now = Date.now()) => {
  if (isHydrated.value || typeof localStorage === 'undefined') return

  try {
    const saved = parseBlobbyState(localStorage.getItem(BLOBBY_STORAGE_KEY), now)
    pet.value = saved || createDefaultBlobbyState(now)
  } catch {
    pet.value = createDefaultBlobbyState(now)
  }

  isHydrated.value = true
  lastDecayAt = now
  saveProgress(now)
}

const react = (action = 'idle', message = '', duration = 0) => {
  window.clearTimeout(reactionTimer)
  reaction.value = action
  reactionMessage.value = message
  reactionId.value += 1

  if (duration > 0) {
    reactionTimer = window.setTimeout(() => {
      reaction.value = 'idle'
      reactionMessage.value = ''
    }, duration)
  }
}

const recordReview = (rating, now = Date.now()) => {
  pet.value = applyBlobbyReview(pet.value, rating, now)
  saveProgress(now)

  if (rating === BLOBBY_REVIEW_RATINGS.GOOD) {
    react('excited', 'Yes! That one stuck.', 1_400)
  } else if (rating === BLOBBY_REVIEW_RATINGS.AGAIN) {
    react('confused', 'We can get this one next time.', 1_100)
  }

  return pet.value
}

const celebrate = (now = Date.now()) => {
  pet.value = applyBlobbyBonus(
    pet.value,
    { boredom: 12, love: 5 },
    now
  )
  saveProgress(now)
  react('excited', 'Deck cleared! Look at us go!', 2_200)
}

const markEngaged = (now = Date.now()) => {
  pet.value = markBlobbyEngagement(pet.value, now)
  saveProgress(now)
}

const setDecayPaused = (paused) => {
  decayPaused = Boolean(paused)
}

const adjustStats = (changes = {}, now = Date.now()) => {
  pet.value = adjustBlobbyStats(pet.value, changes, now)
  saveProgress(now)
}

const handleStorage = (event) => {
  if (event.key !== BLOBBY_STORAGE_KEY || !event.newValue) return

  const now = Date.now()
  const saved = parseBlobbyState(event.newValue, now)
  if (!saved) return

  pet.value = saved
  clock.value = now
  lastDecayAt = now
}

const start = () => {
  consumers += 1
  const now = Date.now()
  clock.value = now
  hydrateProgress(now)

  if (!clockTimer) {
    clockTimer = window.setInterval(() => {
      const currentTime = Date.now()
      clock.value = currentTime

      const elapsedMinutes = Math.floor(
        (currentTime - lastDecayAt) / 60_000
      )
      if (elapsedMinutes > 0) {
        if (decayPaused) {
          pet.value = {
            ...pet.value,
            love: Math.min(100, pet.value.love + 0.5 * elapsedMinutes),
            age: pet.value.age + elapsedMinutes,
            lastSeen: currentTime,
          }
        } else {
          pet.value = applyBlobbyDecay(
            pet.value,
            elapsedMinutes,
            currentTime
          )
        }
        lastDecayAt += elapsedMinutes * 60_000
        saveProgress(currentTime)
      }
    }, 1_000)
  }

  if (consumers === 1) window.addEventListener('storage', handleStorage)
}

const stop = () => {
  consumers = Math.max(0, consumers - 1)
  if (consumers === 0) {
    window.removeEventListener('storage', handleStorage)
    window.clearTimeout(reactionTimer)
    reactionTimer = null
    reaction.value = 'idle'
    reactionMessage.value = ''

    if (clockTimer) {
      window.clearInterval(clockTimer)
      clockTimer = null
    }
  }
}

export const useBlobbyPet = () => {
  onMounted(start)
  onUnmounted(stop)

  return {
    pet,
    petMood,
    clock,
    reaction,
    reactionId,
    reactionMessage,
    saveProgress,
    recordReview,
    celebrate,
    markEngaged,
    setDecayPaused,
    adjustStats,
    react,
  }
}
