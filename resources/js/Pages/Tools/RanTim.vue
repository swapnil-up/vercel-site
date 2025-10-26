<template>
  <div class="w-full h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden" @mousedown="handleMouseDown" @touchstart="handleTouchStart" ref="containerRef">
    <!-- Three.js Canvas Container -->
    <div id="three-container" class="absolute inset-0"></div>

    <!-- UI Overlay -->
    <div class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
      <!-- Instructions -->
      <div v-if="!state.isRolling && !state.timerActive && !state.victoryPlaying" class="text-center text-white mb-20 pointer-events-auto">
        <h1 class="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          Roll the Dice
        </h1>
        <p class="text-xl text-gray-300">Drag to throw • Let it settle • Work for that many minutes</p>
      </div>

      <!-- Timer Display -->
      <div v-if="state.timerActive && state.result" class="text-center pointer-events-auto">
        <div class="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-4">
          {{ formatTime(state.timeRemaining) }}
        </div>
        <div class="text-2xl text-gray-300">
          {{ state.result }} minute{{ state.result !== 1 ? 's' : '' }} of focus
        </div>
      </div>

      <!-- Victory State -->
      <div v-if="state.victoryPlaying" class="text-center pointer-events-auto">
        <div class="text-6xl mb-4">🎉</div>
        <h2 class="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-6">
          Time's Up!
        </h2>
        <button @click="resetGame" class="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
          Roll Again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'

interface DiceState {
  isRolling: boolean
  result: number | null
  timeRemaining: number
  timerActive: boolean
  victoryPlaying: boolean
}

const containerRef = ref<HTMLDivElement | null>(null)
const state = reactive<DiceState>({
  isRolling: false,
  result: null,
  timeRemaining: 0,
  timerActive: false,
  victoryPlaying: false,
})

let scene: THREE.Scene | null = null
let dice: THREE.Mesh | null = null
let renderer: THREE.WebGLRenderer | null = null
let timerInterval: number | null = null

const velocity = { x: 0, y: 0, z: 0 }
const angularVelocity = { x: 0, y: 0, z: 0 }
const DICE_SIZE = 0.8
const BOUNDARY = 3.5

const createDiceTexture = (number: number): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 256, 256)

  // Draw dots based on number
  ctx.fillStyle = '#000000'
  const dotRadius = 20
  const positions: [number, number][] = []

  switch (number) {
    case 1:
      positions.push([128, 128])
      break
    case 2:
      positions.push([80, 80])
      positions.push([176, 176])
      break
    case 3:
      positions.push([80, 80])
      positions.push([128, 128])
      positions.push([176, 176])
      break
    case 4:
      positions.push([80, 80])
      positions.push([176, 80])
      positions.push([80, 176])
      positions.push([176, 176])
      break
    case 5:
      positions.push([80, 80])
      positions.push([176, 80])
      positions.push([128, 128])
      positions.push([80, 176])
      positions.push([176, 176])
      break
    case 6:
      positions.push([80, 80])
      positions.push([176, 80])
      positions.push([80, 128])
      positions.push([176, 128])
      positions.push([80, 176])
      positions.push([176, 176])
      break
  }

  positions.forEach(([x, y]) => {
    ctx.beginPath()
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
    ctx.fill()
  })

  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

// Initialize Three.js scene
onMounted(() => {
  const container = document.getElementById('three-container')
  if (!container) return

  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0f172a)

  // Camera
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 5

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 5, 5)
  directionalLight.castShadow = true
  scene.add(directionalLight)

  const pointLight = new THREE.PointLight(0x8b5cf6, 0.5)
  pointLight.position.set(-5, 3, 3)
  scene.add(pointLight)

  const geometry = new THREE.BoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE)
  const materials = [
    new THREE.MeshStandardMaterial({ map: createDiceTexture(1), metalness: 0.2, roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ map: createDiceTexture(6), metalness: 0.2, roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ map: createDiceTexture(2), metalness: 0.2, roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ map: createDiceTexture(5), metalness: 0.2, roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ map: createDiceTexture(3), metalness: 0.2, roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ map: createDiceTexture(4), metalness: 0.2, roughness: 0.5 }),
  ]

  dice = new THREE.Mesh(geometry, materials)
  dice.castShadow = true
  dice.receiveShadow = true
  scene.add(dice)

  // Handle window resize
  const handleResize = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer!.setSize(width, height)
  }

  window.addEventListener('resize', handleResize)

  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate)

    if (dice) {
      if (state.isRolling) {
        // Apply velocity
        dice.position.x += velocity.x
        dice.position.y += velocity.y
        dice.position.z += velocity.z

        // Apply angular velocity
        dice.rotation.x += angularVelocity.x
        dice.rotation.y += angularVelocity.y
        dice.rotation.z += angularVelocity.z

        // Apply friction
        velocity.x *= 0.98
        velocity.y *= 0.98
        velocity.z *= 0.98
        angularVelocity.x *= 0.97
        angularVelocity.y *= 0.97
        angularVelocity.z *= 0.97

        const halfSize = DICE_SIZE / 2
        const maxX = BOUNDARY - halfSize
        const maxY = BOUNDARY - halfSize

        if (dice.position.x > maxX) {
          dice.position.x = maxX
          velocity.x *= -0.8
        }
        if (dice.position.x < -maxX) {
          dice.position.x = -maxX
          velocity.x *= -0.8
        }
        if (dice.position.y > maxY) {
          dice.position.y = maxY
          velocity.y *= -0.8
        }
        if (dice.position.y < -maxY) {
          dice.position.y = -maxY
          velocity.y *= -0.8
        }

        // Check if dice has stopped
        const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2)
        const angularSpeed = Math.sqrt(angularVelocity.x ** 2 + angularVelocity.y ** 2 + angularVelocity.z ** 2)

        if (speed < 0.01 && angularSpeed < 0.01) {
          state.isRolling = false
          snapDiceToFace(dice)
          state.result = getDiceResult(dice)
          state.timerActive = true
          state.timeRemaining = state.result * 60
        }
      }
    }

    renderer!.render(scene!, camera)
  }

  animate()

  return () => {
    window.removeEventListener('resize', handleResize)
    if (container && renderer) {
      container.removeChild(renderer.domElement)
    }
  }
})

const snapDiceToFace = (diceObj: THREE.Mesh) => {
  const euler = new THREE.Euler().setFromQuaternion(diceObj.quaternion, 'XYZ')
  
  // Round each rotation to nearest 90 degrees (PI/2)
  const snapToNearest = (angle: number) => {
    return Math.round(angle / (Math.PI / 2)) * (Math.PI / 2)
  }

  euler.x = snapToNearest(euler.x)
  euler.y = snapToNearest(euler.y)
  euler.z = snapToNearest(euler.z)

  diceObj.quaternion.setFromEuler(euler)
}

const getDiceResult = (diceObj: THREE.Mesh): number => {
  // Create vectors pointing in each face direction
  const faceVectors = {
    1: new THREE.Vector3(1, 0, 0),   // right
    6: new THREE.Vector3(-1, 0, 0),  // left
    2: new THREE.Vector3(0, 1, 0),   // top
    5: new THREE.Vector3(0, -1, 0),  // bottom
    3: new THREE.Vector3(0, 0, 1),   // front
    4: new THREE.Vector3(0, 0, -1),  // back
  }

  // Apply dice rotation to each vector
  const rotatedVectors: { [key: number]: THREE.Vector3 } = {}
  for (const [faceNum, vec] of Object.entries(faceVectors)) {
    rotatedVectors[parseInt(faceNum)] = vec.clone().applyQuaternion(diceObj.quaternion)
  }

  // Find which face points most towards camera (positive Z direction)
  let maxZ = -Infinity
  let visibleFace = 3

  for (const [faceNum, vec] of Object.entries(rotatedVectors)) {
    if (vec.z > maxZ) {
      maxZ = vec.z
      visibleFace = parseInt(faceNum)
    }
  }

  return visibleFace
}

// Timer effect
watch(() => state.timerActive, (isActive) => {
  if (isActive && state.timeRemaining > 0) {
    timerInterval = window.setInterval(() => {
      state.timeRemaining--
      if (state.timeRemaining <= 0) { 
        state.timerActive = false
        state.victoryPlaying = true
        playVictorySound()
        if (timerInterval) clearInterval(timerInterval)
      }
    }, 1000)
  }
})

const playVictorySound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const now = audioContext.currentTime

  // Loop the victory sound
  const playNote = () => {
    const notes = [523.25, 659.25, 783.99] // C, E, G
    notes.forEach((freq, i) => {
      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()
      osc.connect(gain)
      gain.connect(audioContext.destination)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.3, now + i * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2)
      osc.start(now + i * 0.1)
      osc.stop(now + i * 0.1 + 0.2)
    })
  }

  // Play victory sound repeatedly while victoryPlaying is true
  const soundInterval = setInterval(() => {
    if (!state.victoryPlaying) {
      clearInterval(soundInterval)
    } else {
      playNote()
    }
  }, 600)
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const handleMouseDown = (e: MouseEvent) => {
  if (state.isRolling || state.timerActive) return

  const startX = e.clientX
  const startY = e.clientY

  const handleMouseMove = (moveEvent: MouseEvent) => {
    const deltaX = (moveEvent.clientX - startX) * 0.01
    const deltaY = (moveEvent.clientY - startY) * 0.01

    velocity.x = deltaX * 0.5
    velocity.y = -deltaY * 0.5
    velocity.z = 0

    angularVelocity.x = deltaY * 0.05
    angularVelocity.y = deltaX * 0.05
    angularVelocity.z = (Math.random() - 0.5) * 0.1
  }

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    state.isRolling = true
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleTouchStart = (e: TouchEvent) => {
  if (state.isRolling || state.timerActive) return

  const startX = e.touches[0].clientX
  const startY = e.touches[0].clientY

  const handleTouchMove = (moveEvent: TouchEvent) => {
    const deltaX = (moveEvent.touches[0].clientX - startX) * 0.01
    const deltaY = (moveEvent.touches[0].clientY - startY) * 0.01

    velocity.x = deltaX * 0.5
    velocity.y = -deltaY * 0.5
    velocity.z = 0

    angularVelocity.x = deltaY * 0.05
    angularVelocity.y = deltaX * 0.05
    angularVelocity.z = (Math.random() - 0.5) * 0.1
  }

  const handleTouchEnd = () => {
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    state.isRolling = true
  }

  document.addEventListener('touchmove', handleTouchMove)
  document.addEventListener('touchend', handleTouchEnd)
}

const resetGame = () => {
  state.isRolling = false
  state.result = null
  state.timeRemaining = 0
  state.timerActive = false
  state.victoryPlaying = false

  if (dice) {
    dice.position.set(0, 0, 0)
    dice.rotation.set(0, 0, 0)
  }

  velocity.x = 0
  velocity.y = 0
  velocity.z = 0
  angularVelocity.x = 0
  angularVelocity.y = 0
  angularVelocity.z = 0

  if (timerInterval) clearInterval(timerInterval)
}
</script>

<style scoped>
#three-container {
  width: 100%;
  height: 100%;
}
</style>
