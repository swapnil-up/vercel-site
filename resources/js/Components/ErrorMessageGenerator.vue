<template>
  <div class="max-w-2xl mx-auto p-6 mt-5 bg-black text-green-400 font-mono text-sm rounded-lg shadow-lg">
    <div class="mb-4">
      <div class="flex items-center mb-2">
        <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
        <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
        <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
        <span class="text-gray-400 text-xs ml-2">seriousCLI v1.0.0</span>
      </div>
      <div class="border-b border-gray-600 pb-2">
        <span class="text-blue-400">~/serious-app</span>
      </div>
    </div>

    <!-- Idle State -->
    <div v-if="currentState === 'idle'">
      <p class="mb-4">Welcome to the serious CLI App!</p>
      <p class="mb-4 text-yellow-400">⚠️  Warning: This app may cause existential confusion.</p>
      <button 
        @click="startCLI"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
      >
        Start Application
      </button>
    </div>

    <!-- Confirming State -->
    <div v-if="currentState === 'confirming'">
      <div class="mb-4">
        <div v-for="(line, index) in cliHistory" :key="index" class="mb-1">
          {{ line }}
        </div>
      </div>
      <div class="flex items-center">
        <span class="mr-2">{{ getCurrentPrompt() }}</span>
        <input
          ref="inputRef"
          v-model="userInput"
          @keydown="handleInput"
          type="text"
          class="bg-transparent border-none outline-none text-green-400 flex-1"
          placeholder="(y/n)"
        />
        <span class="animate-pulse">|</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="currentState === 'loading'">
      <div class="mb-4">
        <div class="text-blue-400 mb-2">Processing your request...</div>
        <div class="w-full bg-gray-700 rounded-full h-4 mb-4">
          <div
            class="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full transition-all duration-300"
            :style="{ width: Math.min(progress, 100) + '%' }"
          ></div>
        </div>
        <div class="text-center text-yellow-400">
          {{ progress.toFixed(1) }}% complete
        </div>
      </div>
      
      <div v-if="techMessage" class="text-gray-400 italic animate-pulse">
        {{ techMessage }}
      </div>
    </div>

    <!-- Error State -->
    <div v-if="currentState === 'error'">
      <div class="border border-red-500 bg-red-900 bg-opacity-20 p-4 rounded mb-4">
        <div class="text-red-400 font-bold mb-2">💥 CRITICAL ERROR 💥</div>
        <div class="text-red-300">{{ currentError }}</div>
      </div>
      <button 
        @click="reset"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors mr-2"
      >
        Try Again
      </button>
      <button 
        @click="reset"
        class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
      >
        Give Up
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue'

const currentState = ref('idle') 
const confirmationCount = ref(0)
const userInput = ref('')
const progress = ref(0)
const currentError = ref('')
const techMessage = ref('')
const cliHistory = ref([])
const inputRef = ref(null)
const maxConfirmations = ref(3) 
const shuffledConfirmations = ref([])
const shuffledTechMessages = ref([])
const shuffledErrors = ref([])

let progressInterval = null
let techMessageInterval = null

const errors = [
  "Your code went to buy milk and never came back.",
  "A tiny cosmic ray flipped a bit in your server.",
  "The code is currently on an emotional support journey.",
  "Our hamsters running the servers are on a coffee break.",
  "The API went out to find themselves.",
  "The database is napping. Please whisper to wake it up.",
  "Your variables got into a fistfight. Reconciliation in progress.",
  "Server is binge-watching cat videos. ETA unknown.",
  "The cloud is currently floating in another dimension.",
  "Your loops decided to unionize. Negotiations ongoing.",
  "Syntax error: reality not found.",
  "Infinite recursion detected. The universe implodes gently.",
  "The compiler went outside to feel the sun. Try again later.",
  "Stack overflow: the intern poured actual coffee on it.",
  "404: Motivation not found.",
  "Runtime error: dreams exceeded available memory.",
  "Dependency conflict: one library refuses to talk to the other.",
  "Segmentation fault: the server fell asleep on the job.",
  "Your code joined a circus. Return date TBD.",
  "The AI consulted a psychic and is reconsidering your request.",
  "Permission denied: existential crisis in progress.",
  "Unexpected token: moonlight.",
  "Kernel panic: coffee supply depleted.",
  "The server is composing haikus instead of processing requests.",
  "Access denied: gremlins are guarding the data."
]

const techMessages = [
  "Installing extra RAM...",
  "Optimizing quantum particles...",
  "Counting to infinity...",
  "Downloading the internet...",
  "Calibrating flux capacitor...",
  "Compiling feelings into bytecode...",
  "Negotiating with electrons...",
  "Teaching AI to love...",
  "Reversing entropy...",
  "Calculating meaning of life...",
  "Defragmenting dreams...",
  "Updating reality drivers...",
  "Synchronizing with parallel universes...",
  "Converting coffee to code...",
  "Initializing imagination protocols...",
  "Loading existential dread...",
  "Parsing universal constants...",
  "Optimizing chaos algorithms...",
  "Bootstrapping consciousness...",
  "Debugging the matrix..."
]

const confirmationPrompts = [
  "Are you sure?",
  "Are you REALLY sure?",
  "But are you absolutely certain?",
  "Like, 100% sure sure?",
  "Have you considered the consequences?",
  "Final answer?",
  "No takebacks?",
  "Last chance to back out...",
  "You won't regret this?",
  "Pinky promise?",
  "Cross your heart?",
  "On your mother's grave?",
  "Are you sure you're sure about being sure?",
  "This is your final final answer?",
  "OK but what if you're wrong?",
  "Fine, but I warned you..."
]

const shuffleArray = (array) => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const getCurrentPrompt = () => {
  if (confirmationCount.value < maxConfirmations.value) {
    return shuffledConfirmations.value[confirmationCount.value]
  }
  return "Final confirmation:"
}

const startCLI = () => {
  currentState.value = 'confirming'
  confirmationCount.value = 0
  maxConfirmations.value = Math.floor(Math.random() * 3) + 3 
  
  // Shuffle all arrays for fresh content each time
  shuffledConfirmations.value = shuffleArray(confirmationPrompts)
  shuffledTechMessages.value = shuffleArray(techMessages)
  shuffledErrors.value = shuffleArray(errors)
  
  cliHistory.value = ['$ run-serious-app']
  currentError.value = ''
  
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const handleInput = (e) => {
  if (e.key === 'Enter') {
    const input = userInput.value.toLowerCase().trim()
    const newHistory = [...cliHistory.value, `${getCurrentPrompt()} ${userInput.value}`]
    
    if (input === 'yes' || input === 'y') {
      if (confirmationCount.value < maxConfirmations.value - 1) {
        confirmationCount.value++
        cliHistory.value = newHistory
        userInput.value = ''
      } else {
        cliHistory.value = [...newHistory, 'Initializing...']
        currentState.value = 'loading'
        progress.value = 0
        userInput.value = ''
        startProgress()
      }
    } else if (input === 'no' || input === 'n') {
      cliHistory.value = [...newHistory, 'Wise choice. Goodbye!']
      setTimeout(() => currentState.value = 'idle', 2000)
      userInput.value = ''
    } else {
      cliHistory.value = [...newHistory, 'Please answer yes (y) or no (n)']
      userInput.value = ''
    }
  }
}

const startProgress = () => {
  let techMessageIndex = 0
  
  // Start tech messages with shuffled array
  const showTechMessage = () => {
    if (techMessageIndex < shuffledTechMessages.value.length) {
      techMessage.value = shuffledTechMessages.value[techMessageIndex]
      techMessageIndex++
    } else {
      // If we run out, reshuffle and start over
      shuffledTechMessages.value = shuffleArray(techMessages)
      techMessageIndex = 0
      techMessage.value = shuffledTechMessages.value[techMessageIndex]
      techMessageIndex++
    }
  }
  
  showTechMessage() 
  techMessageInterval = setInterval(showTechMessage, 2000)

  progressInterval = setInterval(() => {
    if (progress.value < 99) {
      progress.value += Math.random() * 2 
    } else {
      progress.value = 99 + Math.random() * 0.5
    }
  }, 150)

  setTimeout(() => {
    clearInterval(progressInterval)
    clearInterval(techMessageInterval)
    const randomError = shuffledErrors.value[0] 
    currentError.value = randomError
    currentState.value = 'error'
    techMessage.value = ''
  }, 8000)
}

const reset = () => {
  currentState.value = 'idle'
  confirmationCount.value = 0
  userInput.value = ''
  progress.value = 0
  currentError.value = ''
  techMessage.value = ''
  cliHistory.value = []
  
  if (progressInterval) clearInterval(progressInterval)
  if (techMessageInterval) clearInterval(techMessageInterval)
}

onUnmounted(() => {
  if (progressInterval) clearInterval(progressInterval)
  if (techMessageInterval) clearInterval(techMessageInterval)
})
</script>