<template>
  <div class="w-full h-screen bg-[#0d0a06] overflow-hidden relative select-none cursor-grab active:cursor-grabbing" ref="containerRef">
    <div id="three-container" class="absolute inset-0"></div>

    <div class="absolute inset-0 pointer-events-none z-10 corridor-vignette"></div>

    <!-- HUD -->
    <div v-if="showHUD" class="absolute inset-0 pointer-events-none z-20">
      <!-- Top left — room name -->
      <div class="absolute top-5 left-5">
        <div class="inline-block px-5 py-1.5 bg-[#1a150d]/80 border border-[#b8860b]/20 backdrop-blur-sm">
          <span class="text-[#d4a04a]/70 text-[10px] font-mono tracking-[0.35em] uppercase">{{ currentRoomName || 'West Corridor' }}</span>
        </div>
      </div>

      <!-- Top right — discovery counter -->
      <div class="absolute top-5 right-5">
        <div class="inline-block px-5 py-1.5 bg-[#1a150d]/80 border border-[#b8860b]/20 backdrop-blur-sm">
          <span class="text-[#d4a04a]/50 text-[10px] font-mono tracking-[0.2em]">{{ discoveredCount }}<span class="text-[#d4a04a]/25">/{{ totalRooms }}</span></span>
          <span class="text-[#d4a04a]/30 text-[10px] font-mono ml-2 tracking-[0.15em]">rooms</span>
        </div>
      </div>

      <!-- Bottom — controls hint -->
      <div class="absolute bottom-5 left-0 right-0 text-center">
        <div class="text-[#d4a04a]/25 text-[10px] font-mono tracking-[0.2em]">
          {{ inRoom ? 'ESC — return to corridor' : 'WASD — move · mouse — look · click doors to enter · TAB — journal' }}
        </div>
      </div>

      <!-- Crosshair -->
      <div v-if="!inRoom" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div class="w-1.5 h-1.5 rounded-full border border-[#d4a04a]/30"></div>
      </div>

      <!-- Door hint -->
      <div v-if="nearDoor" class="absolute top-1/2 left-1/2 -translate-x-1/2 mt-14 text-center pointer-events-none">
        <div class="px-5 py-2 bg-[#1a150d]/85 border backdrop-blur-sm" :class="nearDoorRarity === 'rare' ? 'border-[#d4a04a]/50' : nearDoorRarity === 'uncommon' ? 'border-[#aab0bb]/30' : 'border-[#b8860b]/20'">
          <span class="text-[11px] font-mono tracking-[0.2em]" :class="nearDoorRarity === 'rare' ? 'text-[#d4a04a]' : nearDoorRarity === 'uncommon' ? 'text-[#aab0bb]' : 'text-[#d4a04a]/70'">ENTER</span>
        </div>
      </div>

      <!-- Discovery toast -->
      <transition name="toast">
        <div v-if="showDiscoveryToast" class="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div class="px-6 py-3 bg-[#1a150d]/90 border border-[#b8860b]/30 backdrop-blur-sm text-center">
            <div class="text-[#d4a04a] text-[11px] font-mono tracking-[0.25em] mb-1">ROOM DISCOVERED</div>
            <div class="text-[#f5e6c8]/70 text-sm font-display tracking-wider">{{ discoveryToastName }}</div>
          </div>
        </div>
      </transition>

      <!-- Completion -->
      <div v-if="showCompletion" class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="px-8 py-6 bg-[#1a150d]/95 border border-[#d4a04a]/40 backdrop-blur-sm text-center max-w-md">
          <div class="text-[#d4a04a]/50 text-[10px] font-mono tracking-[0.4em] mb-3">EXPEDITION COMPLETE</div>
          <div class="text-[#f5e6c8]/80 text-lg font-display tracking-wider mb-3">All rooms catalogued</div>
          <div class="text-[#d4a04a]/30 text-[10px] font-mono tracking-[0.15em]">The corridor continues, but your journal is full.</div>
        </div>
      </div>
    </div>

    <!-- Journal overlay -->
    <div v-if="showJournal" class="absolute inset-0 z-30 flex items-center justify-center" @click.self="showJournal = false">
      <div class="absolute inset-0 bg-[#0d0a06]/80 backdrop-blur-sm"></div>
      <div class="relative z-10 w-[90vw] max-w-2xl max-h-[80vh] overflow-y-auto bg-[#1a150d]/95 border border-[#b8860b]/20 p-8 md:p-10">
        <div class="text-center mb-8">
          <div class="text-[#d4a04a]/40 text-[10px] font-mono tracking-[0.4em] mb-2">RESEARCH JOURNAL</div>
          <div class="w-12 h-px bg-[#b8860b]/20 mx-auto"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div v-for="room in allRooms" :key="room.id"
            class="p-4 border transition-colors duration-300"
            :class="discovered[room.id]
              ? 'border-[#b8860b]/20 bg-[#1a150d]/50'
              : 'border-[#2a2218]/50 bg-transparent'">
            <div class="flex items-center gap-3 mb-1.5">
              <div class="w-2 h-2 rounded-full" :class="discovered[room.id] ? roomDotClass(room.rarity) : 'bg-[#2a2218]'"></div>
              <span class="text-xs font-mono tracking-[0.15em]"
                :class="discovered[room.id] ? 'text-[#f5e6c8]/60' : 'text-[#f5e6c8]/15'">
                {{ discovered[room.id] ? room.name : '???' }}
              </span>
              <span class="text-[9px] font-mono tracking-[0.1em] ml-auto"
                :class="room.rarity === 'rare' ? 'text-[#d4a04a]/40' : room.rarity === 'uncommon' ? 'text-[#aab0bb]/30' : 'text-[#d4a04a]/20'">
                {{ room.rarity }}
              </span>
            </div>
            <p class="text-[10px] font-mono leading-relaxed pl-5"
              :class="discovered[room.id] ? 'text-[#d4a04a]/30' : 'text-[#d4a04a]/10'">
              {{ discovered[room.id] ? room.description : 'Not yet discovered.' }}
            </p>
          </div>
        </div>

        <div class="text-center mt-8">
          <div class="text-[#d4a04a]/20 text-[10px] font-mono tracking-[0.2em]">{{ discoveredCount }}/{{ totalRooms }} catalogued</div>
          <button @click="copyLayoutLink" class="mt-2 text-[#d4a04a]/30 text-[10px] font-mono tracking-[0.2em] hover:text-[#d4a04a]/70 transition-colors" title="Copy a link that replays this exact layout">
            LAYOUT #{{ seed }} — COPY LINK
          </button>
        </div>

        <div class="text-center mt-4">
          <button @click="showJournal = false" class="text-[#d4a04a]/40 text-[10px] font-mono tracking-[0.2em] hover:text-[#d4a04a]/70 transition-colors">CLOSE [TAB]</button>
        </div>
      </div>
    </div>

    <!-- Start overlay -->
    <div v-if="!started" class="absolute inset-0 flex flex-col items-center justify-center z-30 bg-[#0d0a06]">
      <div class="text-center px-6 max-w-lg">
        <div class="flex items-center justify-center gap-4 mb-10">
          <div class="h-px w-20 bg-gradient-to-r from-transparent to-[#b8860b]/30"></div>
          <div class="w-1.5 h-1.5 bg-[#b8860b]/40 rotate-45"></div>
          <div class="h-px w-20 bg-gradient-to-l from-transparent to-[#b8860b]/30"></div>
        </div>

        <h1 class="font-display text-4xl md:text-5xl lg:text-6xl text-[#f5e6c8]/80 mb-1 tracking-[0.08em]">
          The Infinite
        </h1>
        <h1 class="font-display text-4xl md:text-5xl lg:text-6xl text-[#d4a04a] mb-8 tracking-[0.08em]">
          Corridor
        </h1>

        <div class="w-16 h-px bg-[#b8860b]/20 mx-auto mb-6"></div>

        <p class="text-[#d4a04a]/35 text-xs font-mono tracking-[0.12em] mb-3 leading-relaxed max-w-xs mx-auto">
          An impossible corridor. Doors that lead to rooms that shouldn't exist.
        </p>
        <p class="text-[#d4a04a]/25 text-[10px] font-mono tracking-[0.1em] mb-12 max-w-xs mx-auto">
          Catalogue them all. Some are rarer than others.
        </p>

        <button @click="startExperience" class="corridor-btn group">
          <span class="relative z-10 font-display text-sm tracking-[0.25em] group-hover:text-[#0d0a06] transition-colors duration-300">Begin</span>
        </button>

        <div class="mt-8 flex items-center justify-center gap-2">
          <span class="text-[#d4a04a]/30 text-[10px] font-mono tracking-[0.2em]">LAYOUT</span>
          <input
            v-model="seedInput"
            inputmode="numeric"
            class="w-24 bg-transparent border border-[#b8860b]/20 px-2 py-1 text-center text-[#d4a04a]/70 text-[11px] font-mono tracking-[0.15em] focus:outline-none focus:border-[#b8860b]/50"
            title="Enter a layout seed to replay a specific corridor"
          />
        </div>

        <div class="flex items-center justify-center gap-3 mt-12">
          <div class="h-px w-8 bg-[#b8860b]/15"></div>
          <div class="w-1 h-1 rounded-full bg-[#b8860b]/20"></div>
          <div class="h-px w-8 bg-[#b8860b]/15"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.corridor-vignette {
  background: radial-gradient(
    ellipse at center,
    transparent 45%,
    rgba(13, 10, 6, 0.5) 100%
  );
}

.corridor-btn {
  position: relative;
  border: 1px solid #b8860b;
  background: transparent;
  padding: 14px 48px;
  color: #d4a04a;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.35s ease;
  letter-spacing: 0.15em;
}
.corridor-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: #d4a04a;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.35s ease;
  z-index: 0;
}
.corridor-btn:hover::before {
  transform: scaleX(1);
}
.corridor-btn:hover {
  color: #0d0a06;
  border-color: #d4a04a;
}

.toast-enter-active { transition: all 0.4s ease; }
.toast-leave-active { transition: all 0.6s ease; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
</style>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import * as THREE from 'three'

defineOptions({ layout: null })

const containerRef = ref(null)
const started = ref(false)
const showHUD = ref(false)
const inRoom = ref(false)
const nearDoor = ref(false)
const nearDoorRarity = ref('common')
const currentRoomName = ref('')
const showJournal = ref(false)
const discovered = ref({})
const showDiscoveryToast = ref(false)
const discoveryToastName = ref('')
const showCompletion = ref(false)
const seed = ref(1)
const seedInput = ref('')

// Seeded RNG (mulberry32) — room layout is deterministic per seed so layouts can be replayed/shared
function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
let rng = mulberry32(1)
function reseed(s) {
  seed.value = s >>> 0
  seedInput.value = String(seed.value)
  rng = mulberry32(seed.value)
}
function randomSeed() {
  return (Math.floor(Math.random() * 90000) + 10000) >>> 0
}

const allRooms = [
  { id: 'study', name: 'The Study', rarity: 'common', description: 'Floating books drift through warm lamplight. A magnifying glass turns slowly in the air.', type: 'study', bg: 0x1a150d, accent: 0xd4a04a },
  { id: 'observatory', name: 'The Observatory', rarity: 'common', description: 'A brass telescope points at a ceiling of living starlight. The stars rearrange as you watch.', type: 'observatory', bg: 0x0d1018, accent: 0x8899bb },
  { id: 'laboratory', name: 'The Laboratory', rarity: 'common', description: 'Glass beakers bubble with coloured liquids. Something is being synthesised. Slowly.', type: 'laboratory', bg: 0x0d150d, accent: 0x5a7247 },
  { id: 'vault', name: 'The Vault', rarity: 'uncommon', description: 'Brass gears turn in concentric rings. The mechanism clicks like a lock being picked.', type: 'vault', bg: 0x18120a, accent: 0xb87333 },
  { id: 'greenhouse', name: 'The Greenhouse', rarity: 'uncommon', description: 'Bioluminescent plants pulse softly. Spores drift upward like inverse rain.', type: 'greenhouse', bg: 0x0a150a, accent: 0x66aa55 },
  { id: 'library', name: 'The Library', rarity: 'uncommon', description: 'Endless shelves recede into darkness. Some books float, already open, as if recently read.', type: 'library', bg: 0x151010, accent: 0xaa8866 },
  { id: 'furnace', name: 'The Furnace', rarity: 'rare', description: 'A single glowing ember suspended in heat haze. The air shimmers. You feel warmth on your face.', type: 'furnace', bg: 0x1a0d05, accent: 0xcc5522 },
  { id: 'mirror_hall', name: 'The Mirror Hall', rarity: 'rare', description: 'Mirrors line every surface. Each reflection moves a half-second behind you. One does not move at all.', type: 'mirror_hall', bg: 0x101015, accent: 0x99aacc },
]

const totalRooms = allRooms.length
const discoveredCount = computed(() => Object.keys(discovered.value).length)

let scene, camera, renderer, clock
let animationId
let corridorSegments = []
let spawnQueue = []
let doors = []
let currentDoorRoom = null
let dustParticles
let flickerTimer = 0
let corridorColorShift = 0

const moveState = { forward: false, backward: false, left: false, right: false }
const euler = new THREE.Euler(0, 0, 0, 'YXZ')
let isPointerLocked = false
let cameraZ = 0

const SEGMENT_LENGTH = 30
const CORRIDOR_WIDTH = 6
const CORRIDOR_HEIGHT = 5
const VIEW_DISTANCE = 3
const MOVE_SPEED = 8
const LOOK_SPEED = 0.002

const AMBER = 0xd4a04a
const BRASS = 0xb8860b
const CREAM = 0xf5e6c8
const COPPER = 0xb87333

function roomDotClass(rarity) {
  if (rarity === 'rare') return 'bg-[#d4a04a]'
  if (rarity === 'uncommon') return 'bg-[#aab0bb]'
  return 'bg-[#b8860b]'
}

// ─── Shared assets ──────────────────────────────────────────────────────────
// Everything a corridor segment needs is built ONCE here and reused.
// Previously each spawned segment generated ~6500 canvas ops, 3 GPU texture
// uploads, ~25 geometries and 7 lights synchronously mid-frame — the visible
// hitch when walking into a new section. Caching also bounds the wall colour
// drift (raw index used to push rgb() out of range far from spawn).
let SHARED = null

function initSharedAssets() {
  if (SHARED) return SHARED
  const wallTexes = []
  const wallMats = []
  for (let v = 0; v < 4; v++) {
    const tex = generateWallTexture(v)
    tex.repeat.set(2, 1)
    wallTexes.push(tex)
    wallMats.push(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0.02 }))
  }
  const floorTex = generateFloorTexture()
  floorTex.repeat.set(4, 6)
  const ceilTex = generateFloorTexture()
  ceilTex.repeat.set(3, 6)
  SHARED = {
    wallTexes,
    wallMats,
    floorMat: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.88, metalness: 0.02 }),
    ceilMat: new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.95, metalness: 0 }),
    beamMat: new THREE.MeshStandardMaterial({ color: 0x2a2015, roughness: 0.85, metalness: 0.05 }),
    sconceMat: new THREE.MeshStandardMaterial({ color: BRASS, metalness: 0.85, roughness: 0.25 }),
    shadeMat: new THREE.MeshStandardMaterial({
      color: AMBER, emissive: AMBER, emissiveIntensity: 0.5,
      transparent: true, opacity: 0.65, roughness: 0.3, metalness: 0.1,
    }),
    woodMat: new THREE.MeshStandardMaterial({ color: 0x1a120a, metalness: 0.1, roughness: 0.8 }),
    wallGeo: new THREE.PlaneGeometry(SEGMENT_LENGTH, CORRIDOR_HEIGHT),
    floorGeo: new THREE.PlaneGeometry(CORRIDOR_WIDTH, SEGMENT_LENGTH),
    beamGeo: new THREE.BoxGeometry(CORRIDOR_WIDTH + 0.2, 0.2, 0.3),
    bracketGeo: new THREE.BoxGeometry(0.3, 0.08, 0.15),
    shadeGeo: new THREE.SphereGeometry(0.12, 8, 8),
    frameSideGeo: new THREE.BoxGeometry(0.18, 3.2, 0.25),
    frameTopGeo: new THREE.BoxGeometry(1.98, 0.18, 0.25),
    trimGeo: new THREE.BoxGeometry(2.1, 0.04, 0.04),
    panelGeo: new THREE.PlaneGeometry(1.7, 3.1),
    borderGeo: new THREE.BoxGeometry(1.7, 0.03, 0.03),
    handleGeo: new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8),
    // Door materials vary by room — cached per room id (8 max, shared across doors)
    doorMats: {},
  }
  SHARED.sharedGeos = new Set(
    Object.values(SHARED).filter(v => v && v.isBufferGeometry)
  )
  SHARED.sharedMats = new Set(
    Object.values(SHARED).filter(v => v && v.isMaterial)
  )
  SHARED.sharedTexes = new Set(
    [...SHARED.wallTexes, SHARED.floorMat.map, SHARED.ceilMat.map]
  )
  return SHARED
}

function wallVariant(index) {
  return ((index % 4) + 4) % 4
}

// Per-room door materials (rarity colour + room accent), cached and shared
function getDoorMats(roomDef) {
  const cached = SHARED.doorMats[roomDef.id]
  if (cached) return cached
  const rarityColor = roomDef.rarity === 'rare' ? 0xd4a04a : roomDef.rarity === 'uncommon' ? 0xaab0bb : BRASS
  const mats = {
    brass: new THREE.MeshStandardMaterial({ color: rarityColor, metalness: 0.85, roughness: 0.2 }),
    door: new THREE.MeshBasicMaterial({ color: roomDef.accent, transparent: true, opacity: 0.18 }),
    border: new THREE.MeshStandardMaterial({ color: rarityColor, metalness: 0.85, roughness: 0.25, transparent: true, opacity: 0.5 }),
    handle: new THREE.MeshStandardMaterial({ color: rarityColor, metalness: 0.9, roughness: 0.15 }),
  }
  SHARED.doorMats[roomDef.id] = mats
  return mats
}

// Dispose a removed segment — skipping shared assets (geometries, materials,
// textures flagged via the SHARED sets below; per-room door mats included)
function isSharedAsset(obj) {
  if (!SHARED || !obj) return false
  if (SHARED.sharedGeos.has(obj) || SHARED.sharedMats.has(obj) || SHARED.sharedTexes.has(obj)) return true
  return Object.values(SHARED.doorMats).some(mats => Object.values(mats).includes(obj))
}

function disposeSegment(seg) {
  seg.group.traverse((obj) => {
    if (obj.geometry && !isSharedAsset(obj.geometry)) obj.geometry.dispose()
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((m) => {
        if (isSharedAsset(m)) return
        if (m.map && !isSharedAsset(m.map)) m.map.dispose()
        m.dispose()
      })
    }
  })
  scene.remove(seg.group)
}

function pickRoomForSegment(index) {
  // Weighted rarity: common 60%, uncommon 30%, rare 10% (seeded — same seed, same layout)
  const roll = rng()
  let pool
  if (roll < 0.10) pool = allRooms.filter(r => r.rarity === 'rare')
  else if (roll < 0.40) pool = allRooms.filter(r => r.rarity === 'uncommon')
  else pool = allRooms.filter(r => r.rarity === 'common')

  // Prefer undiscovered rooms
  const undiscovered = pool.filter(r => !discovered.value[r.id])
  if (undiscovered.length > 0 && rng() < 0.7) {
    return undiscovered[Math.floor(rng() * undiscovered.length)]
  }
  return pool[Math.floor(rng() * pool.length)]
}

function generateWallTexture(variant) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  // Aged plaster — varies by corridor segment
  const baseR = 68 + variant * 3
  const baseG = 58 + variant * 2
  const baseB = 48 + variant * 2
  ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`
  ctx.fillRect(0, 0, 512, 512)

  // Plaster noise
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const r = baseR - 8 + Math.random() * 16
    const g = baseG - 8 + Math.random() * 16
    const b = baseB - 8 + Math.random() * 16
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }

  // Cracks
  ctx.strokeStyle = 'rgba(30,25,18,0.4)'
  ctx.lineWidth = 1
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    let x = Math.random() * 512, y = Math.random() * 512
    ctx.moveTo(x, y)
    for (let j = 0; j < 5; j++) {
      x += (Math.random() - 0.5) * 80
      y += (Math.random() - 0.5) * 80
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // Stone blocks
  ctx.strokeStyle = 'rgba(25,20,15,0.45)'
  for (let y = 0; y < 512; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke()
    const offset = (Math.floor(y / 64) % 2) * 128
    for (let x = offset; x < 512; x += 256) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 64); ctx.stroke()
    }
  }

  // Scientific diagrams
  ctx.strokeStyle = `rgba(212,160,74,${0.06 + variant * 0.015})`
  ctx.lineWidth = 0.8
  for (let i = 0; i < 2 + (variant % 2); i++) {
    const cx = 80 + Math.random() * 350, cy = 80 + Math.random() * 350
    const radius = 15 + Math.random() * 25
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - radius * 1.3, cy); ctx.lineTo(cx + radius * 1.3, cy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx, cy - radius * 1.3); ctx.lineTo(cx, cy + radius * 1.3); ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

function generateFloorTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#2a2015'
  ctx.fillRect(0, 0, 512, 512)

  const plankWidth = 64
  for (let x = 0; x < 512; x += plankWidth) {
    const base = 30 + Math.random() * 15
    ctx.fillStyle = `rgb(${base + 8},${base + 2},${base - 4})`
    ctx.fillRect(x + 1, 0, plankWidth - 2, 512)
    for (let j = 0; j < 30; j++) {
      const gy = Math.random() * 512, gw = 10 + Math.random() * 30
      ctx.strokeStyle = `rgba(${base - 5},${base - 10},${base - 15},0.3)`
      ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(x + 2, gy); ctx.lineTo(x + 2 + gw, gy + (Math.random() - 0.5) * 4); ctx.stroke()
    }
  }

  ctx.strokeStyle = 'rgba(10,8,5,0.8)'
  ctx.lineWidth = 2
  for (let x = 0; x <= 512; x += plankWidth) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

function createCorridorSegment(zPosition, index) {
  const group = new THREE.Group()
  group.position.z = zPosition
  const S = SHARED
  const v = wallVariant(index)

  const leftWall = new THREE.Mesh(S.wallGeo, S.wallMats[v])
  leftWall.rotation.y = Math.PI / 2
  leftWall.position.set(-CORRIDOR_WIDTH / 2, CORRIDOR_HEIGHT / 2, 0)
  group.add(leftWall)

  const rightWall = new THREE.Mesh(S.wallGeo, S.wallMats[v])
  rightWall.rotation.y = -Math.PI / 2
  rightWall.position.set(CORRIDOR_WIDTH / 2, CORRIDOR_HEIGHT / 2, 0)
  group.add(rightWall)

  const floor = new THREE.Mesh(S.floorGeo, S.floorMat)
  floor.rotation.x = -Math.PI / 2
  group.add(floor)

  const ceiling = new THREE.Mesh(S.floorGeo, S.ceilMat)
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.y = CORRIDOR_HEIGHT
  group.add(ceiling)

  // Ceiling beams
  for (const bz of [-SEGMENT_LENGTH / 3, 0, SEGMENT_LENGTH / 3]) {
    const beam = new THREE.Mesh(S.beamGeo, S.beamMat)
    beam.position.set(0, CORRIDOR_HEIGHT - 0.1, bz)
    group.add(beam)
  }

  // Sconces — both sides
  const lightPositions = [-SEGMENT_LENGTH / 3, 0, SEGMENT_LENGTH / 3]
  const sconceLights = []

  for (const lz of lightPositions) {
    for (const side of [-1, 1]) {
      const sconceLight = new THREE.PointLight(AMBER, 2.0, 18)
      sconceLight.position.set(side * (CORRIDOR_WIDTH / 2 - 0.2), CORRIDOR_HEIGHT * 0.7, lz)
      group.add(sconceLight)
      sconceLights.push(sconceLight)

      const bracket = new THREE.Mesh(S.bracketGeo, S.sconceMat)
      bracket.position.set(side * (CORRIDOR_WIDTH / 2 - 0.15), CORRIDOR_HEIGHT * 0.7, lz)
      group.add(bracket)

      const shade = new THREE.Mesh(S.shadeGeo, S.shadeMat)
      shade.position.set(side * (CORRIDOR_WIDTH / 2 - 0.25), CORRIDOR_HEIGHT * 0.72, lz)
      group.add(shade)
    }
  }

  // Door placement — every segment gets one, weighted by rarity (seeded).
  // Note: index 0 is the spawn segment (kept clear); both walking
  // directions (positive AND negative indices) get doors.
  if (index !== 0) {
    const side = rng() > 0.5 ? -1 : 1
    const doorZ = (rng() - 0.5) * SEGMENT_LENGTH * 0.5
    const roomDef = pickRoomForSegment(index)
    const door = createDoor(side, doorZ, roomDef)
    group.add(door.group)
    doors.push({ group: door.group, roomDef, worldZ: zPosition + doorZ, side, sconceLights })
  }

  scene.add(group)
  corridorSegments.push({ group, zPosition, index, sconceLights })
}

function createDoor(side, z, roomDef) {
  const doorGroup = new THREE.Group()
  const frameHeight = 3.2
  const S = SHARED
  const mats = getDoorMats(roomDef)

  const lFrame = new THREE.Mesh(S.frameSideGeo, S.woodMat)
  lFrame.position.set(-0.9, frameHeight / 2, 0)
  doorGroup.add(lFrame)

  const rFrame = new THREE.Mesh(S.frameSideGeo, S.woodMat)
  rFrame.position.set(0.9, frameHeight / 2, 0)
  doorGroup.add(rFrame)

  const tFrame = new THREE.Mesh(S.frameTopGeo, S.woodMat)
  tFrame.position.set(0, frameHeight, 0)
  doorGroup.add(tFrame)

  const brassTrim = new THREE.Mesh(S.trimGeo, mats.brass)
  brassTrim.position.set(0, frameHeight + 0.02, 0.14)
  doorGroup.add(brassTrim)

  // Door panel
  const doorPanel = new THREE.Mesh(S.panelGeo, mats.door)
  doorPanel.position.set(0, frameHeight / 2, 0.06)
  doorGroup.add(doorPanel)

  // Panel border
  const topBorder = new THREE.Mesh(S.borderGeo, mats.border)
  topBorder.position.set(0, frameHeight - 0.05, 0.12)
  doorGroup.add(topBorder)
  const botBorder = new THREE.Mesh(S.borderGeo, mats.border)
  botBorder.position.set(0, 0.05, 0.12)
  doorGroup.add(botBorder)

  // Door light — rare doors glow brighter
  const doorLight = new THREE.PointLight(roomDef.accent, roomDef.rarity === 'rare' ? 3.0 : roomDef.rarity === 'uncommon' ? 2.2 : 1.5, roomDef.rarity === 'rare' ? 14 : 10)
  doorLight.position.set(0, frameHeight / 2, 0.6)
  doorGroup.add(doorLight)

  // Handle
  const handle = new THREE.Mesh(S.handleGeo, mats.handle)
  handle.position.set(side * 0.5, frameHeight * 0.45, 0.15)
  handle.rotation.x = Math.PI / 2
  doorGroup.add(handle)

  doorGroup.position.set(side * (CORRIDOR_WIDTH / 2), 0, z)
  doorGroup.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2

  return { group: doorGroup }
}

function createDustParticles() {
  const count = 250
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * CORRIDOR_WIDTH
    positions[i * 3 + 1] = Math.random() * CORRIDOR_HEIGHT
    positions[i * 3 + 2] = (Math.random() - 0.5) * SEGMENT_LENGTH * VIEW_DISTANCE
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    color: AMBER, size: 0.05, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending,
  })

  dustParticles = new THREE.Points(geo, mat)
  scene.add(dustParticles)
}

function createRoom(roomDef) {
  const roomGroup = new THREE.Group()
  const roomSize = 12

  const floorMat = new THREE.MeshStandardMaterial({ color: roomDef.bg, roughness: 0.9, metalness: 0.1 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), floorMat)
  floor.rotation.x = -Math.PI / 2
  roomGroup.add(floor)

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize), floorMat.clone())
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.y = roomSize * 0.6
  roomGroup.add(ceiling)

  const wallMat = new THREE.MeshStandardMaterial({ color: roomDef.bg, roughness: 0.95, metalness: 0 })
  for (const [rx, ry, rz, rotY] of [
    [0, roomSize * 0.3, -roomSize / 2, 0],
    [0, roomSize * 0.3, roomSize / 2, Math.PI],
    [-roomSize / 2, roomSize * 0.3, 0, Math.PI / 2],
    [roomSize / 2, roomSize * 0.3, 0, -Math.PI / 2],
  ]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(roomSize, roomSize * 0.6), wallMat)
    wall.position.set(rx, ry, rz)
    wall.rotation.y = rotY
    roomGroup.add(wall)
  }

  // Warm ambient + pendant
  roomGroup.add(new THREE.PointLight(roomDef.accent, 2.0, 28).translateY(roomSize * 0.5))

  const pendantMat = new THREE.MeshStandardMaterial({ color: BRASS, metalness: 0.9, roughness: 0.2 })
  const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.3, 8), pendantMat)
  pendant.position.set(0, roomSize * 0.55, 0)
  roomGroup.add(pendant)
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: 1.0 })
  )
  bulb.position.set(0, roomSize * 0.5, 0)
  roomGroup.add(bulb)

  switch (roomDef.type) {
    case 'study': createStudyRoom(roomGroup, roomDef); break
    case 'observatory': createObservatoryRoom(roomGroup, roomDef); break
    case 'laboratory': createLaboratoryRoom(roomGroup, roomDef); break
    case 'vault': createVaultRoom(roomGroup, roomDef); break
    case 'greenhouse': createGreenhouseRoom(roomGroup, roomDef); break
    case 'library': createLibraryRoom(roomGroup, roomDef); break
    case 'furnace': createFurnaceRoom(roomGroup, roomDef); break
    case 'mirror_hall': createMirrorHallRoom(roomGroup, roomDef); break
  }

  return roomGroup
}

function createStudyRoom(group) {
  for (let i = 0; i < 10; i++) {
    const bookColor = [0x8b4513, 0x2f4f4f, 0x800020, 0x1a3c5c, 0x4a3728][Math.floor(Math.random() * 5)]
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.4 + Math.random() * 0.3, 0.08 + Math.random() * 0.12, 0.3),
      new THREE.MeshStandardMaterial({ color: bookColor, roughness: 0.7 })
    )
    book.position.set((Math.random() - 0.5) * 8, 1 + Math.random() * 3.5, (Math.random() - 0.5) * 8)
    book.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.5)
    book.userData.rotSpeed = new THREE.Vector3((Math.random() - 0.5) * 0.003, (Math.random() - 0.5) * 0.003, (Math.random() - 0.5) * 0.003)
    book.userData.floatOffset = Math.random() * Math.PI * 2
    group.add(book)
  }
}

function createObservatoryRoom(group, def) {
  const starCount = 400
  const starGeo = new THREE.BufferGeometry()
  const starPos = new Float32Array(starCount * 3)
  const starColors = new Float32Array(starCount * 3)
  const base = new THREE.Color(def.accent)
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 10
    starPos[i * 3 + 1] = 6 + Math.random() * 0.5
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 10
    const c = base.clone().offsetHSL((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.2)
    starColors[i * 3] = c.r; starColors[i * 3 + 1] = c.g; starColors[i * 3 + 2] = c.b
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3))
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.7 }))
  stars.userData.type = 'nebula'
  group.add(stars)

  const scopeMat = new THREE.MeshStandardMaterial({ color: BRASS, metalness: 0.9, roughness: 0.2 })
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2, 8), scopeMat)
  scope.position.set(-2, 2, -2); scope.rotation.z = Math.PI / 4
  group.add(scope)
}

function createLaboratoryRoom(group) {
  const beakerPositions = [[-2, 1], [0, 2], [2, -1], [1, -2], [-1, -1]]
  for (const [bx, bz] of beakerPositions) {
    const liquidColor = [0x44aa66, 0xaa4466, 0x4488aa, 0xaaaa44][Math.floor(Math.random() * 4)]
    const beaker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.12, 0.5, 8, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.25, roughness: 0.1 })
    )
    beaker.position.set(bx, 0.25, bz)
    group.add(beaker)
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.1, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: liquidColor, emissive: liquidColor, emissiveIntensity: 0.3, transparent: true, opacity: 0.6 })
    )
    liquid.position.set(bx, 0.15, bz)
    group.add(liquid)
  }
}

function createVaultRoom(group) {
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.5 + i * 0.8, 0.04, 8, 48),
      new THREE.MeshStandardMaterial({ color: BRASS, metalness: 0.9, roughness: 0.2 })
    )
    ring.position.set(0, 3, -2)
    ring.rotation.x = Math.PI / 2
    ring.userData.rotSpeed = new THREE.Vector3(0, 0, (i % 2 === 0 ? 1 : -1) * 0.003 * (i + 1))
    group.add(ring)
  }
  const gear = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.06, 8, 24),
    new THREE.MeshStandardMaterial({ color: COPPER, metalness: 0.9, roughness: 0.2, emissive: COPPER, emissiveIntensity: 0.15 })
  )
  gear.position.set(0, 3, -2)
  gear.userData.rotSpeed = new THREE.Vector3(0, 0, 0.008)
  group.add(gear)
}

function createGreenhouseRoom(group) {
  for (let i = 0; i < 12; i++) {
    const h = 0.5 + Math.random() * 2
    const pc = [0x44aa44, 0x66cc55, 0x338833, 0x88bb44][Math.floor(Math.random() * 4)]
    const plant = new THREE.Mesh(
      new THREE.ConeGeometry(0.08 + Math.random() * 0.12, h, 5),
      new THREE.MeshStandardMaterial({ color: pc, emissive: pc, emissiveIntensity: 0.25, roughness: 0.6 })
    )
    plant.position.set((Math.random() - 0.5) * 8, h / 2, (Math.random() - 0.5) * 8)
    plant.userData.floatOffset = Math.random() * Math.PI * 2
    group.add(plant)
  }
}

function createLibraryRoom(group) {
  // Tall bookshelves
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x2a1f15, roughness: 0.8 })
  for (let i = 0; i < 4; i++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 5, 0.6), shelfMat)
    shelf.position.set((Math.random() - 0.5) * 6, 2.5, (Math.random() - 0.5) * 6)
    shelf.rotation.y = Math.random() * 0.4
    group.add(shelf)

    // Books on shelf
    for (let j = 0; j < 6; j++) {
      const bc = [0x8b4513, 0x2f4f4f, 0x800020, 0x1a3c5c][Math.floor(Math.random() * 4)]
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.3 + Math.random() * 0.15, 0.4),
        new THREE.MeshStandardMaterial({ color: bc, roughness: 0.7 })
      )
      book.position.set(
        shelf.position.x + (Math.random() - 0.5) * 1.2,
        shelf.position.y + (Math.random() - 0.5) * 3,
        shelf.position.z + (Math.random() - 0.5) * 0.8
      )
      book.userData.floatOffset = Math.random() * Math.PI * 2
      group.add(book)
    }
  }
}

function createFurnaceRoom(group) {
  // Central ember
  const ember = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 2.0 })
  )
  ember.position.set(0, 2, -2)
  group.add(ember)

  // Heat haze — concentric rings
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.8 + i * 0.4, 0.01, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.08 + i * 0.02 })
    )
    ring.position.set(0, 2, -2)
    ring.rotation.x = Math.PI / 2
    ring.userData.rotSpeed = new THREE.Vector3(0, 0, (i % 2 === 0 ? 1 : -1) * 0.005)
    group.add(ring)
  }

  // Ember light
  group.add(new THREE.PointLight(0xff4400, 3, 20).translateY(2).translateZ(-2))
}

function createMirrorHallRoom(group) {
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: 0xccccdd, metalness: 0.95, roughness: 0.05,
    transparent: true, opacity: 0.4,
  })

  // Floor mirrors
  for (let i = 0; i < 6; i++) {
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 4), mirrorMat)
    mirror.position.set(
      (Math.random() - 0.5) * 8,
      2,
      (Math.random() - 0.5) * 8
    )
    mirror.rotation.y = Math.random() * Math.PI
    group.add(mirror)
  }

  // Ceiling mirrors
  for (let i = 0; i < 4; i++) {
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mirrorMat.clone())
    mirror.position.set(
      (Math.random() - 0.5) * 6,
      7,
      (Math.random() - 0.5) * 6
    )
    mirror.rotation.x = Math.PI / 2
    group.add(mirror)
  }

  group.add(new THREE.PointLight(0x99aacc, 1.5, 20).translateY(6))
}

function enterRoom(door) {
  inRoom.value = true
  currentRoomName.value = door.roomDef.name
  currentDoorRoom = createRoom(door.roomDef)
  currentDoorRoom.position.set(door.side * 15, 0, door.worldZ)
  scene.add(currentDoorRoom)

  camera.position.set(door.side * 15 + (door.side > 0 ? -3 : 3), 1.7, door.worldZ)
  euler.set(0, door.side > 0 ? 0 : Math.PI, 0)
  camera.quaternion.setFromEuler(euler)

  // Record discovery
  if (!discovered.value[door.roomDef.id]) {
    discovered.value[door.roomDef.id] = true
    saveProgress()
    discoveryToastName.value = door.roomDef.name
    showDiscoveryToast.value = true
    setTimeout(() => { showDiscoveryToast.value = false }, 3000)

    if (discoveredCount.value >= totalRooms) {
      setTimeout(() => { showCompletion.value = true }, 2000)
    }
  }
}

function exitRoom() {
  inRoom.value = false
  currentRoomName.value = ''
  if (currentDoorRoom) {
    scene.remove(currentDoorRoom)
    currentDoorRoom = null
  }
  camera.position.set(0, 1.7, cameraZ)
  euler.set(0, 0, 0)
  camera.quaternion.setFromEuler(euler)
}

function saveProgress() {
  try {
    localStorage.setItem('site_corridor-journal', JSON.stringify(discovered.value))
  } catch (e) { /* ignore */ }
}

function loadProgress() {
  try {
    const saved = localStorage.getItem('site_corridor-journal')
    if (saved) discovered.value = JSON.parse(saved)
  } catch (e) { /* ignore */ }
}

function init() {
  const container = containerRef.value
  const w = container.clientWidth
  const h = container.clientHeight

  // Seed from URL hash (#seed=12345) so layouts can be replayed/shared
  const m = window.location.hash.match(/seed=(\d+)/)
  reseed(m ? parseInt(m[1], 10) >>> 0 : randomSeed())

  // Build the shared asset cache once — segment spawns during play reuse it
  initSharedAssets()

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d0a06)
  scene.fog = new THREE.FogExp2(0x0d0a06, 0.004)

  camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 120)
  camera.position.set(0, 1.7, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.6
  document.getElementById('three-container').appendChild(renderer.domElement)

  clock = new THREE.Clock()
  scene.add(new THREE.AmbientLight(0x3d2b1a, 0.6))

  for (let i = -1; i <= VIEW_DISTANCE; i++) {
    createCorridorSegment(i * SEGMENT_LENGTH, i)
  }

  createDustParticles()
  loadProgress()

  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('mousemove', onMouseMove)
  renderer.domElement.addEventListener('click', onClick)
  document.addEventListener('pointerlockchange', onPointerLockChange)

  animate()
}

function spawnSegmentIfNeeded() {
  const currentSegIndex = Math.floor(cameraZ / SEGMENT_LENGTH)
  const existingIndices = new Set(corridorSegments.map(s => s.index))
  const queuedIndices = new Set(spawnQueue.map(s => s.index))

  for (let i = currentSegIndex - 1; i <= currentSegIndex + VIEW_DISTANCE + 1; i++) {
    if (!existingIndices.has(i) && !queuedIndices.has(i)) {
      spawnQueue.push({ zPosition: i * SEGMENT_LENGTH, index: i })
      queuedIndices.add(i)
    }
  }

  // Build at most one segment per frame — segment construction used to happen
  // all at once on boundary cross, freezing the frame (the "glitch").
  if (spawnQueue.length > 0) {
    const next = spawnQueue.shift()
    createCorridorSegment(next.zPosition, next.index)
  }

  for (let i = corridorSegments.length - 1; i >= 0; i--) {
    const seg = corridorSegments[i]
    if (seg.index < currentSegIndex - 2) {
      disposeSegment(seg)
      corridorSegments.splice(i, 1)
      for (let j = doors.length - 1; j >= 0; j--) {
        if (Math.abs(doors[j].worldZ - seg.zPosition) < SEGMENT_LENGTH) doors.splice(j, 1)
      }
    }
  }
}

function checkDoorProximity() {
  nearDoor.value = false
  nearDoorRarity.value = 'common'
  if (inRoom.value) return

  const camPos = camera.position
  for (const door of doors) {
    const doorWorldPos = new THREE.Vector3(door.side * (CORRIDOR_WIDTH / 2), 1.7, door.worldZ)
    const dist = camPos.distanceTo(doorWorldPos)
    if (dist < 4) {
      nearDoor.value = true
      nearDoorRarity.value = door.roomDef.rarity
      break
    }
  }
}

function animate() {
  animationId = requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05)

  if (started.value && !inRoom.value && !showJournal.value) {
    const direction = new THREE.Vector3()
    if (moveState.forward) direction.z -= 1
    if (moveState.backward) direction.z += 1
    if (moveState.left) direction.x -= 1
    if (moveState.right) direction.x += 1
    direction.normalize()

    const quat = new THREE.Quaternion()
    quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), euler.y)
    direction.applyQuaternion(quat)

    camera.position.add(direction.multiplyScalar(MOVE_SPEED * dt))
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -CORRIDOR_WIDTH / 2 + 0.5, CORRIDOR_WIDTH / 2 - 0.5)
    camera.position.y = 1.7

    cameraZ = camera.position.z
    camera.quaternion.setFromEuler(euler)

    spawnSegmentIfNeeded()
    checkDoorProximity()
  }

  // Dust
  if (dustParticles) {
    const positions = dustParticles.geometry.attributes.position.array
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(Date.now() * 0.0003 + i) * 0.001
      if (positions[i + 1] > CORRIDOR_HEIGHT) positions[i + 1] = 0
      if (positions[i + 1] < 0) positions[i + 1] = CORRIDOR_HEIGHT
    }
    dustParticles.geometry.attributes.position.needsUpdate = true
    dustParticles.position.z = cameraZ
  }

  // Corridor light flicker
  flickerTimer += dt
  if (flickerTimer > 8) {
    flickerTimer = 0
    // Pick a random segment and flicker one sconce
    const seg = corridorSegments[Math.floor(Math.random() * corridorSegments.length)]
    if (seg && seg.sconceLights && seg.sconceLights.length > 0) {
      const light = seg.sconceLights[Math.floor(Math.random() * seg.sconceLights.length)]
      const origIntensity = light.intensity
      light.intensity = origIntensity * 0.3
      setTimeout(() => { light.intensity = origIntensity }, 150 + Math.random() * 200)
    }
  }

  // Door glow pulsing
  for (const door of doors) {
    const children = door.group.children
    for (const child of children) {
      if (child.material && child.material.opacity !== undefined && child.material.color) {
        const base = child.material.opacity < 0.3 ? 0.18 : 0.5
        child.material.opacity = base + Math.sin(Date.now() * 0.002 + door.worldZ) * base * 0.3
      }
    }
  }

  // Room objects
  if (currentDoorRoom) {
    currentDoorRoom.children.forEach(child => {
      if (child.userData.rotSpeed) {
        child.rotation.x += child.userData.rotSpeed.x
        child.rotation.y += child.userData.rotSpeed.y
        child.rotation.z += child.userData.rotSpeed.z
      }
      if (child.userData.floatOffset !== undefined) {
        child.position.y += Math.sin(Date.now() * 0.001 + child.userData.floatOffset) * 0.002
      }
      if (child.userData.type === 'nebula') {
        child.rotation.y += 0.001
      }
    })
  }

  renderer.render(scene, camera)
}

function onResize() {
  if (!containerRef.value || !camera || !renderer) return
  const w = containerRef.value.clientWidth, h = containerRef.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

function onKeyDown(e) {
  if (e.key === 'Tab') {
    e.preventDefault()
    showJournal.value = !showJournal.value
    return
  }
  if (e.key === 'Escape') {
    if (showJournal.value) { showJournal.value = false; return }
    if (inRoom.value) { exitRoom(); return }
  }
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') moveState.forward = true
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') moveState.backward = true
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') moveState.left = true
  if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') moveState.right = true
}

function onKeyUp(e) {
  if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') moveState.forward = false
  if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') moveState.backward = false
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') moveState.left = false
  if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') moveState.right = false
}

function onMouseMove(e) {
  if (!isPointerLocked || showJournal.value) return
  euler.y -= e.movementX * LOOK_SPEED
  euler.x -= e.movementY * LOOK_SPEED
  euler.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, euler.x))
}

function onClick() {
  if (inRoom.value || showJournal.value) return
  if (!isPointerLocked) {
    renderer.domElement.requestPointerLock()
    return
  }

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)

  for (const door of doors) {
    const intersects = raycaster.intersectObject(door.group, true)
    if (intersects.length > 0 && intersects[0].distance < 5) {
      enterRoom(door)
      document.exitPointerLock()
      break
    }
  }
}

function onPointerLockChange() {
  isPointerLocked = document.pointerLockElement === renderer?.domElement
}

function startExperience() {
  // Allow replaying a typed-in seed: reseed + rebuild segments before starting
  const typed = parseInt(seedInput.value, 10)
  if (!isNaN(typed) && (typed >>> 0) !== seed.value) {
    reseed(typed >>> 0)
    for (const seg of corridorSegments) disposeSegment(seg)
    corridorSegments = []
    spawnQueue = []
    doors = []
    for (let i = -1; i <= VIEW_DISTANCE; i++) {
      createCorridorSegment(i * SEGMENT_LENGTH, i)
    }
  }
  window.location.hash = `seed=${seed.value}`
  started.value = true
  showHUD.value = true
  nextTick(() => { renderer.domElement.requestPointerLock() })
}

function copyLayoutLink() {
  const url = window.location.origin + window.location.pathname + `#seed=${seed.value}`
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).catch(() => { prompt('Copy this layout link:', url) })
  } else {
    prompt('Copy this layout link:', url)
  }
}

onMounted(() => { nextTick(() => init()) })

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('pointerlockchange', onPointerLockChange)
  if (scene) {
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => {
          Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose() })
          m.dispose()
        })
      }
    })
  }
  if (renderer) { renderer.dispose(); renderer.domElement.remove() }
})
</script>
