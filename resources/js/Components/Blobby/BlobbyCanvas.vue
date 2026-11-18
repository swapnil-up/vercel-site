<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

const props = defineProps({
  mood: { type: String, default: 'content' },
  action: { type: String, default: 'idle' },
  actionId: { type: Number, default: 0 },
  compact: { type: Boolean, default: false },
  interactive: { type: Boolean, default: true },
  showEnvironment: { type: Boolean, default: true },
  sleeping: { type: Boolean, default: false },
})

const emit = defineEmits(['interact', 'ready'])

const supportedMoods = new Set([
  'excited',
  'happy',
  'content',
  'sick',
  'hungry',
  'dejected',
  'bored',
  'curious',
  'crying',
  'lonely',
  'sleepy',
])

const supportedActions = new Set(['idle', 'excited', 'love', 'confused', 'eating'])

const normalizeMood = (mood) => supportedMoods.has(mood) ? mood : 'content'
const normalizeAction = (action) => supportedActions.has(action) ? action : 'idle'

const rootContainer = ref(null)
const currentAction = ref(normalizeAction(props.action))
const reducedMotion = ref(false)

const activeMood = computed(() => normalizeMood(props.mood))
const isSleeping = computed(() => props.sleeping || activeMood.value === 'sleepy')

const moodPalette = {
  excited: { body: new THREE.Color(0xffe082), emissive: new THREE.Color(0xffb300), intensity: 0.3 },
  happy: { body: new THREE.Color(0xf8bbd0), emissive: new THREE.Color(0xff6b9d), intensity: 0.2 },
  content: { body: new THREE.Color(0xc5b3e6), emissive: new THREE.Color(0x7480fc), intensity: 0.15 },
  sick: { body: new THREE.Color(0xaed581), emissive: new THREE.Color(0x558b2f), intensity: 0.22 },
  hungry: { body: new THREE.Color(0xffcc80), emissive: new THREE.Color(0xef6c00), intensity: 0.2 },
  dejected: { body: new THREE.Color(0xef9a9a), emissive: new THREE.Color(0xd32f2f), intensity: 0.28 },
  bored: { body: new THREE.Color(0xb0bec5), emissive: new THREE.Color(0x546e7a), intensity: 0.1 },
  curious: { body: new THREE.Color(0x80cbc4), emissive: new THREE.Color(0x00838f), intensity: 0.18 },
  crying: { body: new THREE.Color(0x90caf9), emissive: new THREE.Color(0x1e88e5), intensity: 0.28 },
  lonely: { body: new THREE.Color(0xce93d8), emissive: new THREE.Color(0x8e24aa), intensity: 0.2 },
  sleepy: { body: new THREE.Color(0xb39ddb), emissive: new THREE.Color(0x5e35b1), intensity: 0.15 },
}

const defaultLightColor = new THREE.Color(0xffd93d)
const moodLightColors = {
  excited: new THREE.Color(0xffd93d),
  sick: new THREE.Color(0x7cb342),
  dejected: new THREE.Color(0xff6b6b),
  crying: new THREE.Color(0x74c0fc),
  curious: new THREE.Color(0x80cbc4),
}

let scene
let camera
let renderer
let petMesh
let petMaterial
let ambientLight
let pointLight
let rimLight
let leftEye
let rightEye
let leftCheek
let rightCheek
let antennaGroup
let antennaTip
let mouthMesh = null
let mouthType = null
let mouthMaterial
let environmentGroup
let softShadow
let ambientParticles
let basePositions = null
let baseAmbientPositions = null
let ambientParticleCount = 0
let geometryAtBase = true

let animationFrameId = null
let actionTimerId = null
let resizeObserver
let motionQuery
let elapsedTime = 0
let lastFrameTimestamp = 0
let disposed = false

const eyeBase = { lx: -0.34, rx: 0.34, y: 0.1, z: 0.88 }
const eyeOffset = { x: 0, y: 0 }
const pointerNDC = { x: 0, y: 0 }
const BLINK_DUR = 0.13
const BASE_Y = -0.18

let blinkT = 0
let nextBlink = 1.5 + Math.random() * 3
let pointerActive = false
let onCanvasPointerMove
let onCanvasPointerLeave

const bursts = []

const buildMouthGeometry = (type) => {
  const y = -0.13
  const z = 1.015
  const point = (x, yy) => new THREE.Vector3(x, yy, z)
  const chain = (points) => new THREE.CatmullRomCurve3(points.map(([x, yy]) => point(x, yy)))

  switch (type) {
    case 'cat':
      return new THREE.TubeGeometry(chain([
        [-0.17, y + 0.03], [-0.085, y - 0.05], [0, y + 0.015], [0.085, y - 0.05], [0.17, y + 0.03],
      ]), 36, 0.022, 8, false)
    case 'flat':
      return new THREE.TubeGeometry(chain([
        [-0.13, y], [0, y - 0.005], [0.13, y],
      ]), 16, 0.022, 8, false)
    case 'frown':
      return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
        point(-0.16, y - 0.05), point(0, y + 0.07), point(0.16, y - 0.05),
      ), 24, 0.022, 8, false)
    case 'wavy':
      return new THREE.TubeGeometry(chain([
        [-0.16, y - 0.02], [-0.08, y + 0.05], [0, y - 0.02], [0.08, y + 0.05], [0.16, y - 0.02],
      ]), 36, 0.02, 8, false)
    case 'o':
      return new THREE.TorusGeometry(0.05, 0.018, 8, 20)
    default:
      return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
        point(-0.16, y + 0.03), point(0, y - 0.1), point(0.16, y + 0.03),
      ), 24, 0.022, 8, false)
  }
}

const moodFace = () => {
  if (isSleeping.value) return 'flat'

  switch (currentAction.value) {
    case 'excited':
    case 'love':
      return 'cat'
    case 'confused':
      return 'flat'
    case 'eating':
      return 'o'
  }

  switch (activeMood.value) {
    case 'excited':
    case 'happy':
      return 'cat'
    case 'dejected':
      return 'frown'
    case 'crying':
    case 'sick':
      return 'wavy'
    case 'bored':
    case 'lonely':
    case 'sleepy':
      return 'flat'
    case 'hungry':
      return 'o'
    default:
      return 'smile'
  }
}

const setMouth = (type) => {
  if (!petMesh || !mouthMaterial || type === mouthType) return

  mouthType = type
  if (mouthMesh) {
    petMesh.remove(mouthMesh)
    mouthMesh.geometry.dispose()
  }

  mouthMesh = new THREE.Mesh(buildMouthGeometry(type), mouthMaterial)
  if (type === 'o') mouthMesh.position.set(0, -0.15, 1.02)
  petMesh.add(mouthMesh)
}

const bakeGumdrop = (geometry) => {
  const welded = mergeVertices(geometry)
  const positions = welded.attributes.position

  for (let i = 0; i < positions.count; i++) {
    let x = positions.getX(i)
    let y = positions.getY(i)
    let z = positions.getZ(i)
    const t = Math.min(1, Math.max(0, (y + 1) / 2))
    const width = 1.12 - 0.42 * t * t
    x *= width
    z *= width
    if (y < -0.65) y = -0.65 + (y + 0.65) * 0.35
    positions.setXYZ(i, x, y, z)
  }

  welded.computeVertexNormals()
  return welded
}

const createPet = () => {
  petMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xc5b3e6,
    emissive: 0x7480fc,
    emissiveIntensity: 0.15,
    roughness: 0.32,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
  })

  const sourceGeometry = new THREE.IcosahedronGeometry(1, 4)
  const bodyGeometry = bakeGumdrop(sourceGeometry)
  sourceGeometry.dispose()

  petMesh = new THREE.Mesh(bodyGeometry, petMaterial)
  petMesh.position.y = BASE_Y
  petMesh.castShadow = true
  petMesh.receiveShadow = true
  scene.add(petMesh)

  const bulbMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x241f2b,
    roughness: 0.08,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  })
  const sparkleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })

  const makeEye = (x) => {
    const eye = new THREE.Group()
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.185, 24, 24), bulbMaterial))

    const bigSparkle = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 12), sparkleMaterial)
    bigSparkle.position.set(0.055, 0.06, 0.15)
    eye.add(bigSparkle)

    const smallSparkle = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), sparkleMaterial)
    smallSparkle.position.set(-0.05, -0.055, 0.16)
    eye.add(smallSparkle)

    eye.position.set(x, eyeBase.y, eyeBase.z)
    petMesh.add(eye)
    return eye
  }

  leftEye = makeEye(eyeBase.lx)
  rightEye = makeEye(eyeBase.rx)

  mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 0.3 })

  const cheekGeometry = new THREE.SphereGeometry(0.1, 12, 12)
  const cheekMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb3c6,
    emissive: 0xff85a2,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.6,
  })

  leftCheek = new THREE.Mesh(cheekGeometry, cheekMaterial)
  leftCheek.position.set(-0.48, -0.14, 0.88)
  leftCheek.scale.set(1, 0.6, 0.4)
  petMesh.add(leftCheek)

  rightCheek = new THREE.Mesh(cheekGeometry, cheekMaterial)
  rightCheek.position.set(0.48, -0.14, 0.88)
  rightCheek.scale.set(1, 0.6, 0.4)
  petMesh.add(rightCheek)

  antennaGroup = new THREE.Group()
  const antennaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.88, 0.05),
    new THREE.Vector3(0.05, 1.1, 0.02),
    new THREE.Vector3(0.14, 1.28, -0.05),
  ])
  antennaGroup.add(new THREE.Mesh(
    new THREE.TubeGeometry(antennaCurve, 20, 0.028, 8, false),
    new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 0.4 }),
  ))

  antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffd93d,
      emissive: 0xffd93d,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    }),
  )
  antennaTip.position.set(0.15, 1.33, -0.06)
  antennaGroup.add(antennaTip)
  petMesh.add(antennaGroup)

  basePositions = new Float32Array(petMesh.geometry.attributes.position.array)
  setMouth(moodFace())
}

const createEnvironment = () => {
  environmentGroup = new THREE.Group()
  scene.add(environmentGroup)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9, metalness: 0.1 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -1.02
  ground.receiveShadow = true
  environmentGroup.add(ground)

  const grid = new THREE.GridHelper(12, 24, 0x333355, 0x222244)
  grid.position.y = -1.01
  environmentGroup.add(grid)

  softShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.65),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { shadowOpacity: { value: 0.24 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float shadowOpacity;
        void main() {
          float distanceFromCenter = length((vUv - 0.5) * 2.0);
          float alpha = (1.0 - smoothstep(0.0, 1.0, distanceFromCenter)) * shadowOpacity;
          gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
        }
      `,
    }),
  )
  softShadow.rotation.x = -Math.PI / 2
  softShadow.position.set(0, -1.005, 0.05)
  softShadow.renderOrder = -1
  scene.add(softShadow)
}

const createAmbientParticles = () => {
  const count = 50
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const palette = [0xff6b9d, 0x74c0fc, 0xffd93d, 0xb8a9c9].map((color) => new THREE.Color(color))

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 8
    positions[i * 3 + 1] = Math.random() * 5 - 1
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8
    const color = palette[Math.floor(Math.random() * palette.length)]
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  ambientParticles = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    }),
  )
  baseAmbientPositions = new Float32Array(positions)
  scene.add(ambientParticles)
}

const applySceneMode = () => {
  if (environmentGroup) environmentGroup.visible = props.showEnvironment && !props.compact
  if (softShadow) softShadow.visible = props.compact

  if (ambientParticles) {
    ambientParticleCount = props.compact ? 12 : props.showEnvironment ? 50 : 0
    ambientParticles.geometry.setDrawRange(0, ambientParticleCount)
    ambientParticles.visible = ambientParticleCount > 0
  }
}

const resizeRenderer = () => {
  if (disposed || !renderer || !camera || !rootContainer.value) return

  const width = rootContainer.value.clientWidth
  const height = rootContainer.value.clientHeight
  const size = Math.max(1, Math.floor(Math.min(width, height)))
  const pixelRatioCap = props.compact ? 1.5 : 2

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap))
  renderer.setSize(size, size, false)
  renderer.domElement.style.width = `${size}px`
  renderer.domElement.style.height = `${size}px`
  camera.aspect = 1
  camera.updateProjectionMatrix()
}

const handleCanvasPointerMove = (event) => {
  if (!props.interactive || !renderer) return

  const rect = renderer.domElement.getBoundingClientRect()
  pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointerNDC.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
  pointerActive = true
}

const handleCanvasPointerLeave = () => {
  pointerActive = false
}

const handleInteract = (event) => {
  if (!props.interactive || !rootContainer.value) return

  const rect = rootContainer.value.getBoundingClientRect()
  const payload = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }

  acknowledge()
  emit('interact', payload)
}

const handleKeyboardInteract = () => {
  if (!props.interactive || !rootContainer.value) return

  const rect = rootContainer.value.getBoundingClientRect()
  acknowledge()
  emit('interact', { x: rect.width / 2, y: rect.height / 2 })
}

const deformPet = () => {
  if (!petMesh || !basePositions) return

  const positions = petMesh.geometry.attributes.position

  if (reducedMotion.value) {
    if (geometryAtBase) return
    for (let i = 0; i < positions.count; i++) {
      positions.array[i * 3] = basePositions[i * 3]
      positions.array[i * 3 + 1] = basePositions[i * 3 + 1]
      positions.array[i * 3 + 2] = basePositions[i * 3 + 2]
    }
    positions.needsUpdate = true
    petMesh.geometry.computeVertexNormals()
    geometryAtBase = true
    return
  }

  const mood = activeMood.value

  for (let i = 0; i < positions.count; i++) {
    const bx = basePositions[i * 3]
    const by = basePositions[i * 3 + 1]
    const bz = basePositions[i * 3 + 2]

    let noise = Math.sin(bx * 3 + elapsedTime * 1.5) * 0.04
      + Math.cos(by * 2.5 + elapsedTime * 1.2) * 0.03
      + Math.sin(bz * 2.8 + elapsedTime * 1.8) * 0.03

    if (mood === 'excited' || mood === 'happy') {
      noise += Math.sin(elapsedTime * 6 + i * 0.1) * 0.03
    } else if (mood === 'dejected') {
      noise += Math.sin(elapsedTime * 0.7 + i * 0.05) * 0.02
    } else if (mood === 'sick' || mood === 'crying') {
      noise += Math.sin(elapsedTime * 0.5 + i * 0.05) * 0.02
    } else if (mood === 'sleepy') {
      noise += Math.sin(elapsedTime * 0.3 + i * 0.02) * 0.015
    }

    const breathe = Math.sin(elapsedTime * 2) * 0.02
    const length = Math.sqrt(bx * bx + by * by + bz * bz)
    if (length > 0) {
      const front = Math.max(0, bz)
      const attenuation = 1 - 0.7 * front * front
      const scale = 1 + (noise + breathe) * attenuation
      positions.array[i * 3] = bx * scale
      positions.array[i * 3 + 1] = by * scale
      positions.array[i * 3 + 2] = bz * scale
    }
  }

  positions.needsUpdate = true
  petMesh.geometry.computeVertexNormals()
  geometryAtBase = false
}

const updatePetPose = () => {
  if (!petMesh) return

  const mood = activeMood.value
  const action = currentAction.value

  petMesh.position.set(0, BASE_Y, 0)
  petMesh.rotation.set(0, 0, 0)
  petMesh.scale.set(1, 1, 1)

  if (isSleeping.value) {
    petMesh.position.y = BASE_Y - 0.04
    petMesh.rotation.z = 0.12
  } else if (!reducedMotion.value) {
    if (action === 'excited' || (action === 'idle' && mood === 'excited')) {
      const hop = Math.abs(Math.sin(elapsedTime * 4))
      petMesh.position.y = BASE_Y + hop * 0.3
      petMesh.rotation.y = Math.sin(elapsedTime * 3) * 0.3
      const stretch = 1 + (hop - 0.45) * 0.24
      petMesh.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch))
    } else if (action === 'love' || (action === 'idle' && mood === 'happy')) {
      petMesh.rotation.z = Math.sin(elapsedTime * 2) * 0.08
      petMesh.rotation.y = Math.sin(elapsedTime * 1.4) * 0.13
      petMesh.scale.setScalar(1 + Math.sin(elapsedTime * 4) * 0.015)
    } else if (action === 'confused') {
      petMesh.rotation.z = Math.sin(elapsedTime * 2.5) * 0.12
      petMesh.rotation.y = Math.sin(elapsedTime * 1.5) * 0.18
      petMesh.position.x = Math.sin(elapsedTime * 3) * 0.025
    } else if (action === 'eating') {
      const chew = Math.abs(Math.sin(elapsedTime * 9))
      petMesh.scale.set(1 + chew * 0.07, 1 - chew * 0.13, 1 + chew * 0.07)
    } else {
      switch (mood) {
        case 'happy':
          petMesh.rotation.z = Math.sin(elapsedTime * 2) * 0.08
          break
        case 'sick':
          petMesh.position.y = BASE_Y - 0.08
          petMesh.rotation.x = 0.05
          petMesh.rotation.z = Math.sin(elapsedTime * 0.7) * 0.035
          break
        case 'hungry':
          petMesh.position.z = 0.08
          petMesh.scale.setScalar(1 + Math.sin(elapsedTime * 3.5) * 0.02)
          break
        case 'dejected':
          petMesh.position.y = BASE_Y - 0.1
          petMesh.rotation.x = 0.06
          petMesh.rotation.z = 0.07
          break
        case 'bored':
          petMesh.position.y = BASE_Y - 0.07
          petMesh.rotation.x = 0.06
          petMesh.rotation.z = Math.sin(elapsedTime * 0.45) * 0.025
          break
        case 'curious':
          petMesh.position.z = 0.04
          petMesh.rotation.y = Math.sin(elapsedTime * 0.8) * 0.12
          petMesh.rotation.z = 0.12
          break
        case 'crying':
          petMesh.position.y = BASE_Y - 0.06
          petMesh.position.x = Math.sin(elapsedTime * 8) * 0.012
          petMesh.rotation.z = Math.sin(elapsedTime * 7) * 0.025
          break
        case 'lonely':
          petMesh.position.y = BASE_Y - 0.09
          petMesh.rotation.x = 0.08
          petMesh.rotation.z = -0.06
          break
        default:
          petMesh.rotation.y = Math.sin(elapsedTime * 0.5) * 0.1
          petMesh.rotation.z = Math.sin(elapsedTime * 0.8) * 0.02
      }
    }
  } else {
    if (['sick', 'dejected', 'bored', 'lonely', 'crying'].includes(mood)) {
      petMesh.position.y = BASE_Y - 0.07
    } else if (mood === 'curious') {
      petMesh.rotation.z = 0.1
    }
  }

  deformPet()
}

const updateEyes = (dt) => {
  blinkT += dt
  let closed = 0

  if (isSleeping.value) {
    closed = 1
  } else if (blinkT >= nextBlink) {
    const phase = (blinkT - nextBlink) / BLINK_DUR
    if (phase >= 1) {
      blinkT = 0
      nextBlink = 1.8 + Math.random() * 3.5
    } else {
      closed = Math.sin(phase * Math.PI)
    }
  }

  const lookX = pointerActive && !isSleeping.value && !reducedMotion.value ? pointerNDC.x : 0
  const lookY = pointerActive && !isSleeping.value && !reducedMotion.value ? pointerNDC.y : 0
  eyeOffset.x += (lookX * 0.045 - eyeOffset.x) * 0.06
  eyeOffset.y += (lookY * 0.03 - eyeOffset.y) * 0.06

  const moodEyeOffset = ['dejected', 'crying', 'lonely', 'bored'].includes(activeMood.value) ? -0.035 : 0

  const applyEye = (eye, baseX) => {
    if (!eye) return
    eye.scale.set(1 - closed * 0.08, 1 - closed * 0.9, 1)
    eye.position.set(
      baseX + eyeOffset.x,
      eyeBase.y + eyeOffset.y + moodEyeOffset - closed * 0.03,
      eyeBase.z,
    )
  }

  applyEye(leftEye, eyeBase.lx)
  applyEye(rightEye, eyeBase.rx)
}

const updateAppearance = () => {
  if (!petMesh || !petMaterial) return

  const mood = activeMood.value
  const palette = moodPalette[mood] || moodPalette.content
  petMaterial.color.lerp(palette.body, 0.05)
  petMaterial.emissive.lerp(palette.emissive, 0.05)
  petMaterial.emissiveIntensity += (palette.intensity - petMaterial.emissiveIntensity) * 0.05

  if (antennaGroup) {
    antennaGroup.rotation.z = reducedMotion.value ? 0 : Math.sin(elapsedTime * 1.2) * 0.1
    antennaGroup.rotation.x = reducedMotion.value ? 0 : Math.sin(elapsedTime * 1.6 + 1) * 0.06
  }

  if (antennaTip) {
    antennaTip.material.emissive.lerp(palette.emissive, 0.05)
    antennaTip.material.emissiveIntensity = reducedMotion.value
      ? 0.9
      : 0.7 + Math.sin(elapsedTime * 2.4) * 0.35
  }

  if (leftCheek && rightCheek) {
    const glowing = ['happy', 'excited', 'content', 'curious'].includes(mood) && !isSleeping.value
    const opacity = isSleeping.value
      ? 0
      : reducedMotion.value
        ? (glowing ? 0.65 : 0.3)
        : glowing
          ? 0.65 + Math.sin(elapsedTime * 2) * 0.2
          : 0.3
    leftCheek.material.opacity = opacity
    rightCheek.material.opacity = opacity
  }

  if (pointLight) {
    pointLight.color.lerp(moodLightColors[mood] || defaultLightColor, 0.02)
  }
}

const updateAmbientParticles = () => {
  if (!ambientParticles || !baseAmbientPositions) return

  const positions = ambientParticles.geometry.attributes.position
  for (let i = 0; i < ambientParticleCount; i++) {
    const baseX = baseAmbientPositions[i * 3]
    const baseY = baseAmbientPositions[i * 3 + 1]
    const baseZ = baseAmbientPositions[i * 3 + 2]
    positions.array[i * 3] = baseX
    positions.array[i * 3 + 1] = reducedMotion.value ? baseY : baseY + Math.sin(elapsedTime * 0.6 + i) * 0.08
    positions.array[i * 3 + 2] = baseZ
  }
  positions.needsUpdate = true
  ambientParticles.rotation.y = reducedMotion.value ? 0 : elapsedTime * 0.02
}

const updateBursts = (dt) => {
  for (let index = bursts.length - 1; index >= 0; index--) {
    const burst = bursts[index]
    burst.age += dt

    if (!reducedMotion.value) {
      const positions = burst.points.geometry.attributes.position
      for (let i = 0; i < burst.velocities.length; i++) {
        const velocity = burst.velocities[i]
        positions.array[i * 3] += velocity.x * dt * 60
        positions.array[i * 3 + 1] += velocity.y * dt * 60
        positions.array[i * 3 + 2] += velocity.z * dt * 60
        velocity.y -= 0.003
      }
      positions.needsUpdate = true
    }

    burst.points.material.opacity = Math.max(0, 1 - burst.age / burst.duration)

    if (burst.age >= burst.duration) {
      scene.remove(burst.points)
      burst.points.geometry.dispose()
      burst.points.material.dispose()
      bursts.splice(index, 1)
    }
  }
}

const animate = (timestamp) => {
  animationFrameId = null
  if (disposed || document.hidden || !renderer) return

  const dt = lastFrameTimestamp === 0 ? 0 : Math.min(0.05, (timestamp - lastFrameTimestamp) / 1000)
  lastFrameTimestamp = timestamp
  elapsedTime += dt

  updatePetPose()
  updateEyes(dt)
  updateAppearance()
  updateAmbientParticles()
  updateBursts(dt)

  renderer.render(scene, camera)
  animationFrameId = requestAnimationFrame(animate)
}

const handleVisibilityChange = () => {
  if (document.hidden) {
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
    animationFrameId = null
    pointerActive = false
    return
  }

  if (!disposed && animationFrameId === null) {
    lastFrameTimestamp = performance.now()
    animationFrameId = requestAnimationFrame(animate)
  }
}

const handleMotionPreference = (event) => {
  reducedMotion.value = event.matches
}

const initThree = () => {
  if (!rootContainer.value || renderer) return

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0.5, props.compact ? 3.55 : 4.5)
  camera.lookAt(0, 0, 0)

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch (error) {
    console.error('[BlobbyCanvas] Unable to initialize the WebGL renderer.', error)
    renderer = null
    return
  }

  renderer.setClearColor(0x000000, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  renderer.domElement.setAttribute('aria-hidden', 'true')
  rootContainer.value.appendChild(renderer.domElement)

  ambientLight = new THREE.AmbientLight(0x606090, 1.4)
  scene.add(ambientLight)

  pointLight = new THREE.PointLight(0xffd93d, 45, 10)
  pointLight.position.set(2, 3, 3)
  pointLight.castShadow = true
  pointLight.shadow.normalBias = 0.04
  scene.add(pointLight)

  rimLight = new THREE.PointLight(0xff6b9d, 18, 8)
  rimLight.position.set(-2, 1, -2)
  scene.add(rimLight)

  const fillLight = new THREE.PointLight(0x74c0fc, 10, 8)
  fillLight.position.set(-1, -2, 2)
  scene.add(fillLight)

  createPet()
  createEnvironment()
  createAmbientParticles()
  applySceneMode()

  onCanvasPointerMove = handleCanvasPointerMove
  onCanvasPointerLeave = handleCanvasPointerLeave
  renderer.domElement.addEventListener('pointermove', onCanvasPointerMove)
  renderer.domElement.addEventListener('pointerleave', onCanvasPointerLeave)

  resizeRenderer()

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(resizeRenderer)
    resizeObserver.observe(rootContainer.value)
  } else {
    window.addEventListener('resize', resizeRenderer)
  }

  if (window.matchMedia) {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = motionQuery.matches
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', handleMotionPreference)
    } else {
      motionQuery.addListener(handleMotionPreference)
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  renderer.render(scene, camera)
  emit('ready')

  if (!document.hidden) {
    lastFrameTimestamp = performance.now()
    animationFrameId = requestAnimationFrame(animate)
  }
}

const playAction = (action = 'idle') => {
  const normalized = normalizeAction(action)
  currentAction.value = normalized

  if (actionTimerId !== null) {
    window.clearTimeout(actionTimerId)
    actionTimerId = null
  }

  if (normalized !== 'idle') {
    const duration = normalized === 'eating' ? 1500 : normalized === 'love' ? 1400 : 1000
    actionTimerId = window.setTimeout(() => {
      if (currentAction.value === normalized) currentAction.value = 'idle'
      actionTimerId = null
    }, duration)
  }
}

const spawnBurst = (color, count = 20) => {
  if (!scene || !petMesh) return 0

  const normalizedCount = Math.max(0, Math.min(200, Math.floor(Number(count) || 0)))
  if (normalizedCount === 0) return 0

  let burstColor
  try {
    burstColor = new THREE.Color(color)
  } catch {
    burstColor = new THREE.Color(0xffd93d)
  }

  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(normalizedCount * 3)
  const velocities = []

  for (let i = 0; i < normalizedCount; i++) {
    positions[i * 3] = petMesh.position.x
    positions[i * 3 + 1] = petMesh.position.y
    positions[i * 3 + 2] = 0
    velocities.push({
      x: (Math.random() - 0.5) * 0.15,
      y: Math.random() * 0.12 + 0.05,
      z: (Math.random() - 0.5) * 0.1,
    })
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: burstColor,
    size: props.compact ? 0.065 : 0.08,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  scene.add(points)
  bursts.push({ points, velocities, age: 0, duration: 1.1 })

  return normalizedCount
}

const acknowledge = () => {
  blinkT = nextBlink
}

const dispose = () => {
  if (disposed) return
  disposed = true

  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
  animationFrameId = null
  if (actionTimerId !== null) window.clearTimeout(actionTimerId)
  actionTimerId = null

  document.removeEventListener('visibilitychange', handleVisibilityChange)

  if (motionQuery) {
    if (motionQuery.removeEventListener) {
      motionQuery.removeEventListener('change', handleMotionPreference)
    } else {
      motionQuery.removeListener(handleMotionPreference)
    }
    motionQuery = null
  }

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  } else {
    window.removeEventListener('resize', resizeRenderer)
  }

  if (renderer) {
    if (onCanvasPointerMove) renderer.domElement.removeEventListener('pointermove', onCanvasPointerMove)
    if (onCanvasPointerLeave) renderer.domElement.removeEventListener('pointerleave', onCanvasPointerLeave)
  }
  onCanvasPointerMove = null
  onCanvasPointerLeave = null

  while (bursts.length) {
    const burst = bursts.pop()
    if (scene) scene.remove(burst.points)
    burst.points.geometry.dispose()
    burst.points.material.dispose()
  }

  if (scene) {
    const geometries = new Set()
    const materials = new Set()

    scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry)
      if (object.material) {
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
        objectMaterials.forEach((material) => materials.add(material))
      }
    })

    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value && value.isTexture) value.dispose()
      })
      material.dispose()
    })
    scene.clear()
  }

  if (renderer) {
    renderer.renderLists.dispose()
    renderer.dispose()
    try {
      renderer.forceContextLoss()
    } catch {
      // Some WebGL implementations do not expose a context-loss extension.
    }
    renderer.domElement.remove()
  }
}

watch(() => props.action, (action) => {
  if (actionTimerId !== null) {
    window.clearTimeout(actionTimerId)
    actionTimerId = null
  }
  currentAction.value = normalizeAction(action)
})

watch(() => props.actionId, () => {
  playAction(props.action)
})

watch([activeMood, currentAction, () => props.sleeping], () => {
  setMouth(moodFace())
})

watch([() => props.compact, () => props.showEnvironment], () => {
  applySceneMode()
  resizeRenderer()
})

watch(() => props.interactive, (interactive) => {
  if (!interactive) pointerActive = false
})

onMounted(initThree)
onUnmounted(dispose)

defineExpose({ playAction, spawnBurst, acknowledge })
</script>

<template>
  <div
    ref="rootContainer"
    class="blobby-canvas"
    :class="{
      'blobby-canvas--environment': showEnvironment && !compact,
      'blobby-canvas--compact': compact,
      'blobby-canvas--interactive': interactive,
    }"
    :role="interactive ? 'button' : 'img'"
    :aria-label="interactive ? 'Interact with Blobby' : 'Blobby creature'"
    :tabindex="interactive ? 0 : undefined"
    @click="handleInteract"
    @keydown.enter.prevent="handleKeyboardInteract"
    @keydown.space.prevent="handleKeyboardInteract"
  ></div>
</template>

<style scoped>
.blobby-canvas {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: transparent;
  outline: none;
}

.blobby-canvas--environment {
  background:
    radial-gradient(circle at 50% 35%, rgba(116, 192, 252, 0.08), transparent 45%),
    #0d0d22;
}

.blobby-canvas--compact {
  min-height: 0;
  background: transparent;
}

.blobby-canvas--interactive {
  cursor: pointer;
}

.blobby-canvas:focus-visible {
  outline: 2px solid rgba(255, 107, 157, 0.85);
  outline-offset: -2px;
}

.blobby-canvas :deep(canvas) {
  display: block;
  touch-action: none;
}
</style>
