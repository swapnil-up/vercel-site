<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const pet = ref({
  name: 'Blobby',
  hunger: 80,
  boredom: 60,
  love: 70,
  age: 0,
  lastSeen: Date.now()
})

const animation = ref('idle')
const actionMessage = ref('')
const showActionMessage = ref(false)
const gameResult = ref(null)
const showGame = ref(false)
const gameType = ref(null)
const gameInput = ref('')
const gameMessage = ref('')

const decayInterval = ref(null)

const stats = computed(() => [
  { label: 'Hunger', value: pet.value.hunger, icon: '🍔', color: pet.value.hunger < 30 ? 'bg-red-500' : 'bg-orange-400' },
  { label: 'Boredom', value: pet.value.boredom, icon: '🎮', color: pet.value.boredom < 30 ? 'bg-red-500' : 'bg-blue-400' },
  { label: 'Love', value: pet.value.love, icon: '❤️', color: pet.value.love < 30 ? 'bg-red-500' : 'bg-pink-400' },
])

const petMood = computed(() => {
  const hunger = pet.value.hunger
  const boredom = pet.value.boredom
  const love = pet.value.love

  if (hunger < 20) return 'starving'
  if (hunger < 40) return 'hungry'
  if (boredom < 20) return 'angry'
  if (boredom < 40) return 'bored'
  if (love < 20) return 'lonely'
  if (love < 40) return 'sad'
  if (hunger > 80 && boredom > 80 && love > 80) return 'ecstatic'
  if (hunger > 60 && boredom > 60 && love > 60) return 'happy'
  return 'neutral'
})

const petMessage = computed(() => {
  switch (petMood.value) {
    case 'starving': return 'I\'m starving... feed me!'
    case 'hungry': return 'Getting hungry...'
    case 'angry': return 'I\'m so bored I\'m angry!'
    case 'bored': return 'Bored... entertain me!'
    case 'lonely': return 'Feeling lonely...'
    case 'sad': return 'I need some love...'
    case 'ecstatic': return 'I\'m absolutely thrilled!'
    case 'happy': return 'Feeling great!'
    default: return 'Doing okay'
  }
})

const petSize = computed(() => {
  const avg = (pet.value.hunger + pet.value.boredom + pet.value.love) / 3
  // Size ranges from 70% to 130% based on happiness
  return 70 + Math.round((avg / 100) * 60)
})

const showMessage = (msg) => {
  actionMessage.value = msg
  showActionMessage.value = true
  setTimeout(() => showActionMessage.value = false, 1500)
}

const feed = () => {
  animation.value = 'eating'
  setTimeout(() => animation.value = 'idle', 1500)
  pet.value.hunger = Math.min(100, pet.value.hunger + 25)
  pet.value.love = Math.min(100, pet.value.love + 8)
  showMessage('nom nom nom!')
  saveProgress()
}

const petAction = () => {
  animation.value = 'loving'
  setTimeout(() => animation.value = 'idle', 1500)
  pet.value.love = Math.min(100, pet.value.love + 20)
  pet.value.hunger = Math.max(0, pet.value.hunger - 8)
  showMessage('💖💖💖')
  saveProgress()
}

const playGame = (type) => {
  gameType.value = type
  showGame.value = true
  gameResult.value = null
  // Focus input immediately when game opens
  setTimeout(() => {
    const input = document.getElementById('game-input')
    if (input) input.focus()
  }, 100)
  gameInput.value = ''
  gameMessage.value = ''
}

const closeGame = () => {
  showGame.value = false
  gameType.value = null
  gameInput.value = ''
  gameMessage.value = ''
}

const submitGame = () => {
  if (gameType.value === 'rps') {
    const choices = ['🪨', '📄', '✂️']
    const userChoice = gameInput.value.toLowerCase().trim()
    const petChoice = choices[Math.floor(Math.random() * 3)]

    // Accept various inputs
    const validChoices = {
      'r': '🪨', 'rock': '🪨', '1': '🪨',
      'p': '📄', 'paper': '📄', '2': '📄',
      's': '✂️', 'scissors': '✂️', '3': '✂️'
    }

    const normalizedChoice = validChoices[userChoice] || userChoice
    const isValid = ['🪨', '📄', '✂️'].includes(normalizedChoice)

    if (!isValid) {
      gameMessage.value = 'Please type r/p/s, rock/paper/scissors, or 1/2/3'
      return
    }

    const win = (normalizedChoice === '🪨' && petChoice === '✂️') ||
      (normalizedChoice === '📄' && petChoice === '🪨') ||
      (normalizedChoice === '✂️' && petChoice === '📄')

    if (win) {
      gameMessage.value = `You chose ${normalizedChoice}, Blobby chose ${petChoice}. YOU WIN!`
      pet.value.boredom = Math.max(0, pet.value.boredom - 25)
      pet.value.love = Math.max(0, pet.value.love - 12)
    } else if (normalizedChoice === petChoice) {
      gameMessage.value = `You chose ${normalizedChoice}, Blobby chose ${petChoice}. TIE!`
      pet.value.boredom = Math.min(100, pet.value.boredom + 8)
    } else {
      gameMessage.value = `You chose ${normalizedChoice}, Blobby chose ${petChoice}. YOU LOSE! (Blobby happy)`
      pet.value.boredom = Math.min(100, pet.value.boredom + 25)
      pet.value.love = Math.min(100, pet.value.love + 12)
    }
    gameResult.value = 'done'

  } else if (gameType.value === 'guess') {
    const guess = parseInt(gameInput.value)
    if (isNaN(guess) || guess < 1 || guess > 10) {
      gameMessage.value = 'Please enter a number between 1-10'
      return
    }

    const secret = Math.floor(Math.random() * 10) + 1

    if (guess === secret) {
      gameMessage.value = `You guessed ${guess}! The number was ${secret}. YOU WIN!`
      pet.value.boredom = Math.max(0, pet.value.boredom - 25)
      pet.value.love = Math.max(0, pet.value.love - 12)
    } else {
      gameMessage.value = `You guessed ${guess}... the number was ${secret}. YOU LOSE! (Blobby happy)`
      pet.value.boredom = Math.min(100, pet.value.boredom + 25)
      pet.value.love = Math.min(100, pet.value.love + 12)
    }
    gameResult.value = 'done'
  }
  saveProgress()
}

// Allow Enter key to submit game
const handleKeyUp = (e) => {
  if (showGame.value && e.key === 'Enter') {
    submitGame()
  }
}

const saveProgress = () => {
  localStorage.setItem('blobbyPet', JSON.stringify({
    ...pet.value,
    lastSeen: Date.now()
  }))
}

const loadProgress = () => {
  const saved = localStorage.getItem('blobbyPet')
  if (saved) {
    const data = JSON.parse(saved)
    pet.value = { ...pet.value, ...data }
    const timePassed = Math.floor((Date.now() - data.lastSeen) / 60000)
    pet.value.hunger = Math.max(0, pet.value.hunger - timePassed * 2)
    pet.value.boredom = Math.max(0, pet.value.boredom - timePassed)
    pet.value.love = Math.max(0, pet.value.love - timePassed)
  }
}

const startDecay = () => {
  decayInterval.value = setInterval(() => {
    pet.value.hunger = Math.max(0, pet.value.hunger - 1)
    pet.value.boredom = Math.max(0, pet.value.boredom - 1)
    pet.value.love = Math.max(0, pet.value.love - 1)
    pet.value.age++
    saveProgress()
  }, 60000)
}

onMounted(() => {
  loadProgress()
  startDecay()
  // Listen for key presses globally when game is active
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  if (decayInterval.value) clearInterval(decayInterval.value)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<template>
  <div class="border rounded-lg p-4">
    <div class="flex flex-col md:flex-row gap-4">
      <div class="flex-1 text-center">
        <div class="text-2xl font-bold text-indigo-600 mb-1">Blobby</div>
        <p class="text-xs text-gray-500 mb-2">Age: {{ pet.age }} mins</p>

        <div class="relative h-48 flex items-center justify-center mb-3">
          <div class="blob-container" :style="{ width: petSize + 'px', height: petSize + 'px' }">
            <div class="blob" :class="[petMood, animation]">
              <div class="blob-face">
                <div class="blob-eyes">
                  <div class="blob-eye"
                    :class="{ 'angry': petMood === 'angry', 'hungry': petMood === 'hungry', 'starving': petMood === 'starving' }">
                  </div>
                  <div class="blob-eye"
                    :class="{ 'angry': petMood === 'angry', 'hungry': petMood === 'hungry', 'starving': petMood === 'starving' }">
                  </div>
                </div>
                <div class="blob-mouth" :class="{
                  'happy': petMood === 'happy' || petMood === 'ecstatic',
                  'sad': petMood === 'sad' || petMood === 'lonely',
                  'angry': petMood === 'angry',
                  'hungry': petMood === 'hungry' || petMood === 'starving'
                }"></div>
              </div>
              <div v-if="petMood === 'happy' || petMood === 'ecstatic'" class="blob-cheeks">
                <div class="blob-cheek"></div>
                <div class="blob-cheek"></div>
              </div>
              <div v-if="petMood === 'angry'" class="blob-anger">
                <span>💢</span><span>💢</span>
              </div>
              <div v-if="animation === 'loving'" class="blob-hearts">
                <span>💕</span><span>💕</span><span>💕</span>
              </div>
              <div v-if="animation === 'eating'" class="blob-food">🍪</div>
            </div>
          </div>

          <div v-if="showActionMessage"
            class="absolute -top-3 left-1/2 -translate-x-1/2 text-sm font-medium text-pink-500 animate-bounce">
            {{ actionMessage }}
          </div>
        </div>

        <p class="text-sm text-gray-600 mb-3">{{ petMessage }}</p>

        <div class="flex justify-center gap-2">
          <button @click="feed"
            class="px-4 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 hover:scale-110 active:scale-95 transition-all text-sm font-medium">
            🍔 Feed
          </button>
          <button @click="petAction"
            class="px-4 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 hover:scale-110 active:scale-95 transition-all text-sm font-medium">
            ❤️ Pet
          </button>
          <button @click="playGame('rps')"
            class="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 hover:scale-110 active:scale-95 transition-all text-sm font-medium">
            🎮 Play
          </button>
        </div>
      </div>

      <div class="flex-1">
        <h3 class="text-sm font-semibold mb-3">Stats</h3>
        <div class="space-y-3">
          <div v-for="stat in stats" :key="stat.label" class="flex items-center gap-3">
            <span class="text-xl">{{ stat.icon }}</span>
            <div class="flex-1">
              <div class="flex justify-between text-xs mb-1">
                <span>{{ stat.label }}</span>
                <span>{{ stat.value }}%</span>
              </div>
              <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" :class="stat.color"
                  :style="{ width: stat.value + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t">
          <h3 class="text-sm font-semibold mb-2">Mini-games</h3>
          <p class="text-xs text-gray-500 mb-2">Win = lose stats, Lose = Blobby gains!</p>
          <div class="flex gap-2">
            <button @click="playGame('rps')" class="px-3 py-2 bg-gray-100 rounded text-xs hover:bg-gray-200">
              RPS
            </button>
            <button @click="playGame('guess')" class="px-3 py-2 bg-gray-100 rounded text-xs hover:bg-gray-200">
              Guess
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showGame" class="fixed inset-0 flex items-center justify-center z-50 game-overlay">
      <div class="bg-white p-6 rounded-2xl max-w-sm w-full mx-4">
        <div class="text-center mb-4">
          <div class="text-4xl mb-2">{{ gameType === 'rps' ? '🪨📄✂️' : '🔢' }}</div>
          <h3 class="text-lg font-bold">{{ gameType === 'rps' ? 'Rock Paper Scissors' : 'Guess the Number' }}</h3>
        </div>

        <div v-if="!gameResult" class="space-y-4">
          <p v-if="gameType === 'rps'" class="text-sm text-gray-600 text-center">
            r = rock, p = paper, s = scissors<br>
            <span class="text-xs text-gray-500">Win = Blobby sad, Lose = Blobby happy!</span>
          </p>
          <p v-else class="text-sm text-gray-600 text-center">
            Guess 1-10<br>
            <span class="text-xs text-gray-500">Win = Blobby sad, Lose = Blobby happy!</span>
          </p>
          <div class="flex flex-col items-center">
            <input id="game-input" v-model="gameInput" @keyup.enter="submitGame" @keyup.escape="closeGame" type="text"
              class="w-full p-3 border-2 border-gray-200 rounded-xl text-center text-lg focus:border-indigo-500 focus:outline-none mb-2"
              :placeholder="gameType === 'rps' ? 'r, p, or s' : '1-10'" />
            <button @click="submitGame"
              class="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">
              Play!
            </button>
          </div>
        </div>

        <div v-else class="text-center">
          <p class="text-sm mb-4">{{ gameMessage }}</p>
          <div class="flex gap-2 mt-4">
            <button @click="playGame(gameType)" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Play Again
            </button>
            <button @click="closeGame" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.blob-container {
  position: relative;
}

.blob {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  position: relative;
  animation: blob-bounce 2s ease-in-out infinite;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* Mood-based colors */
.blob.happy {
  background: linear-gradient(135deg, #f9a8d4 0%, #f472b6 100%);
  animation: blob-bounce 0.5s ease-in-out infinite;
}

.blob.ecstatic {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  animation: blob-bounce 0.3s ease-in-out infinite;
}

.blob.neutral {
  background: linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%);
  animation: blob-bounce 2s ease-in-out infinite;
}

.blob.sad {
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  animation: blob-slow 3s ease-in-out infinite;
}

.blob.hungry {
  background: linear-gradient(135deg, #fecaca 0%, #f87171 100%);
  animation: blob-wobble 1.5s ease-in-out infinite;
}

.blob.starving {
  background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
  animation: blob-wobble 1s ease-in-out infinite;
}

.blob.bored {
  background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
  animation: blob-slow 4s ease-in-out infinite;
}

.blob.angry {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  animation: blob-angry 1s ease-in-out infinite;
}

/* Size animations */
@keyframes blob-bounce {

  0%,
  100% {
    transform: translateY(0) scale(1);
  }

  50% {
    transform: translateY(-10px) scale(1.05, 0.95);
  }
}

@keyframes blob-slow {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-3px);
  }
}

@keyframes blob-wobble {

  0%,
  100% {
    transform: rotate(0deg);
  }

  25% {
    transform: rotate(2deg);
  }

  75% {
    transform: rotate(-2deg);
  }
}

@keyframes blob-angry {

  0%,
  100% {
    transform: rotate(0deg);
  }

  25% {
    transform: rotate(5deg);
  }

  75% {
    transform: rotate(-5deg);
  }
}

@keyframes blob-eat {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1, 0.9);
  }
}

@keyframes blob-love {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.15);
  }
}

.blob-face {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.blob-eyes {
  display: flex;
  gap: 8px;
}

.blob-eye {
  width: 8px;
  height: 10px;
  background: #1e1b4b;
  border-radius: 50%;
  position: relative;
  transition: all 0.2s ease;
}

.blob-eye.angry {
  background: #dc2626;
  animation: eye-angry 0.5s ease-in-out infinite;
}

.blob-eye.hungry {
  background: #f87171;
  animation: eye-wobble 0.5s ease-in-out infinite;
}

.blob-eye.starving {
  background: #dc2626;
  animation: eye-wobble 0.3s ease-in-out infinite;
}

.blob-eye::after {
  content: '';
  position: absolute;
  width: 3px;
  height: 3px;
  background: white;
  border-radius: 50%;
  top: 2px;
  right: 1px;
  opacity: 0.8;
}

@keyframes eye-angry {

  0%,
  100% {
    transform: rotate(0deg);
  }

  50% {
    transform: rotate(15deg);
  }
}

@keyframes eye-wobble {

  0%,
  100% {
    transform: rotate(0deg);
  }

  50% {
    transform: rotate(10deg);
  }
}

.blob-mouth {
  width: 12px;
  height: 6px;
  border: 2px solid #1e1b4b;
  border-top: none;
  border-radius: 0 0 12px 12px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.blob-mouth.happy {
  width: 16px;
  height: 10px;
  background: #1e1b4b;
  border: none;
  border-radius: 50%;
}

.blob-mouth.ecstatic {
  width: 20px;
  height: 12px;
  background: #1e1b4b;
  border: none;
  border-radius: 50%;
  animation: mouth-ecstatic 0.5s ease-in-out infinite;
}

.blob-mouth.sad {
  width: 14px;
  height: 4px;
  border-radius: 8px 8px 0 0;
  border-top: 2px solid #1e1b4b;
  border-left: none;
  border-right: none;
  border-bottom: none;
  transform: translateY(2px);
}

.blob-mouth.angry {
  width: 18px;
  height: 8px;
  background: transparent;
  border: 2px solid #dc2626;
  border-radius: 50%;
  animation: mouth-angry 0.5s ease-in-out infinite;
}

.blob-mouth.hungry {
  width: 16px;
  height: 6px;
  background: #f87171;
  border-radius: 50%;
  animation: mouth-hungry 0.5s ease-in-out infinite;
}

.blob-mouth.starving {
  width: 18px;
  height: 8px;
  background: #dc2626;
  border-radius: 50%;
  animation: mouth-starving 0.3s ease-in-out infinite;
}

@keyframes mouth-ecstatic {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.2);
  }
}

@keyframes mouth-angry {

  0%,
  100% {
    transform: rotate(0deg);
  }

  25% {
    transform: rotate(10deg);
  }

  50% {
    transform: rotate(0deg);
  }

  75% {
    transform: rotate(-10deg);
  }
}

@keyframes mouth-hungry {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.3, 0.7);
  }
}

@keyframes mouth-starving {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.5, 0.5);
  }
}

.blob-cheeks {
  position: absolute;
  top: 55%;
  width: 100%;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
  padding: 0 6px;
}

.blob-cheek {
  width: 8px;
  height: 5px;
  background: #f9a8d4;
  border-radius: 50%;
  opacity: 0.7;
  animation: cheek-pulse 1.5s ease-in-out infinite;
}

.blob-cheek:nth-child(2) {
  animation-delay: 0.5s;
}

@keyframes cheek-pulse {

  0%,
  100% {
    opacity: 0.7;
  }

  50% {
    opacity: 1;
  }
}

.blob-anger {
  position: absolute;
  top: -8px;
  right: -8px;
  display: flex;
  gap: 2px;
  font-size: 10px;
  animation: anger-shake 0.5s ease-in-out infinite;
}

@keyframes anger-shake {

  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }

  25% {
    transform: translate(2px, -2px) rotate(5deg);
  }

  50% {
    transform: translate(0, 0) rotate(0deg);
  }

  75% {
    transform: translate(-2px, 2px) rotate(-5deg);
  }
}

.blob-hearts {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 3px;
  pointer-events: none;
}

.blob-hearts span {
  animation: heart-float 0.6s ease-in-out infinite;
  font-size: 14px;
}

.blob-hearts span:nth-child(2) {
  animation-delay: 0.2s;
}

.blob-hearts span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes heart-float {

  0%,
  100% {
    transform: translateY(0);
    opacity: 1;
  }

  50% {
    transform: translateY(-8px);
    opacity: 0.5;
  }
}

.blob-food {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 18px;
  animation: food-bounce 0.5s ease-in-out infinite;
}

@keyframes food-bounce {

  0%,
  100% {
    transform: rotate(-10deg);
  }

  50% {
    transform: rotate(10deg);
  }
}

/* Stats bars */
.h-3.bg-gray-200.rounded-full.overflow-hidden {
  height: 0.75rem;
}

/* Game overlay improvements */
.game-overlay {
  backdrop-filter: blur(2px);
  background-color: rgba(0, 0, 0, 0.5);
}

.bg-white.p-6.rounded-2xl {
  border: 1px solid #e5e7eb;
}

input.w-full.p-3.border-2.border-gray-200.rounded-xl {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.5px;
}

button.w-full.py-3.bg-indigo-600.text-white.rounded-xl {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

button.px-4.py-2.bg-indigo-600.text-white.rounded {
  font-weight: 600;
}

/* Main action buttons */
button.px-4.py-2.bg-orange-500.text-white.rounded-full {
  font-weight: 600;
  border-width: 2px;
}

button.px-4.py-2.bg-pink-500.text-white.rounded-full {
  font-weight: 600;
  border-width: 2px;
}

button.px-4.py-2.bg-blue-500.text-white.rounded-full {
  font-weight: 600;
  border-width: 2px;
}
</style>