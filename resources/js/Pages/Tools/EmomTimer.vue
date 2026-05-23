<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const minutes = ref(10);
const isRunning = ref(false);
const timeLeft = ref(0);
const currentRound = ref(0);
const totalRounds = ref(0);

let audioContext = null;
let intervalId = null;

onMounted(() => {
 audioContext = new (window.AudioContext || window.webkitAudioContext)();
});

onUnmounted(() => {
 if (intervalId) clearInterval(intervalId);
 if (audioContext) audioContext.close();
});

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

watch(isRunning, (running) => {
 if (running) {
 intervalId = setInterval(() => {
 timeLeft.value--;

 if (timeLeft.value % 60 === 0 && timeLeft.value > 0) {
 playWarningBeeps();
 currentRound.value = Math.floor((totalRounds.value * 60 - timeLeft.value) / 60) + 1;
 }

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
 if (audioContext && audioContext.state === 'suspended') {
 audioContext.resume();
 }

 const totalSeconds = minutes.value * 60;
 timeLeft.value = totalSeconds;
 totalRounds.value = minutes.value;
 currentRound.value = 1;
 isRunning.value = true;
 playWarningBeeps();
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

const secondsInCurrentMinute = computed(() => {
 if (timeLeft.value === 0) return 0;
 const remainder = timeLeft.value % 60;
 return remainder === 0 ? 60 : remainder;
});
const progress = computed(() =>
 timeLeft.value > 0 ? ((60 - secondsInCurrentMinute.value) / 60) * 100 : 0
);
</script>

<template>
 <div class="min-h-screen bg-cream flex items-center justify-center p-4">
 <div class="w-full max-w-md">
 <!-- Setup Screen -->
 <div v-if="!isRunning && timeLeft === 0" class="bg-warm-surface border border-warm-border rounded-sm p-8">
 <h1 class="font-display text-3xl font-bold text-ink mb-8 text-center tracking-tight">
 EMOM Timer
 </h1>

 <div class="mb-8">
 <label class="block text-warm-muted text-sm mb-3">
 Duration (minutes)
 </label>
 <div class="flex items-center gap-4">
 <button
 @click="minutes = Math.max(1, minutes - 1)"
 class="w-12 h-12 bg-ink dark:bg-[#1C1C1E] hover:bg-coral text-white rounded-sm text-xl font-bold transition-colors"
 >
 -
 </button>
 <input
 v-model.number="minutes"
 type="number"
 min="1"
 class="flex-1 bg-warm-surface border border-warm-border text-ink text-4xl font-bold text-center py-4 rounded-sm focus:outline-none focus:ring-2 focus:ring-coral"
 />
 <button
 @click="minutes++"
 class="w-12 h-12 bg-ink dark:bg-[#1C1C1E] hover:bg-coral text-white rounded-sm text-xl font-bold transition-colors"
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
 'py-3 rounded-sm font-medium transition-colors',
 minutes === min
 ? 'bg-coral text-white'
 : 'bg-warm-surface text-warm-muted border border-warm-border hover:bg-ink dark:hover:bg-[#1C1C1E] hover:text-white'
 ]"
 >
 {{ min }}m
 </button>
 </div>

 <button
 @click="handleStart"
 class="w-full bg-coral hover:bg-coral/80 text-white font-bold py-4 rounded-sm text-xl transition-colors"
 >
 Start
 </button>
 </div>

 <!-- Timer Screen -->
 <div v-if="isRunning || timeLeft > 0" class="bg-warm-surface border border-warm-border rounded-sm p-8">
 <div class="mb-8">
 <div class="text-warm-muted text-sm mb-2 text-center">
 Round {{ currentRound }} of {{ totalRounds }}
 </div>
 <div class="font-display text-8xl font-bold text-ink text-center mb-4 tabular-nums tracking-tight">
 {{ formatTime(timeLeft) }}
 </div>

 <div class="w-full h-2 bg-warm-border rounded-sm overflow-hidden">
 <div
 class="h-full bg-coral transition-all duration-1000 ease-linear rounded-sm"
 :style="{ width: `${progress}%` }"
 />
 </div>
 <div class="text-warm-muted text-sm mt-2 text-center">
 {{ secondsInCurrentMinute }}s in current minute
 </div>
 </div>

 <div class="flex gap-3">
 <button
 v-if="isRunning"
 @click="handlePause"
 class="flex-1 bg-mustard hover:bg-mustard/80 text-ink font-bold py-4 rounded-sm text-xl transition-colors"
 >
 Pause
 </button>
 <button
 v-else
 @click="handleResume"
 class="flex-1 bg-mint hover:bg-mint/80 text-ink font-bold py-4 rounded-sm text-xl transition-colors"
 >
 Resume
 </button>
 <button
 @click="handleReset"
 class="flex-1 bg-coral hover:bg-coral/80 text-white font-bold py-4 rounded-sm text-xl transition-colors"
 >
 Reset
 </button>
 </div>

 <div class="mt-6 text-center text-warm-muted text-sm">
 Beep sounds at the start of each minute
 </div>
 </div>
 </div>
 </div>
</template>
