<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const minutes = ref(10);
const isRunning = ref(false);
const timeLeft = ref(0);
const currentRound = ref(0);
const totalRounds = ref(0);

let audioContext = null;
let intervalId = null;

// Initialize Web Audio API
onMounted(() => {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
  if (audioContext) audioContext.close();
});

// Play beep sound
const playBeep = (frequency = 800, duration = 150) => {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration / 1000);
};

const playWarningBeeps = () => {
  playBeep(880, 100);
  setTimeout(() => playBeep(880, 100), 150);
  setTimeout(() => playBeep(880, 100), 300);
};

const playFinalBeep = () => {
  playBeep(1200, 200);
  setTimeout(() => playBeep(1200, 300), 250);
};

// Timer logic
watch([isRunning, timeLeft], ([running, time]) => {
  if (running && time > 0) {
    intervalId = setInterval(() => {
      timeLeft.value--;
      
      // Check for minute mark (beep at start of each minute)
      if (timeLeft.value % 60 === 0 && timeLeft.value > 0) {
        playWarningBeeps();
        currentRound.value = Math.floor((totalRounds.value * 60 - timeLeft.value) / 60) + 1;
      }
      
      // Final beep
      if (timeLeft.value === 0) {
        playFinalBeep();
        isRunning.value = false;
        if (intervalId) clearInterval(intervalId);
      }
    }, 1000);
  } else {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
});

const handleStart = () => {
  const totalSeconds = minutes.value * 60;
  timeLeft.value = totalSeconds;
  totalRounds.value = minutes.value;
  currentRound.value = 1;
  isRunning.value = true;
  playWarningBeeps(); // Initial beep
};

const handlePause = () => {
  isRunning.value = false;
};

const handleResume = () => {
  isRunning.value = true;
};

const handleReset = () => {
  isRunning.value = false;
  timeLeft.value = 0;
  currentRound.value = 0;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const secondsInCurrentMinute = computed(() => timeLeft.value % 60);
const progress = computed(() => 
  timeLeft.value > 0 ? ((60 - secondsInCurrentMinute.value) / 60) * 100 : 0
);
</script>

<template>
  <div class="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Setup Screen -->
      <div v-if="!isRunning && timeLeft === 0" class="bg-neutral-800 rounded-2xl p-8 shadow-2xl">
        <h1 class="text-3xl font-bold text-white mb-8 text-center">
          EMOM Timer
        </h1>
        
        <div class="mb-8">
          <label class="block text-neutral-400 text-sm mb-3">
            Duration (minutes)
          </label>
          <div class="flex items-center gap-4">
            <button
              @click="minutes = Math.max(1, minutes - 1)"
              class="w-12 h-12 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-xl font-bold transition-colors"
            >
              -
            </button>
            <input
              v-model.number="minutes"
              type="number"
              min="1"
              class="flex-1 bg-neutral-700 text-white text-4xl font-bold text-center py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              @click="minutes++"
              class="w-12 h-12 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-xl font-bold transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 mb-8">
          <button
            v-for="min in [5, 10, 15, 20, 25, 30]"
            :key="min"
            @click="minutes = min"
            :class="[
              'py-3 rounded-lg font-medium transition-colors',
              minutes === min 
                ? 'bg-blue-600 text-white' 
                : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            ]"
          >
            {{ min }}m
          </button>
        </div>

        <button
          @click="handleStart"
          class="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg text-xl transition-colors"
        >
          Start
        </button>
      </div>

      <!-- Timer Screen -->
      <div v-if="isRunning || timeLeft > 0" class="bg-neutral-800 rounded-2xl p-8 shadow-2xl">
        <div class="mb-8">
          <div class="text-neutral-400 text-sm mb-2 text-center">
            Round {{ currentRound }} of {{ totalRounds }}
          </div>
          <div class="text-white text-8xl font-bold text-center mb-4 tabular-nums">
            {{ formatTime(timeLeft) }}
          </div>
          
          <!-- Progress bar for current minute -->
          <div class="w-full h-2 bg-neutral-700 rounded-full overflow-hidden">
            <div 
              class="h-full bg-blue-500 transition-all duration-1000 ease-linear"
              :style="{ width: `${progress}%` }"
            />
          </div>
          <div class="text-neutral-500 text-sm mt-2 text-center">
            {{ secondsInCurrentMinute }}s in current minute
          </div>
        </div>

        <div class="flex gap-3">
          <button
            v-if="isRunning"
            @click="handlePause"
            class="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-lg text-xl transition-colors"
          >
            Pause
          </button>
          <button
            v-else
            @click="handleResume"
            class="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg text-xl transition-colors"
          >
            Resume
          </button>
          <button
            @click="handleReset"
            class="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-lg text-xl transition-colors"
          >
            Reset
          </button>
        </div>

        <div class="mt-6 text-center text-neutral-500 text-sm">
          Beep sounds at the start of each minute
        </div>
      </div>
    </div>
  </div>
</template>