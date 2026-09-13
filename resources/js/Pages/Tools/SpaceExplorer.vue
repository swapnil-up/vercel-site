<template>
  <div class="w-full h-screen bg-black overflow-hidden relative select-none" ref="containerRef">
    <div id="three-container" class="absolute inset-0"></div>

    <!-- CRT Scanline Overlay -->
    <div class="absolute inset-0 pointer-events-none z-10 scanlines"></div>
    <div class="absolute inset-0 pointer-events-none z-10 crt-vignette"></div>

    <!-- HUD — Cockpit Style -->
    <div v-if="gameState === 'playing'" class="absolute inset-0 pointer-events-none z-20">
      <div class="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent"></div>
      <div class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent"></div>

      <div class="absolute top-3 left-4 right-4 flex justify-between items-start">
        <!-- Score -->
        <div class="hud-panel">
          <div class="hud-label">SCORE</div>
          <div class="hud-value text-neon-cyan glow-cyan">{{ score.toLocaleString() }}</div>
        </div>

        <!-- Time survived -->
        <div class="hud-panel items-center">
          <div class="hud-label">TIME</div>
          <div class="hud-value text-neon-magenta glow-magenta tabular-nums">{{ formatTime(timeSurvived) }}</div>
        </div>

        <!-- Health -->
        <div class="hud-panel items-end">
          <div class="hud-label">HULL</div>
          <div class="flex gap-1.5">
            <div v-for="i in 5" :key="i"
              class="w-3.5 h-5 border transition-all duration-300"
              :class="i <= health
                ? 'bg-neon-red border-neon-red shadow-[0_0_8px_var(--neon-red)]'
                : 'bg-white/5 border-white/10'">
            </div>
          </div>
        </div>
      </div>

      <!-- Power-up indicators — left side, stacked -->
      <div class="absolute top-20 left-4 flex flex-col gap-2">
        <div v-if="activePowerUps.shield" class="powerup-badge border-neon-cyan/60 text-neon-cyan">
          <div class="w-1.5 h-1.5 bg-neon-cyan animate-pulse shadow-[0_0_6px_var(--neon-cyan)]"></div>
          <span>SHIELD</span>
        </div>
        <div v-if="activePowerUps.speed" class="powerup-badge border-neon-yellow/60 text-neon-yellow">
          <div class="w-1.5 h-1.5 bg-neon-yellow animate-pulse shadow-[0_0_6px_var(--neon-yellow)]"></div>
          <span>BOOST</span>
        </div>
        <div v-if="activePowerUps.magnet" class="powerup-badge border-neon-green/60 text-neon-green">
          <div class="w-1.5 h-1.5 bg-neon-green animate-pulse shadow-[0_0_6px_var(--neon-green)]"></div>
          <span>MAGNET</span>
        </div>
      </div>

      <!-- Bottom left — Destroyed count -->
      <div class="absolute bottom-5 left-4">
        <div class="hud-label mb-1">DESTROYED</div>
        <div class="flex items-baseline gap-1">
          <span class="text-neon-red glow-red font-display text-2xl font-bold tabular-nums">{{ asteroidsDestroyed }}</span>
        </div>
      </div>

      <!-- Bottom center — Fire cooldown -->
      <div class="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        <div class="hud-label">WEAPON</div>
        <div class="w-32 h-1.5 bg-white/5 relative overflow-hidden border border-white/5">
          <div class="h-full transition-all duration-75"
            :class="shootCooldown <= 0 ? 'bg-neon-green shadow-[0_0_8px_var(--neon-green)]' : 'bg-neon-yellow/60'"
            :style="{ width: shootCooldown <= 0 ? '100%' : ((1 - shootCooldown / SHOOT_COOLDOWN) * 100) + '%' }">
          </div>
        </div>
        <div class="text-[8px] font-mono tracking-widest" :class="shootCooldown <= 0 ? 'text-neon-green/60' : 'text-white/20'">
          {{ shootCooldown <= 0 ? 'READY' : 'RELOADING' }}
        </div>
      </div>

      <!-- Bottom right — Speed -->
      <div class="absolute bottom-5 right-4 text-right">
        <div class="hud-label mb-1">VELOCITY</div>
        <div class="flex items-baseline gap-1 justify-end">
          <span class="text-white font-display text-2xl font-bold tabular-nums">{{ Math.round(currentSpeed * 10) }}</span>
          <span class="text-white/30 font-mono text-xs">KM/S</span>
        </div>
      </div>

      <!-- Corner brackets -->
      <svg class="absolute top-0 left-0 w-12 h-12 text-neon-cyan/30" viewBox="0 0 48 48">
        <path d="M0 16 L0 0 L16 0" fill="none" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <svg class="absolute top-0 right-0 w-12 h-12 text-neon-cyan/30" viewBox="0 0 48 48">
        <path d="M48 16 L48 0 L32 0" fill="none" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <svg class="absolute bottom-0 left-0 w-12 h-12 text-neon-cyan/30" viewBox="0 0 48 48">
        <path d="M0 32 L0 48 L16 48" fill="none" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <svg class="absolute bottom-0 right-0 w-12 h-12 text-neon-cyan/30" viewBox="0 0 48 48">
        <path d="M48 32 L48 48 L32 48" fill="none" stroke="currentColor" stroke-width="1.5"/>
      </svg>

      <!-- Touch controls for mobile -->
      <div v-if="isMobile" class="absolute bottom-24 left-0 right-0 flex justify-between px-6 pointer-events-auto">
        <div class="flex flex-col gap-2">
          <button @touchstart.prevent="touchUp = true" @touchend.prevent="touchUp = false"
            class="touch-btn">▲</button>
          <div class="flex gap-2">
            <button @touchstart.prevent="touchLeft = true" @touchend.prevent="touchLeft = false"
              class="touch-btn">◀</button>
            <button @touchstart.prevent="touchDown = true" @touchend.prevent="touchDown = false"
              class="touch-btn">▼</button>
            <button @touchstart.prevent="touchRight = true" @touchend.prevent="touchRight = false"
              class="touch-btn">▶</button>
          </div>
        </div>
        <div class="flex flex-col gap-3 items-center">
          <button @touchstart.prevent="touchBoost = true" @touchend.prevent="touchBoost = false"
            class="w-16 h-16 rounded border-2 border-neon-yellow/60 bg-neon-yellow/10 flex items-center justify-center text-neon-yellow text-[10px] font-mono active:bg-neon-yellow/30 shadow-[0_0_12px_var(--neon-yellow)]">
            BOOST
          </button>
          <button @touchstart.prevent="touchFire = true" @touchend.prevent="touchFire = false"
            class="w-16 h-16 rounded border-2 border-neon-green/60 bg-neon-green/10 flex items-center justify-center text-neon-green text-[10px] font-mono active:bg-neon-green/30 shadow-[0_0_12px_var(--neon-green)]">
            FIRE
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- START SCREEN -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="gameState === 'menu'" class="absolute inset-0 flex flex-col items-center justify-center z-20">
      <div class="absolute inset-0 bg-black/70"></div>
      <div class="relative text-center px-6">
        <div class="mb-2">
          <div class="text-neon-red text-xs font-mono tracking-[0.3em] mb-4 animate-pulse">▶ INSERT COIN TO PLAY</div>
        </div>
        <h1 class="font-arcade text-4xl md:text-6xl lg:text-7xl text-neon-cyan glow-cyan-lg mb-1 tracking-wider chromatic">
          SPACE
        </h1>
        <h1 class="font-arcade text-4xl md:text-6xl lg:text-7xl text-neon-magenta glow-magenta-lg mb-6 tracking-wider chromatic">
          EXPLORER
        </h1>

        <div class="flex items-center justify-center gap-3 mb-6">
          <div class="h-px w-16 bg-gradient-to-r from-transparent to-neon-cyan/50"></div>
          <div class="w-1.5 h-1.5 bg-neon-cyan rotate-45 shadow-[0_0_6px_var(--neon-cyan)]"></div>
          <div class="h-px w-16 bg-gradient-to-l from-transparent to-neon-cyan/50"></div>
        </div>

        <p class="text-white/40 text-sm font-mono mb-2 tracking-wider">
          SHOOT ASTEROIDS. COLLECT STARS. SURVIVE.
        </p>
        <div class="flex flex-col gap-1 text-white/25 text-xs font-mono mb-8 tracking-widest uppercase">
          <span>WASD / ARROWS — MOVE</span>
          <span>SPACE — FIRE &nbsp;·&nbsp; SHIFT — BOOST</span>
        </div>

        <button @click="startGame" class="arcade-btn group">
          <span class="relative z-10 font-arcade text-lg tracking-widest group-hover:text-black transition-colors">LAUNCH</span>
          <div class="absolute inset-0 bg-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>

        <div v-if="highScores.length" class="mt-12 max-w-xs mx-auto">
          <div class="flex items-center justify-center gap-2 mb-4">
            <div class="h-px w-8 bg-white/10"></div>
            <span class="text-neon-yellow/60 text-[10px] font-mono tracking-[0.3em]">HIGH SCORES</span>
            <div class="h-px w-8 bg-white/10"></div>
          </div>
          <div class="border border-white/5 bg-white/[0.02]">
            <div v-for="(hs, i) in highScores.slice(0, 5)" :key="i"
              class="flex justify-between items-center px-4 py-2 border-b border-white/5 last:border-0"
              :class="i === 0 ? 'text-neon-yellow' : 'text-white/50'">
              <span class="font-mono text-xs w-6">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="font-mono text-sm font-bold tabular-nums flex-1 text-right mr-4">{{ hs.score.toLocaleString().padStart(8, '0') }}</span>
              <span class="font-mono text-[10px] opacity-50">{{ formatTime(hs.time) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- GAME OVER -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="gameState === 'gameOver'" class="absolute inset-0 flex flex-col items-center justify-center z-20">
      <div class="absolute inset-0 bg-black/70"></div>
      <div class="relative text-center">
        <div class="text-neon-red text-xs font-mono tracking-[0.3em] mb-4 animate-pulse">⚠ HULL BREACH ⚠</div>
        <h2 class="font-arcade text-4xl md:text-6xl text-neon-red glow-red-lg mb-8 chromatic-red">
          GAME OVER
        </h2>

        <div class="mb-6">
          <div class="text-white/30 text-[10px] font-mono tracking-[0.3em] mb-2">FINAL SCORE</div>
          <div class="text-neon-cyan font-arcade text-3xl md:text-5xl glow-cyan tabular-nums">
            {{ score.toLocaleString().padStart(8, '0') }}
          </div>
        </div>

        <div class="flex justify-center gap-6 mb-8 text-xs font-mono">
          <div class="text-center">
            <div class="text-white/20 tracking-widest mb-1">TIME</div>
            <div class="text-neon-magenta text-lg">{{ formatTime(timeSurvived) }}</div>
          </div>
          <div class="w-px bg-white/10"></div>
          <div class="text-center">
            <div class="text-white/20 tracking-widest mb-1">STARS</div>
            <div class="text-neon-yellow text-lg">{{ totalStars }}</div>
          </div>
          <div class="w-px bg-white/10"></div>
          <div class="text-center">
            <div class="text-white/20 tracking-widest mb-1">KILLS</div>
            <div class="text-neon-red text-lg">{{ asteroidsDestroyed }}</div>
          </div>
        </div>

        <div v-if="isNewHighScore" class="mb-6">
          <span class="text-neon-yellow font-arcade text-sm animate-pulse glow-yellow tracking-widest">
            ★ NEW HIGH SCORE ★
          </span>
        </div>

        <div class="flex flex-col gap-3">
          <button @click="startGame" class="arcade-btn">
            <span class="relative z-10 font-arcade tracking-widest group-hover:text-black transition-colors">RETRY</span>
            <div class="absolute inset-0 bg-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
          <button @click="gameState = 'menu'" class="text-white/30 text-xs font-mono tracking-widest hover:text-white/60 transition-colors mt-2">
            ← BACK TO MENU
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- PAUSED -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="gameState === 'paused'" class="absolute inset-0 flex flex-col items-center justify-center z-20">
      <div class="absolute inset-0 bg-black/80"></div>
      <div class="relative text-center">
        <h2 class="font-arcade text-3xl md:text-5xl text-white/80 mb-2 animate-pulse">PAUSED</h2>
        <div class="text-white/20 text-xs font-mono tracking-widest mb-8">PRESS ESC TO RESUME</div>

        <div class="flex flex-col gap-3">
          <button @click="resumeGame" class="arcade-btn">
            <span class="relative z-10 font-arcade tracking-widest group-hover:text-black transition-colors">RESUME</span>
            <div class="absolute inset-0 bg-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
          <button @click="quitToMenu" class="text-white/30 text-xs font-mono tracking-widest hover:text-white/60 transition-colors mt-2">
            ← QUIT TO MENU
          </button>
        </div>
      </div>
    </div>

    <!-- Damage flash -->
    <div v-if="damageFlash" class="absolute inset-0 pointer-events-none z-30 damage-flash"></div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

:root {
  --neon-cyan: #00f0ff;
  --neon-magenta: #ff00aa;
  --neon-red: #ff2244;
  --neon-green: #00ff88;
  --neon-yellow: #ffcc00;
  --neon-blue: #4466ff;
}

.font-arcade {
  font-family: 'Press Start 2P', monospace;
}

.text-neon-cyan { color: var(--neon-cyan); }
.text-neon-magenta { color: var(--neon-magenta); }
.text-neon-red { color: var(--neon-red); }
.text-neon-green { color: var(--neon-green); }
.text-neon-yellow { color: var(--neon-yellow); }

.border-neon-cyan { border-color: var(--neon-cyan); }
.border-neon-green { border-color: var(--neon-green); }
.border-neon-red { border-color: var(--neon-red); }

.bg-neon-red { background-color: var(--neon-red); }
.bg-neon-green { background-color: var(--neon-green); }
.bg-neon-cyan { background-color: var(--neon-cyan); }
.bg-neon-yellow { background-color: var(--neon-yellow); }

.glow-cyan { text-shadow: 0 0 7px var(--neon-cyan), 0 0 20px var(--neon-cyan); }
.glow-cyan-lg { text-shadow: 0 0 10px var(--neon-cyan), 0 0 40px var(--neon-cyan), 0 0 80px var(--neon-cyan); }
.glow-magenta { text-shadow: 0 0 7px var(--neon-magenta), 0 0 20px var(--neon-magenta); }
.glow-magenta-lg { text-shadow: 0 0 10px var(--neon-magenta), 0 0 40px var(--neon-magenta), 0 0 80px var(--neon-magenta); }
.glow-red { text-shadow: 0 0 7px var(--neon-red), 0 0 20px var(--neon-red); }
.glow-red-lg { text-shadow: 0 0 10px var(--neon-red), 0 0 40px var(--neon-red), 0 0 80px var(--neon-red); }
.glow-green { text-shadow: 0 0 7px var(--neon-green), 0 0 20px var(--neon-green); }
.glow-green-lg { text-shadow: 0 0 10px var(--neon-green), 0 0 40px var(--neon-green), 0 0 80px var(--neon-green); }
.glow-yellow { text-shadow: 0 0 7px var(--neon-yellow), 0 0 20px var(--neon-yellow); }

.chromatic {
  position: relative;
}
.chromatic::before,
.chromatic::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.6;
}
.chromatic::before {
  color: var(--neon-magenta);
  clip-path: inset(0 0 50% 0);
  transform: translate(-2px, -1px);
  mix-blend-mode: screen;
}
.chromatic::after {
  color: var(--neon-cyan);
  clip-path: inset(50% 0 0 0);
  transform: translate(2px, 1px);
  mix-blend-mode: screen;
}

.chromatic-red {
  position: relative;
}
.chromatic-red::before {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  color: var(--neon-cyan);
  clip-path: inset(0 0 50% 0);
  transform: translate(-2px, -1px);
  mix-blend-mode: screen;
  opacity: 0.5;
}

.scanlines {
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  opacity: 0.4;
}

.crt-vignette {
  background: radial-gradient(
    ellipse at center,
    transparent 50%,
    rgba(0, 0, 0, 0.5) 100%
  );
}

.hud-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hud-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: rgba(255, 255, 255, 0.25);
  letter-spacing: 0.15em;
}

.hud-value {
  font-family: 'Press Start 2P', monospace;
  font-size: 20px;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

.powerup-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid;
  padding: 3px 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  letter-spacing: 0.1em;
  backdrop-filter: blur(4px);
}

.arcade-btn {
  position: relative;
  border: 2px solid var(--neon-cyan);
  background: transparent;
  padding: 14px 40px;
  color: var(--neon-cyan);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
  text-shadow: 0 0 8px var(--neon-cyan);
  box-shadow: 0 0 15px rgba(0, 240, 255, 0.15), inset 0 0 15px rgba(0, 240, 255, 0.05);
}
.arcade-btn:hover {
  color: black;
  box-shadow: 0 0 30px rgba(0, 240, 255, 0.4), inset 0 0 30px rgba(0, 240, 255, 0.1);
  text-shadow: none;
}
.arcade-btn:active {
  transform: scale(0.97);
}

.touch-btn {
  width: 52px;
  height: 52px;
  border: 1px solid rgba(0, 240, 255, 0.3);
  background: rgba(0, 240, 255, 0.05);
  color: var(--neon-cyan);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  -webkit-tap-highlight-color: transparent;
}
.touch-btn:active {
  background: rgba(0, 240, 255, 0.2);
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.3);
}

.damage-flash {
  animation: damageFlash 0.15s ease-out;
}

@keyframes damageFlash {
  0% {
    background: rgba(255, 34, 68, 0.4);
    box-shadow: inset 0 0 100px rgba(255, 34, 68, 0.3);
  }
  50% {
    background: rgba(255, 34, 68, 0.15);
    transform: translate(2px, -1px);
  }
  100% {
    background: transparent;
    transform: translate(0, 0);
  }
}

@keyframes crtFlicker {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.95; }
  94% { opacity: 1; }
}

#three-container {
  animation: crtFlicker 4s infinite;
}
</style>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import * as THREE from 'three'

defineOptions({ layout: null })

const containerRef = ref(null)
const gameState = ref('menu')
const score = ref(0)
const health = ref(5)
const totalStars = ref(0)
const asteroidsDestroyed = ref(0)
const highScores = ref([])
const isNewHighScore = ref(false)
const damageFlash = ref(false)
const isMobile = ref(false)
const timeSurvived = ref(0)
const shootCooldown = ref(0)

const activePowerUps = reactive({ shield: false, speed: false, magnet: false })

let touchUp = false, touchDown = false, touchLeft = false, touchRight = false, touchBoost = false, touchFire = false

const BASE_SPEED = 0.3
const BOOST_SPEED = 0.6
const LATERAL_SPEED = 0.25
const SHOOT_COOLDOWN = 300 // ms
const PROJECTILE_SPEED = 1.2

let scene, camera, renderer, clock
let shipGroup, shieldMesh, engineParticles
let asteroids = [], stars = [], powerUps = [], projectiles = [], explosions = []
let starfield
let animationId
let currentSpeed = ref(BASE_SPEED)
let lastShotTime = 0
let lastPowerUpTime = 0
let gameTime = 0
let difficultyLevel = 0

const keysPressed = new Set()

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function init() {
  const container = containerRef.value
  const w = container.clientWidth
  const h = container.clientHeight

  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x000008, 0.009)

  camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 200)
  camera.position.set(0, 3, 8)
  camera.lookAt(0, 0, -10)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000008)
  document.getElementById('three-container').appendChild(renderer.domElement)

  clock = new THREE.Clock()

  const ambient = new THREE.AmbientLight(0x111133, 0.6)
  scene.add(ambient)

  const dirLight = new THREE.DirectionalLight(0xccddff, 0.8)
  dirLight.position.set(5, 10, 5)
  scene.add(dirLight)

  const pointLight = new THREE.PointLight(0x00f0ff, 1.5, 60)
  pointLight.position.set(0, 5, 2)
  scene.add(pointLight)

  createStarfield()
  createShip()

  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  isMobile.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  loadHighScores()
  animate()
}

function createStarfield() {
  const count = 2500
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 250
    positions[i * 3 + 1] = (Math.random() - 0.5) * 250
    positions[i * 3 + 2] = (Math.random() - 0.5) * 250

    const color = new THREE.Color()
    const hue = 0.5 + Math.random() * 0.2
    color.setHSL(hue, 0.4 + Math.random() * 0.3, 0.5 + Math.random() * 0.5)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
  })

  starfield = new THREE.Points(geometry, material)
  scene.add(starfield)
}

function createShip() {
  shipGroup = new THREE.Group()

  const bodyGeo = new THREE.ConeGeometry(0.4, 1.8, 6)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x00ccff,
    metalness: 0.8,
    roughness: 0.2,
    emissive: 0x003366,
    emissiveIntensity: 0.4,
  })
  const ship = new THREE.Mesh(bodyGeo, bodyMat)
  ship.rotation.x = Math.PI / 2
  shipGroup.add(ship)

  const wingGeo = new THREE.BoxGeometry(2.2, 0.05, 0.6)
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x330066,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0xff00aa,
    emissiveIntensity: 0.15,
  })
  const wings = new THREE.Mesh(wingGeo, wingMat)
  wings.position.z = 0.2
  shipGroup.add(wings)

  const cockpitGeo = new THREE.SphereGeometry(0.2, 8, 8)
  const cockpitMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 })
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat)
  cockpit.position.set(0, 0.15, -0.1)
  shipGroup.add(cockpit)

  // Gun tips — two small cyan dots on wing tips
  const gunGeo = new THREE.SphereGeometry(0.06, 6, 6)
  const gunMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff })
  const gunL = new THREE.Mesh(gunGeo, gunMat)
  gunL.position.set(-0.85, 0, 0)
  shipGroup.add(gunL)
  const gunR = new THREE.Mesh(gunGeo, gunMat)
  gunR.position.set(0.85, 0, 0)
  shipGroup.add(gunR)

  const engineGeo = new THREE.SphereGeometry(0.15, 8, 8)
  const engineMat = new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0.9 })
  const engine = new THREE.Mesh(engineGeo, engineMat)
  engine.position.z = 0.9
  shipGroup.add(engine)

  const ringGeo = new THREE.RingGeometry(0.18, 0.28, 16)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff2244,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.position.z = 0.9
  ring.rotation.x = Math.PI / 2
  shipGroup.add(ring)

  const shieldGeo = new THREE.SphereGeometry(1.5, 16, 16)
  const shieldMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0, wireframe: true })
  shieldMesh = new THREE.Mesh(shieldGeo, shieldMat)
  shipGroup.add(shieldMesh)

  shipGroup.position.set(0, 0, 0)
  scene.add(shipGroup)

  createEngineParticles()
}

function createEngineParticles() {
  const count = 80
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const lifetimes = new Float32Array(count)

  for (let i = 0; i < count; i++) resetParticle(i, positions, velocities, lifetimes)

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    color: 0xff2244,
    size: 0.08,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  })

  engineParticles = new THREE.Points(geometry, material)
  engineParticles.userData = { velocities, lifetimes }
  scene.add(engineParticles)
}

function resetParticle(i, positions, velocities, lifetimes) {
  positions[i * 3] = (Math.random() - 0.5) * 0.2
  positions[i * 3 + 1] = (Math.random() - 0.5) * 0.2
  positions[i * 3 + 2] = 1.0 + Math.random() * 0.3
  velocities[i * 3] = (Math.random() - 0.5) * 0.02
  velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02
  velocities[i * 3 + 2] = 0.05 + Math.random() * 0.1
  lifetimes[i] = Math.random()
}

function spawnAsteroid() {
  const size = 0.4 + Math.random() * 1.2
  const detail = Math.floor(Math.random() * 2) + 1
  const geo = new THREE.IcosahedronGeometry(size, detail)

  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
    v.multiplyScalar(0.7 + Math.random() * 0.6)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()

  const hue = Math.random() * 0.1
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, 0.15, 0.15 + Math.random() * 0.1),
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  })

  const asteroid = new THREE.Mesh(geo, mat)
  asteroid.position.set(
    (Math.random() - 0.5) * 16,
    (Math.random() - 0.5) * 8,
    -40 - Math.random() * 60
  )
  asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
  asteroid.userData = {
    rotSpeed: new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02
    ),
    size,
    x: asteroid.position.x,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.5 + Math.random() * 1.5,
    wobbleAmp: 0.3 + Math.random() * 0.8,
  }

  scene.add(asteroid)
  asteroids.push(asteroid)
}

function spawnStar() {
  const geo = new THREE.OctahedronGeometry(0.3, 0)
  const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.9 })
  const star = new THREE.Mesh(geo, mat)

  const glowGeo = new THREE.SphereGeometry(0.55, 8, 8)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffcc00, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending,
  })
  star.add(new THREE.Mesh(glowGeo, glowMat))

  star.position.set(
    (Math.random() - 0.5) * 14,
    (Math.random() - 0.5) * 7,
    -30 - Math.random() * 50
  )
  star.userData = { collected: false }

  scene.add(star)
  stars.push(star)
}

function spawnPowerUp() {
  const types = ['shield', 'speed', 'magnet']
  const type = types[Math.floor(Math.random() * types.length)]
  const colors = { shield: 0x00f0ff, speed: 0xffcc00, magnet: 0x00ff88 }
  const geo = new THREE.DodecahedronGeometry(0.4, 0)
  const mat = new THREE.MeshBasicMaterial({ color: colors[type], transparent: true, opacity: 0.85 })
  const pu = new THREE.Mesh(geo, mat)

  const ringGeo = new THREE.RingGeometry(0.5, 0.65, 16)
  const ringMat = new THREE.MeshBasicMaterial({
    color: colors[type], transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  })
  pu.add(new THREE.Mesh(ringGeo, ringMat))

  pu.position.set(
    (Math.random() - 0.5) * 12,
    (Math.random() - 0.5) * 6,
    -30 - Math.random() * 40
  )
  pu.userData = { type, collected: false }

  scene.add(pu)
  powerUps.push(pu)
}

function shoot() {
  const now = Date.now()
  if (now - lastShotTime < SHOOT_COOLDOWN) return
  lastShotTime = now
  shootCooldown.value = SHOOT_COOLDOWN

  // Fire two projectiles from wing tips
  const offsets = [-0.85, 0.85]
  for (const ox of offsets) {
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.5)
    const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 })
    const proj = new THREE.Mesh(geo, mat)

    // Add glow trail
    const trailGeo = new THREE.BoxGeometry(0.06, 0.06, 1.2)
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending,
    })
    const trail = new THREE.Mesh(trailGeo, trailMat)
    trail.position.z = 0.6
    proj.add(trail)

    proj.position.set(
      shipGroup.position.x + ox,
      shipGroup.position.y,
      shipGroup.position.z
    )
    proj.userData = { life: 1.0 }

    scene.add(proj)
    projectiles.push(proj)
  }
}

function createExplosion(position, color = 0xff2244, count = 30) {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const velocities = []

  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x
    positions[i * 3 + 1] = position.y
    positions[i * 3 + 2] = position.z

    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const speed = 0.05 + Math.random() * 0.15
    velocities.push(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed
    )
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color, size: 0.15, transparent: true, opacity: 1, blending: THREE.AdditiveBlending,
  })

  const particles = new THREE.Points(geo, mat)
  particles.userData = { velocities, life: 1.0 }
  scene.add(particles)
  explosions.push(particles)
}

function createCollectionEffect(position) {
  const count = 15
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const velocities = []

  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x
    positions[i * 3 + 1] = position.y
    positions[i * 3 + 2] = position.z
    const angle = (i / count) * Math.PI * 2
    velocities.push(Math.cos(angle) * 0.1, Math.sin(angle) * 0.1, (Math.random() - 0.5) * 0.05)
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color: 0xffcc00, size: 0.12, transparent: true, opacity: 1, blending: THREE.AdditiveBlending,
  })

  const particles = new THREE.Points(geo, mat)
  particles.userData = { velocities, life: 1.0 }
  scene.add(particles)
  explosions.push(particles)
}

function spawnInitialContent() {
  for (let i = 0; i < 15; i++) spawnAsteroid()
  for (let i = 0; i < 6; i++) spawnStar()
}

function checkCollisions() {
  if (!shipGroup) return
  const shipPos = shipGroup.position
  const shipRadius = 0.6

  // Projectile vs asteroid
  for (let pi = projectiles.length - 1; pi >= 0; pi--) {
    const proj = projectiles[pi]
    for (let ai = asteroids.length - 1; ai >= 0; ai--) {
      const a = asteroids[ai]
      const dist = proj.position.distanceTo(a.position)
      if (dist < a.userData.size * 0.9 + 0.3) {
        // Destroy asteroid
        createExplosion(a.position, 0x00f0ff, 20)
        scene.remove(a)
        asteroids.splice(ai, 1)

        // Remove projectile
        scene.remove(proj)
        projectiles.splice(pi, 1)

        asteroidsDestroyed.value++
        score.value += 250 + difficultyLevel * 50
        break
      }
    }
  }

  // Ship vs asteroid
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i]
    const dist = shipPos.distanceTo(a.position)
    if (dist < shipRadius + a.userData.size * 0.8) {
      if (activePowerUps.shield) {
        createExplosion(a.position, 0x00f0ff, 15)
        scene.remove(a)
        asteroids.splice(i, 1)
      } else {
        takeDamage()
        createExplosion(a.position, 0xff2244, 25)
        scene.remove(a)
        asteroids.splice(i, 1)
      }
    }
  }

  // Ship vs star
  const magnetRange = activePowerUps.magnet ? 4 : 0
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i]
    if (s.userData.collected) continue

    const dist = shipPos.distanceTo(s.position)
    if (magnetRange > 0 && dist < magnetRange) {
      const dir = new THREE.Vector3().subVectors(shipPos, s.position).normalize()
      s.position.add(dir.multiplyScalar(0.15))
    }

    if (dist < shipRadius + 0.4) {
      s.userData.collected = true
      createCollectionEffect(s.position)
      scene.remove(s)
      stars.splice(i, 1)
      totalStars.value++
      score.value += 100
    }
  }

  // Ship vs power-up
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const pu = powerUps[i]
    if (pu.userData.collected) continue

    const dist = shipPos.distanceTo(pu.position)
    if (dist < shipRadius + 0.5) {
      pu.userData.collected = true
      createExplosion(pu.position, pu.material.color.getHex(), 15)
      scene.remove(pu)
      powerUps.splice(i, 1)
      activatePowerUp(pu.userData.type)
    }
  }
}

function activatePowerUp(type) {
  activePowerUps[type] = true
  if (type === 'shield') shieldMesh.material.opacity = 0.15
  setTimeout(() => {
    activePowerUps[type] = false
    if (type === 'shield') shieldMesh.material.opacity = 0
  }, 8000)
}

function takeDamage() {
  if (damageFlash.value) return
  health.value--
  damageFlash.value = true
  setTimeout(() => { damageFlash.value = false }, 200)

  if (health.value <= 0) gameOver()
}

function clearField() {
  asteroids.forEach(a => scene.remove(a))
  stars.forEach(s => scene.remove(s))
  powerUps.forEach(p => scene.remove(p))
  projectiles.forEach(p => scene.remove(p))
  explosions.forEach(e => scene.remove(e))
  asteroids = []
  stars = []
  powerUps = []
  projectiles = []
  explosions = []
}

function gameOver() {
  gameState.value = 'gameOver'
  createExplosion(shipGroup.position, 0xff2244, 50)

  const entry = { score: score.value, time: timeSurvived.value, date: Date.now() }
  highScores.value.push(entry)
  highScores.value.sort((a, b) => b.score - a.score)
  highScores.value = highScores.value.slice(0, 10)
  localStorage.setItem('spaceExplorer_highScores', JSON.stringify(highScores.value))
  isNewHighScore.value = highScores.value[0]?.date === entry.date && highScores.value[0]?.score === entry.score
}

function startGame() {
  clearField()
  score.value = 0
  health.value = 5
  totalStars.value = 0
  asteroidsDestroyed.value = 0
  timeSurvived.value = 0
  gameTime = 0
  difficultyLevel = 0
  lastPowerUpTime = 0
  activePowerUps.shield = false
  activePowerUps.speed = false
  activePowerUps.magnet = false
  shieldMesh.material.opacity = 0
  shipGroup.position.set(0, 0, 0)
  currentSpeed.value = BASE_SPEED
  lastShotTime = 0
  shootCooldown.value = 0
  spawnInitialContent()
  gameState.value = 'playing'
}

function resumeGame() {
  gameState.value = 'playing'
}

function quitToMenu() {
  clearField()
  gameState.value = 'menu'
}

function loadHighScores() {
  try {
    const data = localStorage.getItem('spaceExplorer_highScores')
    if (data) highScores.value = JSON.parse(data)
  } catch (e) { /* ignore */ }
}

function updateEngineParticles(dt) {
  if (!engineParticles) return
  const positions = engineParticles.geometry.attributes.position.array
  const { velocities, lifetimes } = engineParticles.userData
  const count = lifetimes.length

  for (let i = 0; i < count; i++) {
    lifetimes[i] -= dt * 2
    if (lifetimes[i] <= 0) {
      resetParticle(i, positions, velocities, lifetimes)
      if (shipGroup) {
        positions[i * 3] += shipGroup.position.x
        positions[i * 3 + 1] += shipGroup.position.y
        positions[i * 3 + 2] += shipGroup.position.z
      }
    } else {
      positions[i * 3] += velocities[i * 3]
      positions[i * 3 + 1] += velocities[i * 3 + 1]
      positions[i * 3 + 2] += velocities[i * 3 + 2]
    }
  }

  engineParticles.geometry.attributes.position.needsUpdate = true
}

function updateExplosions(dt) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i]
    e.userData.life -= dt * 2
    if (e.userData.life <= 0) {
      scene.remove(e)
      explosions.splice(i, 1)
      continue
    }

    e.material.opacity = e.userData.life
    const positions = e.geometry.attributes.position.array
    const vels = e.userData.velocities
    for (let j = 0; j < vels.length / 3; j++) {
      positions[j * 3] += vels[j * 3]
      positions[j * 3 + 1] += vels[j * 3 + 1]
      positions[j * 3 + 2] += vels[j * 3 + 2]
    }
    e.geometry.attributes.position.needsUpdate = true
  }
}

function getDifficultyAsteroidCount() {
  return 15 + difficultyLevel * 4
}

function animate() {
  animationId = requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)

  if (gameState.value === 'playing') {
    const speed = activePowerUps.speed ? BOOST_SPEED * 1.5 : (keysPressed.has('Shift') || touchBoost ? BOOST_SPEED : BASE_SPEED)
    currentSpeed.value = speed

    // Movement
    let moveX = 0, moveY = 0
    if (keysPressed.has('ArrowLeft') || keysPressed.has('a') || keysPressed.has('A') || touchLeft) moveX = -LATERAL_SPEED
    if (keysPressed.has('ArrowRight') || keysPressed.has('d') || keysPressed.has('D') || touchRight) moveX = LATERAL_SPEED
    if (keysPressed.has('ArrowUp') || keysPressed.has('w') || keysPressed.has('W') || touchUp) moveY = LATERAL_SPEED * 0.7
    if (keysPressed.has('ArrowDown') || keysPressed.has('s') || keysPressed.has('S') || touchDown) moveY = -LATERAL_SPEED * 0.7

    shipGroup.position.x = THREE.MathUtils.clamp(shipGroup.position.x + moveX, -7, 7)
    shipGroup.position.y = THREE.MathUtils.clamp(shipGroup.position.y + moveY, -3.5, 3.5)
    shipGroup.rotation.z = THREE.MathUtils.lerp(shipGroup.rotation.z, -moveX * 2, 0.1)
    shipGroup.rotation.x = THREE.MathUtils.lerp(shipGroup.rotation.x, moveY * 0.5, 0.1)

    // Shooting
    if (keysPressed.has(' ') || touchFire) shoot()

    // Update shoot cooldown
    if (shootCooldown.value > 0) {
      shootCooldown.value = Math.max(0, shootCooldown.value - dt * 1000)
    }

    // Time tracking
    gameTime += dt * 1000
    timeSurvived.value = gameTime

    // Difficulty ramp every 15 seconds
    const newDiff = Math.floor(gameTime / 15000)
    if (newDiff > difficultyLevel) {
      difficultyLevel = newDiff
      // Spawn a power-up on difficulty increase
      spawnPowerUp()
    }

    // Spawn power-ups periodically after early game
    if (gameTime > 10000 && gameTime - lastPowerUpTime > 20000) {
      lastPowerUpTime = gameTime
      if (Math.random() < 0.5) spawnPowerUp()
    }

    const moveZ = speed * 2

    // Move asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i]
      a.position.z += moveZ
      a.rotation.x += a.userData.rotSpeed.x
      a.rotation.y += a.userData.rotSpeed.y
      a.rotation.z += a.userData.rotSpeed.z
      a.userData.wobble += dt * a.userData.wobbleSpeed
      a.position.x = a.userData.x + Math.sin(a.userData.wobble) * a.userData.wobbleAmp

      if (a.position.z > 15) {
        scene.remove(a)
        asteroids.splice(i, 1)
      }
    }

    // Move stars
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i]
      s.position.z += moveZ
      s.rotation.y += 0.03
      if (s.position.z > 15) {
        scene.remove(s)
        stars.splice(i, 1)
      }
    }

    // Move power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const p = powerUps[i]
      p.position.z += moveZ
      p.rotation.y += 0.04
      p.rotation.x += 0.02
      if (p.position.z > 15) {
        scene.remove(p)
        powerUps.splice(i, 1)
      }
    }

    // Move projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]
      p.position.z -= PROJECTILE_SPEED
      p.userData.life -= dt * 2
      if (p.position.z < -80 || p.userData.life <= 0) {
        scene.remove(p)
        projectiles.splice(i, 1)
      }
    }

    // Respawn asteroids to maintain difficulty count
    while (asteroids.length < getDifficultyAsteroidCount()) spawnAsteroid()
    // Keep some stars flowing
    while (stars.length < 6) spawnStar()

    checkCollisions()

    // Base survival score
    score.value += Math.round(speed * 10)

    if (activePowerUps.shield) {
      shieldMesh.material.opacity = 0.1 + Math.sin(Date.now() * 0.005) * 0.05
    }

    if (keysPressed.has('Escape')) {
      keysPressed.delete('Escape')
      gameState.value = 'paused'
    }
  }

  updateEngineParticles(dt)
  updateExplosions(dt)

  if (starfield) {
    starfield.rotation.y += 0.0001
    starfield.rotation.x += 0.00005
  }

  if (shipGroup && gameState.value === 'playing') {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, shipGroup.position.x * 0.3, 0.05)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 3 + shipGroup.position.y * 0.2, 0.05)
  }

  renderer.render(scene, camera)
}

function onResize() {
  if (!containerRef.value || !camera || !renderer) return
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

function onKeyDown(e) {
  keysPressed.add(e.key)
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault()
  }
}

function onKeyUp(e) {
  keysPressed.delete(e.key)
}

onMounted(() => {
  nextTick(() => init())
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
  }
})
</script>
