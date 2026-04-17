<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

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
const isHoveringPet = ref(false)
const clickEffects = ref([])
const particles = ref([])
const expression = ref('happy')
const isSleeping = ref(false)

const decayInterval = ref(null)
let clickEffectId = 0
let particleId = 0

const expressions = ['happy', 'excited', 'love', 'content', 'neutral', 'thinking', 'confused', 'surprised', ' sleepy', 'sad', 'lonely', 'bored', 'hungry', 'angry', 'sick', 'crying']

const stats = computed(() => [
  { label: 'Hunger', value: pet.value.hunger, icon: '🍖', color: pet.value.hunger < 30 ? 'bg-red-500' : 'bg-orange-400' },
  { label: 'Boredom', value: pet.value.boredom, icon: '🎨', color: pet.value.boredom < 30 ? 'bg-red-500' : 'bg-blue-400' },
  { label: 'Love', value: pet.value.love, icon: '💕', color: pet.value.love < 30 ? 'bg-red-500' : 'bg-pink-400' },
])

const petMood = computed(() => {
  const hunger = pet.value.hunger
  const boredom = pet.value.boredom
  const love = pet.value.love

  if (hunger < 20) return 'sick'
  if (hunger < 40) return 'hungry'
  if (boredom < 20) return 'angry'
  if (boredom < 40) return 'bored'
  if (love < 20) return 'crying'
  if (love < 40) return 'lonely'
  if (isSleeping.value) return 'sleepy'
  if (hunger > 80 && boredom > 80 && love > 80) return 'excited'
  if (hunger > 60 && boredom > 60 && love > 60) return 'happy'
  return 'content'
})

const petMessage = computed(() => {
  switch (petMood.value) {
    case 'sick': return 'My tummy hurts...'
    case 'hungry': return 'Getting hungry...'
    case 'angry': return 'SO BORED I could cry!'
    case 'bored': return 'Nothing to do...'
    case 'crying': return 'Why does nobody love me?'
    case 'lonely': return 'Come play with me...'
    case 'sleepy': return 'ZZZ... so tired...'
    case 'excited': return 'This is the best day EVER!'
    case 'happy': return 'Life is good!'
    case 'content': return 'Just vibing~'
    default: return '...?'
  }
})

const petSize = computed(() => {
  const avg = (pet.value.hunger + pet.value.boredom + pet.value.love) / 3
  return 80 + Math.round((avg / 100) * 50)
})

const showMessage = (msg) => {
  actionMessage.value = msg
  showActionMessage.value = true
  setTimeout(() => showActionMessage.value = false, 2000)
}

const spawnClickEffect = (x, y, type) => {
  const id = clickEffectId++
  const emojis = {
    love: ['💖', '💕', '✨', '💗', '💓'],
    food: ['🍪', '🍎', '✨', '😋'],
    play: ['⭐', '✨', '💫', '🎈'],
    default: ['✨', '💫', '⭐']
  }
  const emojiList = emojis[type] || emojis.default

  clickEffects.value.push({
    id,
    x,
    y,
    emoji: emojiList[Math.floor(Math.random() * emojiList.length)],
    offsetX: (Math.random() - 0.5) * 60,
    offsetY: -40 - Math.random() * 30
  })

  setTimeout(() => {
    clickEffects.value = clickEffects.value.filter(e => e.id !== id)
  }, 1000)
}

const spawnParticles = (type) => {
  const colors = {
    love: ['#ff6b9d', '#ffc2d1', '#ff8fab'],
    food: ['#ffa94d', '#ffd8a8', '#fff3bf'],
    happy: ['#ffd43b', '#ffe066', '#fff9db'],
    default: ['#74c0fc', '#a5d8ff', '#d0ebff']
  }
  const colorList = colors[type] || colors.default

  for (let i = 0; i < 12; i++) {
    const id = particleId++
    const angle = (i / 12) * Math.PI * 2
    const distance = 50 + Math.random() * 30

    particles.value.push({
      id,
      x: 0,
      y: 0,
      endX: Math.cos(angle) * distance,
      endY: Math.sin(angle) * distance,
      color: colorList[Math.floor(Math.random() * colorList.length)],
      size: 4 + Math.random() * 6,
      delay: i * 30
    })

    setTimeout(() => {
      particles.value = particles.value.filter(p => p.id !== id)
    }, 800 + i * 30)
  }
}

const handlePetClick = (event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const interaction = Math.random()

  if (interaction < 0.4) {
    animation.value = 'love'
    spawnParticles('love')
    spawnClickEffect(x, y, 'love')
    pet.value.love = Math.min(100, pet.value.love + 5)
    showMessage('Squee!')
  } else if (interaction < 0.7) {
    animation.value = 'excited'
    spawnParticles('happy')
    spawnClickEffect(x, y, 'play')
    pet.value.boredom = Math.max(0, pet.value.boredom - 5)
    showMessage('Wheee!')
  } else {
    animation.value = 'confused'
    spawnClickEffect(x, y, 'default')
    showMessage('?')
  }

  setTimeout(() => animation.value = 'idle', 800)
  saveProgress()
}

const handlePetHover = () => {
  isHoveringPet.value = true
}

const handlePetLeave = () => {
  isHoveringPet.value = false
}

const feed = () => {
  animation.value = 'eating'
  spawnParticles('food')
  setTimeout(() => animation.value = 'idle', 1500)
  pet.value.hunger = Math.min(100, pet.value.hunger + 25)
  pet.value.love = Math.min(100, pet.value.love + 5)
  showMessage('Yummy!')
  saveProgress()
}

const petAction = () => {
  animation.value = 'love'
  spawnParticles('love')
  setTimeout(() => animation.value = 'idle', 1500)
  pet.value.love = Math.min(100, pet.value.love + 20)
  pet.value.hunger = Math.max(0, pet.value.hunger - 5)
  showMessage('I love you!')
  saveProgress()
}

const playGame = (type) => {
  gameType.value = type
  showGame.value = true
  gameResult.value = null
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

    const validChoices = {
      'r': '🪨', 'rock': '🪨', '1': '🪨',
      'p': '📄', 'paper': '📄', '2': '📄',
      's': '✂️', 'scissors': '✂️', '3': '✂️'
    }

    const normalizedChoice = validChoices[userChoice] || userChoice
    const isValid = ['🪨', '📄', '✂️'].includes(normalizedChoice)

    if (!isValid) {
      gameMessage.value = 'Type r/p/s, rock/paper/scissors, or 1/2/3'
      return
    }

    const win = (normalizedChoice === '🪨' && petChoice === '✂️') ||
                (normalizedChoice === '📄' && petChoice === '🪨') ||
                (normalizedChoice === '✂️' && petChoice === '📄')

    if (win) {
      gameMessage.value = `${normalizedChoice} vs ${petChoice} - YOU WIN!`
      pet.value.boredom = Math.max(0, pet.value.boredom - 20)
      animation.value = 'excited'
      spawnParticles('happy')
    } else if (normalizedChoice === petChoice) {
      gameMessage.value = `${normalizedChoice} vs ${petChoice} - TIE!`
      pet.value.boredom = Math.min(100, pet.value.boredom + 5)
    } else {
      gameMessage.value = `${normalizedChoice} vs ${petChoice} - Blobby wins!`
      pet.value.boredom = Math.min(100, pet.value.boredom + 15)
      pet.value.love = Math.min(100, pet.value.love + 10)
      animation.value = 'happy'
    }
    gameResult.value = 'done'
    setTimeout(() => animation.value = 'idle', 1500)

  } else if (gameType.value === 'guess') {
    const guess = parseInt(gameInput.value)
    if (isNaN(guess) || guess < 1 || guess > 10) {
      gameMessage.value = 'Enter a number 1-10'
      return
    }

    const secret = Math.floor(Math.random() * 10) + 1

    if (guess === secret) {
      gameMessage.value = `${guess} was right! YOU WIN!`
      pet.value.boredom = Math.max(0, pet.value.boredom - 20)
      animation.value = 'excited'
      spawnParticles('happy')
    } else {
      gameMessage.value = `You guessed ${guess}... it was ${secret}`
      pet.value.boredom = Math.min(100, pet.value.boredom + 15)
      pet.value.love = Math.min(100, pet.value.love + 10)
      animation.value = 'happy'
    }
    gameResult.value = 'done'
    setTimeout(() => animation.value = 'idle', 1500)
  }
  saveProgress()
}

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

watch(petMood, (newMood, oldMood) => {
  if (newMood !== oldMood) {
    const moodExpressions = {
      excited: '😆',
      happy: '😊',
      content: '🙂',
      neutral: '😐',
      thinking: '🤔',
      confused: '😕',
      surprised: '😲',
      sleepy: '😴',
      sad: '😢',
      lonely: '🥺',
      bored: '😒',
      hungry: '😋',
      angry: '😠',
      sick: '🤢',
      crying: '😭'
    }
    expression.value = moodExpressions[newMood] || '😊'
  }
})

onMounted(() => {
  loadProgress()
  startDecay()
  window.addEventListener('keyup', handleKeyUp)
  expression.value = '😊'
})

onUnmounted(() => {
  if (decayInterval.value) clearInterval(decayInterval.value)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 p-6">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-800">Blobby</h1>
            <p class="text-sm text-gray-500">Age: {{ pet.age }} mins</p>
          </div>
          <div class="text-4xl animate-bounce">{{ expression }}</div>
        </div>

        <div class="flex flex-col md:flex-row gap-8">
          <div class="flex-1">
            <div class="relative flex items-center justify-center">
              <div
                class="pet-container cursor-pointer select-none"
                :class="{ 'hover:scale-105': !isSleeping }"
                :style="{ width: petSize + 'px', height: petSize + 'px' }"
                @click="handlePetClick"
                @mouseenter="handlePetHover"
                @mouseleave="handlePetLeave"
              >
                <svg viewBox="0 0 100 100" class="w-full h-full">
                  <defs>
                    <radialGradient id="bodyGradient" cx="50%" cy="30%" r="70%">
                      <stop offset="0%" :stop-color="petMood === 'angry' ? '#ff6b6b' : petMood === 'excited' ? '#ffd93d' : '#b8a9c9'" />
                      <stop offset="100%" :stop-color="petMood === 'angry' ? '#ee5a5a' : petMood === 'excited' ? '#f0c419' : '#9b8ab8'" />
                    </radialGradient>
                    <radialGradient id="cheekGradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color="#ffb3c6" />
                      <stop offset="100%" stop-color="#ff85a2" />
                    </radialGradient>
                  </defs>

                  <ellipse cx="50" cy="55" rx="40" ry="38" fill="url(#bodyGradient)" />

                  <ellipse cx="50" cy="70" rx="30" ry="20" fill="url(#bodyGradient)" opacity="0.5" />

                  <g class="pet-face" :class="[petMood, animation, { sleeping: isSleeping }]">
                    <g v-if="!isSleeping" class="eyes">
                      <ellipse cx="35" cy="45" rx="6" ry="8" fill="#2d2d2d" />
                      <ellipse cx="65" cy="45" rx="6" ry="8" fill="#2d2d2d" />
                      <circle cx="37" cy="43" r="2" fill="white" />
                      <circle cx="67" cy="43" r="2" fill="white" />
                    </g>

                    <g v-else class="sleepy-eyes">
                      <path d="M28 45 Q35 42 42 45" stroke="#2d2d2d" stroke-width="3" fill="none" stroke-linecap="round" />
                      <path d="M58 45 Q65 42 72 45" stroke="#2d2d2d" stroke-width="3" fill="none" stroke-linecap="round" />
                    </g>

                    <g class="mouth" v-if="!isSleeping">
                      <path v-if="petMood === 'excited'" d="M40 62 Q50 72 60 62" stroke="#2d2d2d" stroke-width="2.5" fill="none" stroke-linecap="round" />
                      <path v-else-if="petMood === 'happy' || petMood === 'content'" d="M40 62 Q50 68 60 62" stroke="#2d2d2d" stroke-width="2" fill="none" stroke-linecap="round" />
                      <path v-else-if="petMood === 'sad' || petMood === 'lonely' || petMood === 'crying'" d="M40 66 Q50 58 60 66" stroke="#2d2d2d" stroke-width="2" fill="none" stroke-linecap="round" />
                      <path v-else-if="petMood === 'angry'" d="M40 64 Q50 60 60 64" stroke="#2d2d2d" stroke-width="2" fill="none" stroke-linecap="round" />
                      <path v-else-if="petMood === 'hungry' || petMood === 'sick'" d="M42 62 Q50 58 58 62" stroke="#2d2d2d" stroke-width="2" fill="none" stroke-linecap="round" />
                      <path v-else-if="petMood === 'confused' || petMood === 'thinking'" d="M44 64 Q50 62 54 64" stroke="#2d2d2d" stroke-width="2" fill="none" stroke-linecap="round" />
                      <path v-else-if="petMood === 'surprised'" d="M45 62 Q50 70 55 62" stroke="#2d2d2d" stroke-width="2" fill="none" stroke-linecap="round" />
                      <ellipse v-else cx="50" cy="63" rx="5" ry="3" fill="#2d2d2d" />
                    </g>
                    <text v-else x="50" y="68" text-anchor="middle" font-size="12" fill="#666">zzZ</text>

                    <g v-if="(petMood === 'happy' || petMood === 'excited' || petMood === 'content') && !isSleeping" class="cheeks">
                      <ellipse cx="22" cy="55" rx="7" ry="5" fill="url(#cheekGradient)" opacity="0.6" />
                      <ellipse cx="78" cy="55" rx="7" ry="5" fill="url(#cheekGradient)" opacity="0.6" />
                    </g>

                    <g v-if="petMood === 'angry' && !isSleeping" class="anger-mark">
                      <text x="15" y="25" font-size="10">💢</text>
                      <text x="78" y="25" font-size="10">💢</text>
                    </g>

                    <g v-if="petMood === 'sick' && !isSleeping" class="sick-mark">
                      <text x="20" y="30" font-size="10">💊</text>
                    </g>
                  </g>

                  <g v-if="animation === 'love'" class="heart-eyes">
                    <text x="29" y="50" font-size="12">💖</text>
                    <text x="63" y="50" font-size="12">💖</text>
                  </g>

                  <ellipse v-if="isHoveringPet && !isSleeping" cx="50" cy="88" rx="25" ry="6" fill="rgba(0,0,0,0.1)" />
                </svg>

                <div v-for="effect in clickEffects" :key="effect.id"
                  class="click-effect absolute pointer-events-none animate-float-up"
                  :style="{
                    left: effect.x + 'px',
                    top: effect.y + 'px',
                    '--offset-x': effect.offsetX + 'px'
                  }">
                  {{ effect.emoji }}
                </div>

                <svg v-for="particle in particles" :key="particle.id"
                  class="particle absolute pointer-events-none"
                  :style="{
                    '--end-x': particle.endX + 'px',
                    '--end-y': particle.endY + 'px',
                    '--delay': particle.delay + 'ms',
                    '--color': particle.color,
                    '--size': particle.size + 'px'
                  }">
                  <circle cx="50%" cy="50%" r="50%" :fill="particle.color" />
                </svg>
              </div>

              <div v-if="showActionMessage"
                class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/90 rounded-full shadow-lg text-sm font-bold text-pink-500 animate-bounce">
                {{ actionMessage }}
              </div>
            </div>

            <p class="text-center text-gray-600 mt-4 mb-4">{{ petMessage }}</p>

            <p class="text-center text-xs text-gray-400 mb-4">Click Blobby to interact!</p>

            <div class="flex justify-center gap-3">
              <button @click="feed"
                class="px-5 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-2xl hover:from-orange-500 hover:to-orange-600 hover:scale-105 active:scale-95 transition-all font-semibold shadow-lg">
                🍖 Feed
              </button>
              <button @click="petAction"
                class="px-5 py-3 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-2xl hover:from-pink-500 hover:to-pink-600 hover:scale-105 active:scale-95 transition-all font-semibold shadow-lg">
                💕 Cuddle
              </button>
              <button @click="playGame('rps')"
                class="px-5 py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-2xl hover:from-blue-500 hover:to-blue-600 hover:scale-105 active:scale-95 transition-all font-semibold shadow-lg">
                🎮 Play
              </button>
            </div>
          </div>

          <div class="w-full md:w-64">
            <h3 class="text-lg font-semibold text-gray-700 mb-4">Stats</h3>
            <div class="space-y-4">
              <div v-for="stat in stats" :key="stat.label" class="bg-white/60 rounded-xl p-3">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">{{ stat.icon }}</span>
                  <span class="text-sm font-medium text-gray-700">{{ stat.label }}</span>
                  <span class="ml-auto text-sm font-bold" :class="stat.value < 30 ? 'text-red-500' : 'text-gray-600'">{{ stat.value }}%</span>
                </div>
                <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500 ease-out" :class="stat.color"
                    :style="{ width: stat.value + '%' }"></div>
                </div>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-gray-200">
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Mini-games</h3>
              <p class="text-xs text-gray-500 mb-3">Win = Blobby gets bored, Lose = Blobby is happy!</p>
              <div class="flex gap-2">
                <button @click="playGame('rps')" class="flex-1 px-3 py-2 bg-indigo-100 text-indigo-600 rounded-xl text-sm hover:bg-indigo-200 transition-colors font-medium">
                  RPS
                </button>
                <button @click="playGame('guess')" class="flex-1 px-3 py-2 bg-indigo-100 text-indigo-600 rounded-xl text-sm hover:bg-indigo-200 transition-colors font-medium">
                  Guess
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showGame" class="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black/30">
      <div class="bg-white p-8 rounded-3xl max-w-sm w-full mx-4 shadow-2xl">
        <div class="text-center mb-6">
          <div class="text-5xl mb-3">{{ gameType === 'rps' ? '🪨📄✂️' : '🔢' }}</div>
          <h3 class="text-xl font-bold text-gray-800">{{ gameType === 'rps' ? 'Rock Paper Scissors' : 'Guess the Number' }}</h3>
        </div>

        <div v-if="!gameResult" class="space-y-4">
          <p v-if="gameType === 'rps'" class="text-sm text-gray-600 text-center">
            r = rock, p = paper, s = scissors
          </p>
          <p v-else class="text-sm text-gray-600 text-center">
            Guess a number 1-10
          </p>

          <input id="game-input" v-model="gameInput" @keyup.enter="submitGame" @keyup.escape="closeGame" type="text"
            class="w-full p-4 border-2 border-gray-200 rounded-2xl text-center text-2xl focus:border-pink-400 focus:outline-none"
            :placeholder="gameType === 'rps' ? 'r, p, or s' : '1-10'" />

          <div class="flex gap-3">
            <button @click="submitGame"
              class="flex-1 py-3 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl hover:from-pink-500 hover:to-pink-600 font-semibold transition-all">
              Play!
            </button>
            <button @click="closeGame"
              class="px-6 py-3 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300 font-medium transition-all">
              Cancel
            </button>
          </div>
        </div>

        <div v-else class="text-center">
          <p class="text-lg font-medium text-gray-700 mb-6">{{ gameMessage }}</p>
          <div class="flex gap-3">
            <button @click="playGame(gameType)" class="flex-1 py-3 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl hover:from-pink-500 hover:to-pink-600 font-semibold">
              Again!
            </button>
            <button @click="closeGame" class="flex-1 py-3 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300 font-medium">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pet-container {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pet-face.excited {
  animation: bounce 0.3s ease-in-out infinite;
}

.pet-face.happy {
  animation: wiggle 1s ease-in-out infinite;
}

.pet-face.sleepy .eyes {
  animation: blink-slow 2s ease-in-out infinite;
}

.pet-face.crying {
  animation: shake 0.3s ease-in-out infinite;
}

.pet-face.angry {
  animation: shake 0.2s ease-in-out infinite;
}

.pet-face.sick {
  animation: wobble 1.5s ease-in-out infinite;
}

.pet-face.hungry {
  animation: chomp 0.5s ease-in-out infinite;
}

.pet-face.sleeping {
  animation: float 3s ease-in-out infinite;
}

.animation.love {
  animation: heartbeat 0.4s ease-in-out infinite;
}

.animation.eating {
  animation: chomp 0.3s ease-in-out infinite;
}

.animation.excited {
  animation: bounce 0.25s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-8px) scale(1.05, 0.95); }
}

@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(3deg); }
  75% { transform: rotate(-3deg); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

@keyframes wobble {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-2px) rotate(-2deg); }
  50% { transform: translateX(0) rotate(0deg); }
  75% { transform: translateX(2px) rotate(2deg); }
}

@keyframes chomp {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1, 0.9); }
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes blink-slow {
  0%, 90%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
}

.click-effect {
  animation: float-up 1s ease-out forwards;
}

@keyframes float-up {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(-60px) translateX(var(--offset-x)) scale(1.5);
  }
}

.particle {
  width: var(--size);
  height: var(--size);
  animation: explode 0.6s ease-out forwards;
  animation-delay: var(--delay);
}

@keyframes explode {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--end-x), var(--end-y)) scale(0);
  }
}

.heart-eyes {
  animation: heart-pop 0.5s ease-out forwards;
}

@keyframes heart-pop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); opacity: 1; }
}

.cheeks ellipse {
  animation: cheek-pulse 2s ease-in-out infinite;
}

@keyframes cheek-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.9; }
}
</style>