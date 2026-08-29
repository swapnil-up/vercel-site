<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { PRESETS, generateRandomForces, COLOR_PALETTES } from './ParticleLife/presets.js'

// State
const canvasRef = ref(null)
const panelOpen = ref(true)
const engineType = ref('loading')
const fps = ref(0)
const particleCount = ref(10000)
const typeCount = ref(6)
const friction = ref(0.02)
const interactionRadius = ref(80)
const currentPreset = ref('cells')
const colorPalette = ref('spectrum')
const showTrails = ref(false)
const audioEnabled = ref(false)
const paused = ref(false)

// Force matrix (editable)
const forces = reactive([
  [ 4, -2,  3, -1,  0,  0],
  [-2,  4, -1,  3,  0,  0],
  [ 3, -1,  4, -2,  0,  0],
  [-1,  3, -2,  4,  0,  0],
  [ 0,  0,  0,  0,  2, -1],
  [ 0,  0,  0,  0, -1,  2],
])

let engine = null
let animId = null
let cameraAngle = 0
let cameraRadius = 400

// Color palettes for the force matrix UI
const paletteColors = computed(() => {
  const palette = COLOR_PALETTES[colorPalette.value] || COLOR_PALETTES.spectrum
  return typeCount.value > 0 ? palette.slice(0, typeCount.value) : palette
})

function getTypeColor(i) {
  const c = paletteColors.value[i % paletteColors.value.length]
  return `rgb(${Math.round(c[0]*255)}, ${Math.round(c[1]*255)}, ${Math.round(c[2]*255)})`
}

// Simple 4x4 perspective camera MVP matrix
function makeMVP(eyeX, eyeY, eyeZ, aspect) {
  const fov = 60 * Math.PI / 180
  const near = 0.1, far = 2000
  const f = 1 / Math.tan(fov / 2)

  // Perspective projection
  const proj = new Float32Array(16)
  proj[0] = f / aspect; proj[5] = f; proj[10] = (far + near) / (near - far)
  proj[11] = -1; proj[14] = (2 * far * near) / (near - far)

  // Look-at view
  const eye = [eyeX, eyeY, eyeZ]
  const center = [0, 0, 0]
  const up = [0, 1, 0]
  const z = [eye[0]-center[0], eye[1]-center[1], eye[2]-center[2]]
  const zLen = Math.sqrt(z[0]**2 + z[1]**2 + z[2]**2)
  z[0]/=zLen; z[1]/=zLen; z[2]/=zLen
  const x = [up[1]*z[2]-up[2]*z[1], up[2]*z[0]-up[0]*z[2], up[0]*z[1]-up[1]*z[0]]
  const xLen = Math.sqrt(x[0]**2 + x[1]**2 + x[2]**2)
  x[0]/=xLen; x[1]/=xLen; x[2]/=xLen
  const y = [z[1]*x[2]-z[2]*x[1], z[2]*x[0]-z[0]*x[2], z[0]*x[1]-z[1]*x[0]]

  const view = new Float32Array(16)
  view[0]=x[0]; view[1]=y[0]; view[2]=z[0]
  view[4]=x[1]; view[5]=y[1]; view[6]=z[1]
  view[8]=x[2]; view[9]=y[2]; view[10]=z[2]
  view[12]=-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2])
  view[13]=-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2])
  view[14]=-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2])
  view[15]=1

  // MVP = proj * view
  const mvp = new Float32Array(16)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      let sum = 0
      for (let k = 0; k < 4; k++) {
        sum += proj[row + k * 4] * view[k + col * 4]
      }
      mvp[row + col * 4] = sum
    }
  }
  return mvp
}

async function initEngine() {
  if (engine) {
    engine.destroy()
    if (animId) cancelAnimationFrame(animId)
  }

  const canvas = canvasRef.value
  if (!canvas) return

  canvas.width = canvas.clientWidth * Math.min(window.devicePixelRatio, 2)
  canvas.height = canvas.clientHeight * Math.min(window.devicePixelRatio, 2)

  const opts = {
    particleCount: particleCount.value,
    typeCount: typeCount.value,
    friction: friction.value,
    interactionRadius: interactionRadius.value,
    forces: JSON.parse(JSON.stringify(forces)),
    simWidth: 600,
    simHeight: 600,
    onFrame: () => {
      if (engine) fps.value = engine.fps
    },
  }

  // Try WebGPU first
  if (navigator.gpu) {
    try {
      const { ParticleLifeEngine } = await import('./ParticleLife/engine.js')
      engine = new ParticleLifeEngine(canvas, opts)
      await engine.init()
      engine.setForces(opts.forces)
      engineType.value = 'webgpu'
      return
    } catch (e) {
      console.warn('WebGPU init failed, falling back to Three.js:', e)
    }
  }

  // Fallback to Three.js
  try {
    const { ParticleLifeFallback } = await import('./ParticleLife/fallback.js')
    engine = new ParticleLifeFallback(canvas, { ...opts, particleCount: Math.min(opts.particleCount, 15000) })
    await engine.init()
    engine.setForces(opts.forces)
    engineType.value = 'fallback'
  } catch (e) {
    console.error('All engines failed:', e)
    engineType.value = 'error'
  }
}

function applyPreset(presetKey) {
  currentPreset.value = presetKey
  const preset = PRESETS[presetKey]
  if (!preset) return

  typeCount.value = preset.types
  friction.value = preset.friction
  interactionRadius.value = preset.interactionRadius

  const newForces = preset.forces
    ? JSON.parse(JSON.stringify(preset.forces))
    : generateRandomForces(preset.types, preset.forceStrength)

  // Resize forces matrix
  while (forces.length < preset.types) forces.push(new Array(preset.types).fill(0))
  forces.length = preset.types
  for (let i = 0; i < preset.types; i++) {
    while (forces[i].length < preset.types) forces[i].push(0)
    forces[i].length = preset.types
    for (let j = 0; j < preset.types; j++) {
      forces[i][j] = newForces[i][j]
    }
  }

  if (engine) {
    engine.typeCount = typeCount.value
    engine.friction = friction.value
    engine.interactionRadius = interactionRadius.value
    engine.setForces(JSON.parse(JSON.stringify(forces)))
    engine.reset()
  }
}

function randomize() {
  applyPreset('random')
}

function resetSim() {
  if (engine) engine.reset()
}

function togglePause() {
  paused.value = !paused.value
  if (engine) engine.paused = paused.value
}

function updateForce(i, j, val) {
  forces[i][j] = val
  if (engine) {
    engine.setForces(JSON.parse(JSON.stringify(forces)))
  }
}

// Camera orbit
let mouseDown = false
let lastMouse = { x: 0, y: 0 }

function onCanvasMouseDown(e) {
  mouseDown = true
  lastMouse = { x: e.clientX, y: e.clientY }
}

function onCanvasMouseMove(e) {
  if (!mouseDown) return
  const dx = e.clientX - lastMouse.x
  const dy = e.clientY - lastMouse.y
  cameraAngle += dx * 0.005
  cameraRadius = Math.max(100, Math.min(1000, cameraRadius - dy * 2))
  lastMouse = { x: e.clientX, y: e.clientY }
}

function onCanvasMouseUp() {
  mouseDown = false
}

function onCanvasWheel(e) {
  cameraRadius = Math.max(100, Math.min(1000, cameraRadius + e.deltaY * 0.5))
}

// URL sharing
function shareURL() {
  const state = {
    p: particleCount.value,
    t: typeCount.value,
    f: friction.value,
    r: interactionRadius.value,
    m: forces,
    pr: currentPreset.value,
  }
  const hash = btoa(JSON.stringify(state))
  const url = window.location.origin + window.location.pathname + '#' + hash
  navigator.clipboard.writeText(url).then(() => {
    alert('URL copied to clipboard!')
  }).catch(() => {
    prompt('Copy this URL:', url)
  })
}

function loadFromURL() {
  const hash = window.location.hash.slice(1)
  if (!hash) return false
  try {
    const state = JSON.parse(atob(hash))
    if (state.p) particleCount.value = state.p
    if (state.t) typeCount.value = state.t
    if (state.f) friction.value = state.f
    if (state.r) interactionRadius.value = state.r
    if (state.m) {
      while (forces.length < state.m.length) forces.push([])
      forces.length = state.m.length
      for (let i = 0; i < state.m.length; i++) {
        while (forces[i].length < state.m[i].length) forces[i].push(0)
        forces[i].length = state.m[i].length
        for (let j = 0; j < state.m[i].length; j++) {
          forces[i][j] = state.m[i][j]
        }
      }
    }
    if (state.pr) currentPreset.value = state.pr
    return true
  } catch {
    return false
  }
}

// Animation loop
function animate() {
  if (engine && !engine.paused) {
    engine.step()
  }

  // Render with orbit camera
  if (engine && engineType.value === 'webgpu') {
    const canvas = canvasRef.value
    const aspect = canvas ? canvas.clientWidth / canvas.clientHeight : 1
    const eyeX = Math.sin(cameraAngle) * cameraRadius
    const eyeZ = Math.cos(cameraAngle) * cameraRadius
    const mvp = makeMVP(eyeX, 100, eyeZ, aspect)
    engine.render(mvp)
  } else if (engine && engineType.value === 'fallback') {
    engine.render()
  }

  if (engine) fps.value = engine.fps

  animId = requestAnimationFrame(animate)
}

// Watch for changes that require rebuild
watch([particleCount, typeCount], () => {
  initEngine().then(() => {
    if (engine) {
      applyPreset(currentPreset.value)
      animate()
    }
  })
})

// Audio reactivity
let audioCtx = null
let analyser = null
let audioData = null

async function toggleAudio() {
  if (audioEnabled.value) {
    audioEnabled.value = false
    if (audioCtx) { audioCtx.close(); audioCtx = null }
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const source = audioCtx.createMediaStreamSource(stream)
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    audioData = new Uint8Array(analyser.frequencyBinCount)
    audioEnabled.value = true
    processAudio()
  } catch (e) {
    console.warn('Audio access denied:', e)
  }
}

function processAudio() {
  if (!audioEnabled.value || !analyser) return
  analyser.getByteFrequencyData(audioData)

  const len = audioData.length
  let low = 0, mid = 0, high = 0
  for (let i = 0; i < len; i++) {
    const val = audioData[i] / 255
    if (i < len * 0.33) low += val
    else if (i < len * 0.66) mid += val
    else high += val
  }
  low /= len * 0.33
  mid /= len * 0.33
  high /= len * 0.34

  // Map audio to friction (beat drops = more chaotic)
  if (engine) {
    engine.friction = friction.value * (1 - low * 0.5)
  }

  requestAnimationFrame(processAudio)
}

// Keyboard shortcuts
function onKeyDown(e) {
  if (e.key === ' ') { e.preventDefault(); togglePause() }
  if (e.key === 'r' || e.key === 'R') resetSim()
  if (e.key === 'h' || e.key === 'H') panelOpen.value = !panelOpen.value
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown)

  const loaded = loadFromURL()
  await initEngine()

  if (engine) {
    if (loaded) {
      engine.typeCount = typeCount.value
      engine.friction = friction.value
      engine.interactionRadius = interactionRadius.value
      engine.setForces(JSON.parse(JSON.stringify(forces)))
      engine.reset()
    } else {
      applyPreset(currentPreset.value)
    }
    animate()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (animId) cancelAnimationFrame(animId)
  if (engine) engine.destroy()
  if (audioCtx) audioCtx.close()
})
</script>

<template>
  <div class="relative w-full h-screen bg-[#020208] overflow-hidden select-none">
    <!-- Canvas -->
    <canvas
      ref="canvasRef"
      class="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      @mousedown="onCanvasMouseDown"
      @mousemove="onCanvasMouseMove"
      @mouseup="onCanvasMouseUp"
      @mouseleave="onCanvasMouseUp"
      @wheel.prevent="onCanvasWheel"
    />

    <!-- FPS + engine badge -->
    <div class="absolute top-3 left-3 flex items-center gap-2 z-10">
      <span class="text-xs font-mono text-white/40 bg-black/40 px-2 py-0.5 rounded">
        {{ fps }} fps
      </span>
      <span class="text-xs font-mono px-2 py-0.5 rounded"
        :class="engineType === 'webgpu' ? 'text-emerald-400 bg-emerald-400/10' : engineType === 'fallback' ? 'text-amber-400 bg-amber-400/10' : 'text-red-400 bg-red-400/10'">
        {{ engineType === 'webgpu' ? 'WebGPU' : engineType === 'fallback' ? 'Three.js' : 'Error' }}
      </span>
    </div>

    <!-- Toggle panel button -->
    <button
      @click="panelOpen = !panelOpen"
      class="absolute top-3 right-3 z-20 text-white/60 hover:text-white bg-black/40 hover:bg-black/60 w-8 h-8 rounded flex items-center justify-center transition-colors"
    >
      {{ panelOpen ? '×' : '☰' }}
    </button>

    <!-- Control panel -->
    <Transition name="slide">
      <div
        v-show="panelOpen"
        class="absolute top-0 right-0 h-full w-80 bg-black/70 backdrop-blur-md border-l border-white/10 overflow-y-auto z-10 text-sm text-white/80"
      >
        <div class="p-4 space-y-4">
          <!-- Header -->
          <h2 class="text-lg font-bold text-white">Particle Life</h2>
          <p class="text-xs text-white/40">Emergent life from simple rules</p>

          <!-- Playback -->
          <div class="flex gap-2">
            <button @click="togglePause" class="flex-1 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors font-medium">
              {{ paused ? '▶ Play' : '⏸ Pause' }}
            </button>
            <button @click="resetSim" class="flex-1 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors">
              ↺ Reset
            </button>
            <button @click="randomize" class="flex-1 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors">
              🎲 Random
            </button>
          </div>

          <!-- Presets -->
          <div>
            <label class="text-xs text-white/50 uppercase tracking-wider">Preset</label>
            <select
              :value="currentPreset"
              @change="applyPreset($event.target.value)"
              class="w-full mt-1 bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-white/40"
            >
              <option v-for="(preset, key) in PRESETS" :key="key" :value="key">
                {{ preset.name }} — {{ preset.description }}
              </option>
            </select>
          </div>

          <!-- Parameters -->
          <div class="space-y-2">
            <label class="text-xs text-white/50 uppercase tracking-wider">Particles: {{ particleCount.toLocaleString() }}</label>
            <input type="range" v-model.number="particleCount" min="1000" max="50000" step="1000"
              class="w-full accent-sky-400" />

            <label class="text-xs text-white/50 uppercase tracking-wider">Types: {{ typeCount }}</label>
            <input type="range" v-model.number="typeCount" min="2" max="8" step="1"
              class="w-full accent-sky-400" />

            <label class="text-xs text-white/50 uppercase tracking-wider">Radius: {{ interactionRadius }}</label>
            <input type="range" v-model.number="interactionRadius" min="30" max="200" step="5"
              class="w-full accent-sky-400" />

            <label class="text-xs text-white/50 uppercase tracking-wider">Friction: {{ friction.toFixed(3) }}</label>
            <input type="range" v-model.number="friction" min="0" max="0.1" step="0.001"
              class="w-full accent-sky-400" />
          </div>

          <!-- Force Matrix -->
          <div>
            <label class="text-xs text-white/50 uppercase tracking-wider">Force Matrix</label>
            <p class="text-xs text-white/30 mb-2">Row → pulls toward/pushes from column. Green = attract, Red = repel</p>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr>
                    <th class="w-6"></th>
                    <th v-for="j in typeCount" :key="'h'+j"
                      class="w-8 h-6 text-center text-xs font-mono"
                      :style="{ color: getTypeColor(j-1) }">
                      {{ j }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="i in typeCount" :key="'r'+i">
                    <td class="text-center text-xs font-mono" :style="{ color: getTypeColor(i-1) }">
                      {{ i }}
                    </td>
                    <td v-for="j in typeCount" :key="'c'+i+'-'+j"
                      class="relative group">
                      <input
                        type="range"
                        :value="forces[i-1]?.[j-1] ?? 0"
                        @input="updateForce(i-1, j-1, parseFloat($event.target.value))"
                        min="-8" max="8" step="0.5"
                        class="w-8 h-8 appearance-none bg-transparent cursor-pointer"
                        :style="{
                          background: `linear-gradient(to right, 
                            rgba(239,68,68,0.6) 0%, 
                            rgba(239,68,68,0.6) ${((forces[i-1]?.[j-1] ?? 0) < 0 ? 50 + (forces[i-1]?.[j-1] ?? 0) * 6.25 : 50)}%, 
                            transparent ${((forces[i-1]?.[j-1] ?? 0) < 0 ? 50 + (forces[i-1]?.[j-1] ?? 0) * 6.25 : 50)}%, 
                            transparent ${((forces[i-1]?.[j-1] ?? 0) > 0 ? 50 + (forces[i-1]?.[j-1] ?? 0) * 6.25 : 50)}%, 
                            rgba(34,197,94,0.6) ${((forces[i-1]?.[j-1] ?? 0) > 0 ? 50 + (forces[i-1]?.[j-1] ?? 0) * 6.25 : 50)}%, 
                            rgba(34,197,94,0.6) 100%)`
                        }"
                      />
                      <span class="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white/70 pointer-events-none">
                        {{ (forces[i-1]?.[j-1] ?? 0).toFixed(1) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Color Palette -->
          <div>
            <label class="text-xs text-white/50 uppercase tracking-wider">Colors</label>
            <div class="flex gap-1.5 mt-1">
              <button v-for="(palette, key) in COLOR_PALETTES" :key="key"
                @click="colorPalette = key"
                class="flex-1 py-1 text-xs rounded border transition-colors"
                :class="colorPalette === key ? 'border-white/40 bg-white/10' : 'border-white/10 bg-transparent hover:bg-white/5'"
              >
                {{ key }}
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button @click="shareURL" class="flex-1 py-1.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 transition-colors border border-sky-500/30">
              🔗 Share URL
            </button>
            <button @click="toggleAudio" class="flex-1 py-1.5 rounded transition-colors border"
              :class="audioEnabled ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-white/10 border-white/20 hover:bg-white/20'">
              {{ audioEnabled ? '🎤 Audio On' : '🎤 Audio Off' }}
            </button>
          </div>

          <!-- Shortcuts -->
          <div class="text-xs text-white/30 space-y-0.5 pt-2 border-t border-white/10">
            <p><kbd class="px-1 py-0.5 bg-white/10 rounded">Space</kbd> Pause/Play</p>
            <p><kbd class="px-1 py-0.5 bg-white/10 rounded">R</kbd> Reset</p>
            <p><kbd class="px-1 py-0.5 bg-white/10 rounded">H</kbd> Toggle panel</p>
            <p>Drag to orbit • Scroll to zoom</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Title overlay -->
    <div class="absolute bottom-4 left-4 z-10">
      <h1 class="text-2xl font-bold text-white/90 font-display">Particle Life</h1>
      <p class="text-xs text-white/40 mt-0.5">Emergent behavior from asymmetric forces</p>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Custom range slider styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,0.15);
  outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #38bdf8;
  cursor: pointer;
  border: 2px solid rgba(255,255,255,0.3);
}
input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #38bdf8;
  cursor: pointer;
  border: 2px solid rgba(255,255,255,0.3);
}

select option {
  background: #1a1a2e;
  color: white;
}

/* Force matrix cell */
td input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 100%;
  width: 100%;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
}
td input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 6px;
  height: 20px;
  border-radius: 2px;
  background: rgba(255,255,255,0.5);
}
td input[type="range"]::-moz-range-thumb {
  width: 6px;
  height: 20px;
  border-radius: 2px;
  background: rgba(255,255,255,0.5);
}
</style>
