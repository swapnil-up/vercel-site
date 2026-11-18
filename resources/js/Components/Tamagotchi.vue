<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import BlobbyCanvas from './Blobby/BlobbyCanvas.vue'
import { useBlobbyPet } from '@/Composables/useBlobbyPet.js'
import { getBlobbyMood } from '@/Utils/blobbyPet.js'

// ─── Pet State ───────────────────────────────────────────────
const {
  pet,
  clock,
  markEngaged,
  setDecayPaused,
  adjustStats,
} = useBlobbyPet()

const animation = ref('idle')
const animationId = ref(0)
const actionMessage = ref('')
const showActionMessage = ref(false)
const clickEffects = ref([])
const isSleeping = ref(false)
const expression = ref('😊')
const lastClickTime = ref(0)
const blobbyCanvas = ref(null)
let clickEffectId = 0

const setAnimation = (action) => {
  animation.value = action
  animationId.value += 1
}

// ─── Game State ──────────────────────────────────────────────
const showGame = ref(false)
const gameType = ref(null)
const gameMessage = ref('')
const gameResult = ref(null)

// RPS state
const rpsScore = ref({ player: 0, pet: 0 })
const rpsRound = ref(0)
const rpsMaxRounds = 3
const rpsPlayerChoice = ref(null)
const rpsPetChoice = ref(null)
const rpsResult = ref(null) // 'win', 'lose', 'tie'
const rpsAnimating = ref(false)
const rpsSeriesOver = ref(false)

// Guess state
const guessNumber = ref(null)
const guessSecret = ref(null)
const guessAttempts = ref(0)
const guessMaxAttempts = 7
const guessHistory = ref([])
const guessLocked = ref(false)

// Memory state
const memoryCards = ref([])
const memoryFlipped = ref([])
const memoryMatched = ref([])
const memoryMoves = ref(0)
const memoryLocked = ref(false)
const memoryBestScore = ref(null)
const memoryWon = ref(false)

// Reaction state
const reactionState = ref('idle') // idle, waiting, ready, clicked, result
const reactionStartTime = ref(0)
const reactionTime = ref(0)
const reactionBest = ref(null)
const reactionTimeout = ref(null)
const reactionInterval = ref(null)

// ─── Stats ───────────────────────────────────────────────────
const stats = computed(() => [
  { label: 'HUNGER', value: pet.value.hunger, icon: '🍖', color: pet.value.hunger < 30 ? '#ff6b6b' : '#ffd93d' },
  { label: 'BOREDOM', value: pet.value.boredom, icon: '🎨', color: pet.value.boredom > 70 ? '#ff6b6b' : pet.value.boredom > 40 ? '#ffd93d' : '#74c0fc' },
  { label: 'LOVE', value: pet.value.love, icon: '💕', color: pet.value.love < 30 ? '#ff6b6b' : '#ff6b9d' },
])

const overallWellbeing = computed(() =>
  Math.round(
    (pet.value.hunger + pet.value.love + (100 - pet.value.boredom)) / 3
  )
)

// ─── Mood ────────────────────────────────────────────────────
const petMood = computed(() =>
  getBlobbyMood(pet.value, {
    now: clock.value,
    sleeping: isSleeping.value,
  })
)

const petMessage = computed(() => {
  const messages = {
    sick: 'My tummy hurts...', hungry: 'Getting hungry...',
    dejected: 'Is anyone still studying with me?',
    bored: 'Nothing to do...', curious: 'What are we learning next?',
    crying: 'Why does nobody love me?', lonely: 'Come play with me...',
    sleepy: 'ZZZ... so tired...', excited: 'This is the best day EVER!',
    happy: 'Life is good!', content: 'Just vibing~'
  }
  return messages[petMood.value] || '...?'
})

// ─── Three.js Renderer ─────────────────────────────────────────
// The creature itself lives in BlobbyCanvas so the full pet and the
// compact card companion share exactly the same character.

// ─── Interactions ────────────────────────────────────────────
const showMessage = (msg) => {
  actionMessage.value = msg
  showActionMessage.value = true
  setTimeout(() => showActionMessage.value = false, 2000)
}

const spawnClickEffect = (x, y, type) => {
  const id = clickEffectId++
  const emojis = {
    love: ['💖', '💕', '✨', '💗', '💓'], food: ['🍪', '🍎', '✨', '😋'],
    play: ['⭐', '✨', '💫', '🎈'], default: ['✨', '💫', '⭐']
  }
  const emojiList = emojis[type] || emojis.default
  clickEffects.value.push({
    id, x, y,
    emoji: emojiList[Math.floor(Math.random() * emojiList.length)],
    offsetX: (Math.random() - 0.5) * 80, offsetY: -50 - Math.random() * 40
  })
  setTimeout(() => { clickEffects.value = clickEffects.value.filter(e => e.id !== id) }, 1200)
}

const spawnBurstParticles = (color, count = 20) => {
  blobbyCanvas.value?.spawnBurst(color, count)
}

const handlePetClick = ({ x, y }) => {
  const now = Date.now()
  if (now - lastClickTime.value < 300) return
  lastClickTime.value = now

  const roll = Math.random()
  if (roll < 0.4) {
    setAnimation('love')
    spawnBurstParticles(0xff6b9d)
    spawnClickEffect(x, y, 'love')
    adjustStats({ love: 5 })
    showMessage('Squee!')
  } else if (roll < 0.7) {
    setAnimation('excited')
    spawnBurstParticles(0xffd93d)
    spawnClickEffect(x, y, 'play')
    adjustStats({ boredom: -5 })
    showMessage('Wheee!')
  } else {
    setAnimation('confused')
    spawnClickEffect(x, y, 'default')
    markEngaged()
    showMessage('?')
  }
  setTimeout(() => setAnimation('idle'), 800)
}

const feed = () => {
  setAnimation('eating')
  spawnBurstParticles(0xffa94d)
  setTimeout(() => setAnimation('idle'), 1500)
  adjustStats({ hunger: 25, love: 5 })
  showMessage('Yummy!')
}

const petAction = () => {
  setAnimation('love')
  spawnBurstParticles(0xff6b9d)
  setTimeout(() => setAnimation('idle'), 1500)
  adjustStats({ love: 20, hunger: -5 })
  showMessage('I love you!')
}

const toggleSleep = () => {
  isSleeping.value = !isSleeping.value
  setDecayPaused(isSleeping.value)
  if (isSleeping.value) {
    showMessage('Zzz...')
  } else {
    showMessage('Good morning!')
    adjustStats({ love: 5 })
  }
}

// ─── Game: RPS (Best of 3) ──────────────────────────────────
const rpsChoices = [
  { id: 'rock', emoji: '🪨', label: 'ROCK', beats: 'scissors' },
  { id: 'paper', emoji: '📄', label: 'PAPER', beats: 'rock' },
  { id: 'scissors', emoji: '✂️', label: 'SCISSORS', beats: 'paper' }
]

const rpsPlayerChoiceObj = computed(() => rpsChoices.find(c => c.id === rpsPlayerChoice.value))
const rpsPetChoiceObj = computed(() => rpsChoices.find(c => c.id === rpsPetChoice.value))
const rpsScoreDisplay = computed(() => `${rpsScore.value.player} — ${rpsScore.value.pet}`)

const playRPS = (choice) => {
  if (rpsAnimating.value || rpsSeriesOver.value) return
  rpsAnimating.value = true
  rpsPlayerChoice.value = choice
  rpsPetChoice.value = null
  rpsResult.value = null

  // Pet "thinks" for a moment
  setAnimation('confused')
  setTimeout(() => {
    const petChoice = rpsChoices[Math.floor(Math.random() * 3)]
    rpsPetChoice.value = petChoice.id
    rpsRound.value++

    const playerObj = rpsChoices.find(c => c.id === choice)
    if (playerObj.beats === petChoice.id) {
      rpsResult.value = 'win'
      rpsScore.value.player++
      setAnimation('excited')
      spawnBurstParticles(0xffd93d)
    } else if (petChoice.beats === choice) {
      rpsResult.value = 'lose'
      rpsScore.value.pet++
      setAnimation('love')
    } else {
      rpsResult.value = 'tie'
      setAnimation('idle')
    }

    // Check series
    if (rpsScore.value.player >= 2 || rpsScore.value.pet >= 2 || rpsRound.value >= rpsMaxRounds) {
      rpsSeriesOver.value = true
      if (rpsScore.value.player > rpsScore.value.pet) {
        gameMessage.value = `YOU WIN THE SERIES ${rpsScore.value.player}—${rpsScore.value.pet}!`
        adjustStats({ boredom: -25 })
        spawnBurstParticles(0x4ade80)
      } else if (rpsScore.value.pet > rpsScore.value.player) {
        gameMessage.value = `Blobby wins ${rpsScore.value.pet}—${rpsScore.value.player}!`
        adjustStats({ boredom: 10, love: 10 })
      } else {
        gameMessage.value = `Series tied ${rpsScore.value.player}—${rpsScore.value.pet}!`
        adjustStats({ boredom: 5 })
      }
      gameResult.value = 'done'
    } else {
      markEngaged()
    }

    setTimeout(() => { setAnimation('idle'); rpsAnimating.value = false }, 1000)
  }, 600)
}

const resetRPS = () => {
  rpsScore.value = { player: 0, pet: 0 }
  rpsRound.value = 0
  rpsPlayerChoice.value = null
  rpsPetChoice.value = null
  rpsResult.value = null
  rpsSeriesOver.value = false
  gameResult.value = null
  gameMessage.value = ''
}

// ─── Game: Guess (Hot/Cold) ─────────────────────────────────
const guessHistoryDisplay = computed(() => {
  return guessHistory.value.map(h => ({
    ...h,
    label: h.guess,
    hint: h.diff === 0 ? '🎯' : h.diff <= 2 ? '🔥' : h.diff <= 4 ? '🌡️' : '❄️',
    hintColor: h.diff === 0 ? '#4ade80' : h.diff <= 2 ? '#ff6b6b' : h.diff <= 4 ? '#ffa94d' : '#74c0fc'
  }))
})

const startGuess = () => {
  guessSecret.value = Math.floor(Math.random() * 10) + 1
  guessNumber.value = null
  guessAttempts.value = 0
  guessHistory.value = []
  guessLocked.value = false
  gameResult.value = null
  gameMessage.value = ''
}

const submitGuess = (num) => {
  if (guessLocked.value) return
  guessNumber.value = num
  const diff = Math.abs(num - guessSecret.value)
  guessAttempts.value++
  guessHistory.value.unshift({ guess: num, diff })

  if (diff === 0) {
    guessLocked.value = true
    gameMessage.value = `${num} is correct! Got it in ${guessAttempts.value} try${guessAttempts.value > 1 ? 'ies' : 'y'}!`
    gameResult.value = 'done'
    setAnimation('excited')
    spawnBurstParticles(0x4ade80)
    adjustStats({ boredom: -20 })
    setTimeout(() => setAnimation('idle'), 1500)
  } else if (guessAttempts.value >= guessMaxAttempts) {
    guessLocked.value = true
    gameMessage.value = `Out of tries! It was ${guessSecret.value}.`
    gameResult.value = 'done'
    adjustStats({ boredom: 10, love: 5 })
  } else {
    markEngaged()
  }
}

// ─── Game: Memory ────────────────────────────────────────────
const memoryEmojis = ['🌟', '🎨', '🎵', '🚀', '🌈', '🍕']
const memorySize = 12 // 4x3 grid

const initMemory = () => {
  const pairs = [...memoryEmojis, ...memoryEmojis]
  // Fisher-Yates shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]]
  }
  memoryCards.value = pairs.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))
  memoryFlipped.value = []
  memoryMatched.value = []
  memoryMoves.value = 0
  memoryLocked.value = false
  memoryWon.value = false
  gameResult.value = null
  gameMessage.value = ''
}

const flipMemoryCard = (index) => {
  if (memoryLocked.value) return
  const card = memoryCards.value[index]
  if (card.flipped || card.matched) return
  if (memoryFlipped.value.length >= 2) return

  card.flipped = true
  memoryFlipped.value.push(index)

  if (memoryFlipped.value.length === 2) {
    memoryMoves.value++
    memoryLocked.value = true
    const [a, b] = memoryFlipped.value
    const cardA = memoryCards.value[a]
    const cardB = memoryCards.value[b]

    if (cardA.emoji === cardB.emoji) {
      // Match!
      cardA.matched = true
      cardB.matched = true
      memoryMatched.value.push(cardA.emoji)
      memoryFlipped.value = []
      memoryLocked.value = false
      spawnBurstParticles(0xff6b9d, 10)

      // Check win
      if (memoryMatched.value.length === memoryEmojis.length) {
        memoryWon.value = true
        gameMessage.value = `Matched all pairs in ${memoryMoves.value} moves!`
        gameResult.value = 'done'
        const score = memoryMoves.value
        if (!memoryBestScore.value || score < memoryBestScore.value) {
          memoryBestScore.value = score
          gameMessage.value += ' NEW BEST!'
        }
        setAnimation('excited')
        spawnBurstParticles(0x4ade80, 30)
        adjustStats({ boredom: -30 })
        setTimeout(() => setAnimation('idle'), 1500)
      }
    } else {
      // No match — flip back
      setTimeout(() => {
        cardA.flipped = false
        cardB.flipped = false
        memoryFlipped.value = []
        memoryLocked.value = false
      }, 800)
    }
    markEngaged()
  }
}

// ─── Game: Reaction ──────────────────────────────────────────
const startReaction = () => {
  reactionState.value = 'waiting'
  reactionStartTime.value = 0
  reactionTime.value = 0
  gameResult.value = null
  gameMessage.value = ''

  const delay = 1500 + Math.random() * 3500
  reactionTimeout.value = setTimeout(() => {
    reactionState.value = 'ready'
    reactionStartTime.value = performance.now()
  }, delay)
}

const clickReaction = () => {
  if (reactionState.value === 'waiting') {
    // Clicked too early
    clearTimeout(reactionTimeout.value)
    reactionState.value = 'result'
    reactionTime.value = 0
    gameMessage.value = 'Too early! Wait for green.'
    gameResult.value = 'done'
    adjustStats({ boredom: 5 })
  } else if (reactionState.value === 'ready') {
    reactionTime.value = Math.round(performance.now() - reactionStartTime.value)
    reactionState.value = 'result'
    gameMessage.value = `Reaction: ${reactionTime.value}ms!`
    if (!reactionBest.value || reactionTime.value < reactionBest.value) {
      reactionBest.value = reactionTime.value
      gameMessage.value += ' NEW BEST!'
    }
    gameResult.value = 'done'
    setAnimation('excited')
    spawnBurstParticles(0x74c0fc, 15)
    adjustStats({ boredom: -15 })
    setTimeout(() => setAnimation('idle'), 1000)
  }
}

// ─── Game Navigation ─────────────────────────────────────────
const playGame = (type) => {
  gameType.value = type
  showGame.value = true
  gameResult.value = null
  gameMessage.value = ''

  if (type === 'rps') resetRPS()
  else if (type === 'guess') startGuess()
  else if (type === 'memory') initMemory()
  else if (type === 'reaction') { reactionState.value = 'idle'; reactionTime.value = 0 }
}

const closeGame = () => {
  showGame.value = false
  clearTimeout(reactionTimeout.value)
  gameType.value = null
  gameMessage.value = ''
}

const handleKeyUp = (e) => {
  if (showGame.value && e.key === 'Escape') closeGame()
}

// ─── Persistence ─────────────────────────────────────────────
const loadBestScores = () => {
  try {
    const bestMemory = localStorage.getItem('site_blobbyMemoryBest')
    if (bestMemory) memoryBestScore.value = parseInt(bestMemory, 10)
    const bestReaction = localStorage.getItem('site_blobbyReactionBest')
    if (bestReaction) reactionBest.value = parseInt(bestReaction, 10)
  } catch {
    // A blocked or corrupted score store should never break the pet.
  }
}

// ─── Lifecycle ───────────────────────────────────────────────
watch(petMood, (newMood) => {
  const map = {
    excited: '😆', happy: '😊', content: '🙂', curious: '🤔',
    confused: '😕', sleepy: '😴', dejected: '😢', lonely: '🥺',
    bored: '😒', hungry: '😋', sick: '🤢', crying: '😭'
  }
  expression.value = map[newMood] || '😊'
})

watch(memoryBestScore, (value) => {
  if (!value) return
  try { localStorage.setItem('site_blobbyMemoryBest', value) } catch { /* storage can be unavailable */ }
})
watch(reactionBest, (value) => {
  if (!value) return
  try { localStorage.setItem('site_blobbyReactionBest', value) } catch { /* storage can be unavailable */ }
})

onMounted(() => {
  loadBestScores()
  window.addEventListener('keyup', handleKeyUp)
  expression.value = '😊'
})

onUnmounted(() => {
  clearTimeout(reactionTimeout.value)
  window.removeEventListener('keyup', handleKeyUp)
  setDecayPaused(false)
})
</script>

<template>
  <div class="tamagotchi-root min-h-screen bg-[#0a0a1a] text-white overflow-hidden relative">
    <div class="crt-overlay pointer-events-none fixed inset-0 z-50"></div>
    <div class="crt-vignette pointer-events-none fixed inset-0 z-40"></div>

    <div class="relative z-10 max-w-5xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <div class="w-3 h-3 rounded-full bg-[#ff6b6b] animate-pulse"></div>
          <div class="w-3 h-3 rounded-full bg-[#ffd93d] animate-pulse" style="animation-delay:0.2s"></div>
          <div class="w-3 h-3 rounded-full bg-[#4ade80] animate-pulse" style="animation-delay:0.4s"></div>
        </div>
        <div class="text-center">
          <h1 class="font-mono text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b9d] via-[#ffd93d] to-[#74c0fc]">BLOBBY.EXE</h1>
          <p class="font-mono text-xs text-[#555] tracking-widest mt-1">DIGITAL ORGANISM v2.0</p>
        </div>
        <div class="text-right">
          <p class="font-mono text-xs text-[#555]">AGE</p>
          <p class="font-mono text-lg text-[#ffd93d] font-bold">{{ pet.age }}<span class="text-xs text-[#555]">m</span></p>
        </div>
      </div>

      <!-- Main layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Pet viewport -->
        <div class="lg:col-span-2">
          <div class="pet-viewport relative rounded-lg overflow-hidden border border-[#222] bg-[#0d0d22]" style="aspect-ratio:4/3;">
            <div class="absolute inset-0">
              <BlobbyCanvas
                ref="blobbyCanvas"
                class="h-full w-full cursor-pointer"
                :mood="petMood"
                :action="animation"
                :action-id="animationId"
                :sleeping="isSleeping"
                :interactive="true"
                :show-environment="true"
                @interact="handlePetClick"
              />
            </div>

            <div v-for="effect in clickEffects" :key="effect.id"
              class="click-effect absolute pointer-events-none z-20"
              :style="{ left: effect.x+'px', top: effect.y+'px', '--offset-x': effect.offsetX+'px' }">
              {{ effect.emoji }}
            </div>

            <div v-if="showActionMessage"
              class="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-[#1a1a3e]/90 border border-[#ff6b9d]/50 rounded font-mono text-sm font-bold text-[#ff6b9d] animate-bounce backdrop-blur-sm">
              {{ actionMessage }}
            </div>

            <div class="absolute top-4 right-4 z-20 flex items-center gap-2 bg-[#1a1a3e]/80 px-3 py-1.5 rounded border border-[#333]">
              <span class="text-lg">{{ expression }}</span>
              <span class="font-mono text-xs text-[#888] uppercase">{{ petMood }}</span>
            </div>

            <div v-if="isSleeping" class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div class="sleep-indicator font-mono text-4xl text-[#b39ddb] opacity-70">zzZ</div>
            </div>

            <div class="viewport-scanlines pointer-events-none absolute inset-0 z-10"></div>
          </div>

          <div class="mt-4 text-center">
            <p class="font-mono text-sm text-[#666] italic">"{{ petMessage }}"</p>
            <p class="font-mono text-xs text-[#444] mt-2">click blobby to interact</p>
          </div>

          <!-- Action buttons -->
          <div class="flex justify-center gap-3 mt-6 flex-wrap">
            <button @click="feed" class="action-btn px-5 py-3 bg-gradient-to-r from-[#ff6b6b] to-[#ffa94d] text-white rounded-lg font-mono text-sm font-bold tracking-wide hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#ff6b6b]/20">🍖 FEED</button>
            <button @click="petAction" class="action-btn px-5 py-3 bg-gradient-to-r from-[#ff6b9d] to-[#ce93d8] text-white rounded-lg font-mono text-sm font-bold tracking-wide hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#ff6b9d]/20">💕 CUDDLE</button>
            <button @click="toggleSleep" class="action-btn px-5 py-3 bg-gradient-to-r from-[#b39ddb] to-[#7c4dff] text-white rounded-lg font-mono text-sm font-bold tracking-wide hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#b39ddb]/20">{{ isSleeping ? '☀️ WAKE' : '😴 SLEEP' }}</button>
            <button @click="playGame('rps')" class="action-btn px-5 py-3 bg-gradient-to-r from-[#74c0fc] to-[#4dabf7] text-white rounded-lg font-mono text-sm font-bold tracking-wide hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#74c0fc]/20">🎮 PLAY</button>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-4">
          <!-- Stats -->
          <div class="stats-panel bg-[#0d0d22] border border-[#222] rounded-lg p-5">
            <h2 class="font-mono text-xs text-[#555] tracking-widest mb-4 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[#4ade80]"></span> STATUS MONITOR
            </h2>
            <div class="space-y-4">
              <div v-for="stat in stats" :key="stat.label">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-mono text-xs text-[#888]">{{ stat.icon }} {{ stat.label }}</span>
                  <span class="font-mono text-sm font-bold" :style="{ color: stat.color }">{{ stat.value }}%</span>
                </div>
                <div class="h-2 bg-[#1a1a2e] rounded-full overflow-hidden border border-[#222]">
                  <div class="h-full rounded-full transition-all duration-700 ease-out"
                    :style="{ width: stat.value+'%', background: `linear-gradient(90deg, ${stat.color}88, ${stat.color})` }"></div>
                </div>
              </div>
            </div>
            <div class="mt-5 pt-4 border-t border-[#222]">
              <div class="flex items-center justify-between">
                <span class="font-mono text-xs text-[#555]">OVERALL</span>
                <span class="font-mono text-lg font-bold"
                  :style="{ color: overallWellbeing > 60 ? '#4ade80' : overallWellbeing > 30 ? '#ffd93d' : '#ff6b6b' }">
                  {{ overallWellbeing }}%
                </span>
              </div>
            </div>
          </div>

          <!-- Mini-games -->
          <div class="games-panel bg-[#0d0d22] border border-[#222] rounded-lg p-5">
            <h2 class="font-mono text-xs text-[#555] tracking-widest mb-4 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[#74c0fc]"></span> MINI-GAMES
            </h2>
            <div class="grid grid-cols-2 gap-2">
              <button @click="playGame('rps')" class="game-btn px-3 py-3 bg-[#1a1a2e] hover:bg-[#222] border border-[#333] hover:border-[#ff6b9d]/50 rounded-lg font-mono text-xs text-[#888] hover:text-[#ff6b9d] transition-all text-center">
                <div class="text-xl mb-1">🪨📄✂️</div>RPS
              </button>
              <button @click="playGame('guess')" class="game-btn px-3 py-3 bg-[#1a1a2e] hover:bg-[#222] border border-[#333] hover:border-[#74c0fc]/50 rounded-lg font-mono text-xs text-[#888] hover:text-[#74c0fc] transition-all text-center">
                <div class="text-xl mb-1">🔢</div>GUESS
              </button>
              <button @click="playGame('memory')" class="game-btn px-3 py-3 bg-[#1a1a2e] hover:bg-[#222] border border-[#333] hover:border-[#ff6b9d]/50 rounded-lg font-mono text-xs text-[#888] hover:text-[#ff6b9d] transition-all text-center">
                <div class="text-xl mb-1">🃏</div>MEMORY
              </button>
              <button @click="playGame('reaction')" class="game-btn px-3 py-3 bg-[#1a1a2e] hover:bg-[#222] border border-[#333] hover:border-[#4ade80]/50 rounded-lg font-mono text-xs text-[#888] hover:text-[#4ade80] transition-all text-center">
                <div class="text-xl mb-1">⚡</div>REACTION
              </button>
            </div>
            <div class="mt-3 pt-3 border-t border-[#222] space-y-1">
              <p v-if="memoryBestScore" class="font-mono text-[10px] text-[#444]">🃏 Memory best: {{ memoryBestScore }} moves</p>
              <p v-if="reactionBest" class="font-mono text-[10px] text-[#444]">⚡ Reaction best: {{ reactionBest }}ms</p>
            </div>
          </div>

          <!-- Tips -->
          <div class="tips-panel bg-[#0d0d22] border border-[#222] rounded-lg p-5">
            <h2 class="font-mono text-xs text-[#555] tracking-widest mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[#ffd93d]"></span> TIPS
            </h2>
            <ul class="space-y-2">
              <li class="font-mono text-xs text-[#555] flex items-start gap-2"><span class="text-[#ff6b9d]">›</span><span>Stats decay over time — check in often</span></li>
              <li class="font-mono text-xs text-[#555] flex items-start gap-2"><span class="text-[#ff6b9d]">›</span><span>Sleep restores love slowly</span></li>
              <li class="font-mono text-xs text-[#555] flex items-start gap-2"><span class="text-[#ff6b9d]">›</span><span>Winning games makes Blobby less bored</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ GAME MODAL ═══════════════════════════════════════ -->
    <div v-if="showGame" class="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-md bg-black/70" @keyup.escape="closeGame">
      <div class="game-modal bg-[#0d0d22] border border-[#333] rounded-lg max-w-lg w-full mx-4 shadow-2xl shadow-[#ff6b9d]/10 overflow-hidden">

        <!-- Modal Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-[#222]">
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ gameType === 'rps' ? '🪨📄✂️' : gameType === 'guess' ? '🔢' : gameType === 'memory' ? '🃏' : '⚡' }}</span>
            <div>
              <h3 class="font-mono text-sm font-bold text-white tracking-wide">
                {{ gameType === 'rps' ? 'ROCK PAPER SCISSORS' : gameType === 'guess' ? 'GUESS THE NUMBER' : gameType === 'memory' ? 'MEMORY MATCH' : 'REACTION TEST' }}
              </h3>
              <p class="font-mono text-[10px] text-[#555]">
                {{ gameType === 'rps' ? 'Best of 3' : gameType === 'guess' ? `${guessMaxAttempts} attempts` : gameType === 'memory' ? 'Find all pairs' : 'Click when green' }}
              </p>
            </div>
          </div>
          <button @click="closeGame" class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1a2e] hover:bg-[#ff6b6b]/20 text-[#888] hover:text-[#ff6b6b] transition-all font-mono text-sm border border-[#333]">✕</button>
        </div>

        <div class="p-6">
          <!-- ═══ RPS ═══ -->
          <template v-if="gameType === 'rps'">
            <!-- Score -->
            <div class="flex items-center justify-center gap-4 mb-6">
              <div class="text-center">
                <p class="font-mono text-[10px] text-[#555] mb-1">YOU</p>
                <p class="font-mono text-2xl font-bold text-[#74c0fc]">{{ rpsScore.player }}</p>
              </div>
              <div class="font-mono text-xs text-[#333]">ROUND {{ rpsRound }}/{{ rpsMaxRounds }}</div>
              <div class="text-center">
                <p class="font-mono text-[10px] text-[#555] mb-1">BLOBBY</p>
                <p class="font-mono text-2xl font-bold text-[#ff6b9d]">{{ rpsScore.pet }}</p>
              </div>
            </div>

            <!-- Battle area -->
            <div v-if="rpsPlayerChoice && !rpsSeriesOver" class="flex items-center justify-center gap-8 mb-6">
              <div class="text-center">
                <p class="font-mono text-[10px] text-[#555] mb-2">YOUR PICK</p>
                <div class="text-5xl battle-choice">{{ rpsPlayerChoiceObj?.emoji }}</div>
              </div>
              <div class="font-mono text-lg text-[#555] font-bold">VS</div>
              <div class="text-center">
                <p class="font-mono text-[10px] text-[#555] mb-2">BLOBBY'S PICK</p>
                <div class="text-5xl battle-choice" :class="{ 'animate-pulse': !rpsPetChoice }">
                  {{ rpsPetChoice ? rpsPetChoiceObj?.emoji : '❓' }}
                </div>
              </div>
            </div>

            <!-- Result flash -->
            <div v-if="rpsResult && !rpsSeriesOver" class="text-center mb-4">
              <span class="font-mono text-sm font-bold"
                :class="rpsResult === 'win' ? 'text-[#4ade80]' : rpsResult === 'lose' ? 'text-[#ff6b6b]' : 'text-[#ffd93d]'">
                {{ rpsResult === 'win' ? 'YOU WIN THIS ROUND!' : rpsResult === 'lose' ? 'BLOBBY WINS!' : 'TIE!' }}
              </span>
            </div>

            <!-- Choice buttons -->
            <div v-if="!rpsSeriesOver" class="flex justify-center gap-3">
              <button v-for="choice in rpsChoices" :key="choice.id"
                @click="playRPS(choice.id)"
                :disabled="rpsAnimating"
                class="rps-btn w-20 h-20 flex flex-col items-center justify-center rounded-xl border-2 transition-all hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                :class="rpsPlayerChoice === choice.id ? 'border-[#ff6b9d] bg-[#ff6b9d]/10' : 'border-[#333] bg-[#1a1a2e] hover:border-[#555]'">
                <span class="text-3xl mb-1">{{ choice.emoji }}</span>
                <span class="font-mono text-[9px] text-[#888]">{{ choice.label }}</span>
              </button>
            </div>

            <!-- Series over -->
            <div v-if="rpsSeriesOver" class="text-center">
              <p class="font-mono text-sm font-bold text-white mb-4">{{ gameMessage }}</p>
              <div class="flex gap-3 justify-center">
                <button @click="resetRPS" class="px-5 py-2.5 bg-gradient-to-r from-[#ff6b9d] to-[#ffd93d] text-white rounded-lg font-mono text-sm font-bold hover:scale-105 transition-all">PLAY AGAIN</button>
                <button @click="closeGame" class="px-5 py-2.5 bg-[#1a1a2e] text-[#888] rounded-lg hover:bg-[#222] font-mono text-sm border border-[#333] transition-all">DONE</button>
              </div>
            </div>
          </template>

          <!-- ═══ GUESS ═══ -->
          <template v-if="gameType === 'guess'">
            <template v-if="!gameResult">
              <!-- Number grid -->
              <div class="grid grid-cols-5 gap-2 mb-5">
                <button v-for="n in 10" :key="n" @click="submitGuess(n)"
                  :disabled="guessLocked"
                  class="guess-btn h-12 rounded-lg font-mono text-lg font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border"
                  :class="guessHistory.find(h => h.guess === n)
                    ? (n === guessSecret ? 'border-[#4ade80] bg-[#4ade80]/20 text-[#4ade80]' : 'border-[#ff6b6b]/50 bg-[#ff6b6b]/10 text-[#ff6b6b]')
                    : 'border-[#333] bg-[#1a1a2e] text-[#888] hover:border-[#555] hover:text-white'">
                  {{ n }}
                </button>
              </div>

              <!-- History -->
              <div v-if="guessHistory.length" class="mb-4">
                <p class="font-mono text-[10px] text-[#555] mb-2">YOUR GUESSES</p>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="(h, i) in guessHistoryDisplay" :key="i"
                    class="px-2 py-1 rounded font-mono text-xs border"
                    :style="{ borderColor: h.hintColor+'55', backgroundColor: h.hintColor+'15', color: h.hintColor }">
                    {{ h.hint }} {{ h.label }}
                  </span>
                </div>
              </div>

              <p class="font-mono text-xs text-[#555] text-center">{{ guessMaxAttempts - guessAttempts }} guesses left</p>
            </template>

            <template v-else>
              <div class="text-center">
                <div class="text-5xl mb-3">{{ guessNumber === guessSecret ? '🎯' : '😢' }}</div>
                <p class="font-mono text-sm font-bold text-white mb-2">{{ gameMessage }}</p>
                <div class="flex gap-3 justify-center mt-4">
                  <button @click="startGuess(); gameResult=null" class="px-5 py-2.5 bg-gradient-to-r from-[#ff6b9d] to-[#ffd93d] text-white rounded-lg font-mono text-sm font-bold hover:scale-105 transition-all">PLAY AGAIN</button>
                  <button @click="closeGame" class="px-5 py-2.5 bg-[#1a1a2e] text-[#888] rounded-lg hover:bg-[#222] font-mono text-sm border border-[#333] transition-all">DONE</button>
                </div>
              </div>
            </template>
          </template>

          <!-- ═══ MEMORY ═══ -->
          <template v-if="gameType === 'memory'">
            <template v-if="!gameResult">
              <div class="flex items-center justify-between mb-4">
                <p class="font-mono text-xs text-[#555]">MOVES: <span class="text-white font-bold">{{ memoryMoves }}</span></p>
                <p class="font-mono text-xs text-[#555]">PAIRS: <span class="text-[#ff6b9d] font-bold">{{ memoryMatched.length }}</span>/{{ memoryEmojis.length }}</p>
              </div>

              <div class="grid grid-cols-4 gap-2 mb-4">
                <button v-for="(card, i) in memoryCards" :key="card.id"
                  @click="flipMemoryCard(i)"
                  class="memory-card aspect-square rounded-lg text-2xl font-bold transition-all duration-300 border-2"
                  :class="card.matched
                    ? 'border-[#4ade80] bg-[#4ade80]/15 scale-95'
                    : card.flipped
                      ? 'border-[#ff6b9d] bg-[#1a1a3e] scale-105'
                      : 'border-[#333] bg-[#1a1a2e] hover:border-[#555] hover:bg-[#222]'">
                  <span v-if="card.flipped || card.matched" class="memory-emoji">{{ card.emoji }}</span>
                  <span v-else class="text-[#333]">?</span>
                </button>
              </div>
            </template>

            <template v-else>
              <div class="text-center">
                <div class="text-5xl mb-3">🎉</div>
                <p class="font-mono text-sm font-bold text-white mb-1">{{ gameMessage }}</p>
                <p class="font-mono text-xs text-[#555] mb-4" v-if="memoryBestScore">Best score: {{ memoryBestScore }} moves</p>
                <div class="flex gap-3 justify-center">
                  <button @click="initMemory()" class="px-5 py-2.5 bg-gradient-to-r from-[#ff6b9d] to-[#ffd93d] text-white rounded-lg font-mono text-sm font-bold hover:scale-105 transition-all">PLAY AGAIN</button>
                  <button @click="closeGame" class="px-5 py-2.5 bg-[#1a1a2e] text-[#888] rounded-lg hover:bg-[#222] font-mono text-sm border border-[#333] transition-all">DONE</button>
                </div>
              </div>
            </template>
          </template>

          <!-- ═══ REACTION ═══ -->
          <template v-if="gameType === 'reaction'">
            <div class="text-center">
              <div v-if="reactionState === 'idle'" class="py-8">
                <div class="text-6xl mb-4">⚡</div>
                <p class="font-mono text-sm text-[#888] mb-6">Click the box as fast as you can when it turns green!</p>
                <button @click="startReaction" class="px-6 py-3 bg-gradient-to-r from-[#4ade80] to-[#22d3ee] text-white rounded-lg font-mono text-sm font-bold hover:scale-105 transition-all">START</button>
              </div>

              <div v-else-if="reactionState === 'waiting'" @click="clickReaction"
                class="reaction-box cursor-pointer w-full h-48 rounded-xl flex items-center justify-center border-2 border-[#ff6b6b] bg-[#ff6b6b]/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
                <div class="text-center">
                  <div class="text-4xl mb-2">👀</div>
                  <p class="font-mono text-sm font-bold text-[#ff6b6b]">WAIT FOR GREEN...</p>
                </div>
              </div>

              <div v-else-if="reactionState === 'ready'" @click="clickReaction"
                class="reaction-box cursor-pointer w-full h-48 rounded-xl flex items-center justify-center border-2 border-[#4ade80] bg-[#4ade80]/20 animate-pulse transition-all hover:scale-[1.02] active:scale-[0.98]">
                <div class="text-center">
                  <div class="text-4xl mb-2">🟢</div>
                  <p class="font-mono text-sm font-bold text-[#4ade80]">CLICK NOW!</p>
                </div>
              </div>

              <div v-else-if="reactionState === 'result'" class="py-8">
                <div class="text-5xl mb-3">{{ reactionTime === 0 ? '💨' : '🎯' }}</div>
                <p class="font-mono text-lg font-bold text-white mb-1">{{ gameMessage }}</p>
                <p v-if="reactionBest" class="font-mono text-xs text-[#555] mb-4">Best: {{ reactionBest }}ms</p>
                <div class="flex gap-3 justify-center">
                  <button @click="startReaction" class="px-5 py-2.5 bg-gradient-to-r from-[#4ade80] to-[#22d3ee] text-white rounded-lg font-mono text-sm font-bold hover:scale-105 transition-all">TRY AGAIN</button>
                  <button @click="closeGame" class="px-5 py-2.5 bg-[#1a1a2e] text-[#888] rounded-lg hover:bg-[#222] font-mono text-sm border border-[#333] transition-all">DONE</button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crt-overlay {
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px);
  mix-blend-mode: overlay;
}
.crt-vignette {
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%);
}
.viewport-scanlines {
  background: repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.05) 1px, rgba(0,0,0,0.05) 2px);
}
.pet-viewport {
  box-shadow: inset 0 0 60px rgba(116,192,252,0.05), 0 0 30px rgba(255,107,157,0.08);
}
.action-btn:hover { box-shadow: 0 0 20px currentColor, 0 4px 15px rgba(0,0,0,0.3); }
.game-btn { transition: all 0.2s ease; }
.game-btn:active { transform: scale(0.95); }

/* Game modal */
.game-modal { animation: modal-in 0.3s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes modal-in { 0% { opacity:0; transform:scale(0.9) translateY(20px); } 100% { opacity:1; transform:scale(1) translateY(0); } }

/* RPS */
.rps-btn { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
.rps-btn:hover { transform: scale(1.1); }
.battle-choice { animation: choice-in 0.4s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes choice-in { 0% { transform: scale(0) rotate(-20deg); opacity:0; } 100% { transform: scale(1) rotate(0); opacity:1; } }

/* Guess */
.guess-btn { transition: all 0.15s ease; }

/* Memory */
.memory-card { cursor: pointer; }
.memory-card:active { transform: scale(0.92); }
.memory-emoji { animation: card-flip 0.3s ease-out; }
@keyframes card-flip { 0% { transform: rotateY(90deg); } 100% { transform: rotateY(0); } }

/* Reaction */
.reaction-box { transition: all 0.3s ease; }

/* Click effects */
.click-effect { animation: float-up 1.2s ease-out forwards; font-size: 1.5rem; }
@keyframes float-up {
  0% { opacity:1; transform:translate(-50%,-50%) translateY(0) scale(1); }
  100% { opacity:0; transform:translate(-50%,-50%) translateY(-80px) translateX(var(--offset-x)) scale(1.8); }
}
.sleep-indicator { animation: sleep-z 2s ease-in-out infinite; }
@keyframes sleep-z { 0%,100% { opacity:0.3; transform:translateY(0) scale(0.8); } 50% { opacity:0.8; transform:translateY(-15px) scale(1.1); } }

.stats-panel { box-shadow: 0 0 20px rgba(255,107,157,0.03); }
.games-panel { box-shadow: 0 0 20px rgba(116,192,252,0.03); }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #0a0a1a; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: #555; }
</style>
