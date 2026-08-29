// Three.js CPU fallback engine for Particle Life
// Uses InstancedMesh for rendering, CPU simulation for physics
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const MAX_PARTICLES = 15000

export class ParticleLifeFallback {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.particleCount = Math.min(options.particleCount || 8000, MAX_PARTICLES)
    this.typeCount = options.typeCount || 6
    this.friction = options.friction || 0.02
    this.interactionRadius = options.interactionRadius || 80
    this.forces = options.forces || null
    this.paused = false
    this.simWidth = options.simWidth || 600
    this.simHeight = options.simHeight || 600
    this.onFrame = options.onFrame || null

    this.particles = null
    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = null
    this.mesh = null
    this.frameCount = 0
    this.lastTime = performance.now()
    this.fps = 0
    this._dummy = new THREE.Object3D()
  }

  async init() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x020208)

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000)
    this.camera.position.set(0, 0, 400)

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x020208)

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.rotateSpeed = 0.5

    // Particle mesh
    const geo = new THREE.SphereGeometry(1.5, 6, 6)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    this.mesh = new THREE.InstancedMesh(geo, mat, this.particleCount)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.scene.add(this.mesh)

    this._initParticles()
    this._resize()

    return this
  }

  _initParticles() {
    const n = this.particleCount
    this.particles = new Float32Array(n * 6) // x, y, z, vx, vy, species

    for (let i = 0; i < n; i++) {
      const base = i * 6
      this.particles[base] = (Math.random() - 0.5) * this.simWidth * 0.8
      this.particles[base + 1] = (Math.random() - 0.5) * this.simHeight * 0.8
      this.particles[base + 2] = (Math.random() - 0.5) * 50
      this.particles[base + 3] = 0
      this.particles[base + 4] = 0
      this.particles[base + 5] = Math.floor(Math.random() * this.typeCount)
    }
  }

  setForces(forces) {
    this.forces = forces
  }

  _getColor(species) {
    const palettes = [
      [0.0, 0.7, 1.0],
      [1.0, 0.3, 0.5],
      [0.2, 1.0, 0.5],
      [1.0, 0.8, 0.2],
      [0.6, 0.3, 1.0],
      [1.0, 0.5, 0.0],
      [0.0, 1.0, 0.8],
      [0.9, 0.2, 0.7],
    ]
    const c = palettes[species % palettes.length]
    return new THREE.Color(c[0], c[1], c[2])
  }

  step() {
    if (this.paused || !this.particles || !this.forces) return

    const n = this.particleCount
    const p = this.particles
    const dt = 1.0
    const radius = this.interactionRadius

    for (let i = 0; i < n; i++) {
      const bi = i * 6
      let fx = 0, fy = 0, fz = 0

      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const bj = j * 6

        const dx = p[bj] - p[bi]
        const dy = p[bj + 1] - p[bi + 1]
        const dz = p[bj + 2] - p[bi + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < 0.1 || dist > radius) continue

        const si = Math.floor(p[bi + 5])
        const sj = Math.floor(p[bj + 5])
        const force = this.forces[si]?.[sj] ?? 0

        const factor = Math.max(0, 1 - dist / radius)
        const nx = dx / dist, ny = dy / dist, nz = dz / dist

        fx += force * factor * nx
        fy += force * factor * ny
        fz += force * factor * nz

        // Short-range collision
        const collR = radius * 0.3
        const collF = Math.max(0, 1 - dist / collR)
        const collStr = Math.abs(force) * 0.5
        fx -= collStr * collF * nx
        fy -= collStr * collF * ny
        fz -= collStr * collF * nz
      }

      p[bi + 3] += fx * dt
      p[bi + 4] += fy * dt

      p[bi + 3] *= (1 - this.friction)
      p[bi + 4] *= (1 - this.friction)

      const speed = Math.sqrt(p[bi + 3] ** 2 + p[bi + 4] ** 2)
      if (speed > 5) {
        p[bi + 3] = p[bi + 3] / speed * 5
        p[bi + 4] = p[bi + 4] / speed * 5
      }

      p[bi] += p[bi + 3] * dt
      p[bi + 1] += p[bi + 4] * dt
      p[bi + 2] += (Math.random() - 0.5) * 0.2

      // Boundary
      const hw = this.simWidth * 0.5
      const hh = this.simHeight * 0.5
      if (p[bi] < -hw) { p[bi] = -hw; p[bi + 3] = Math.abs(p[bi + 3]) }
      if (p[bi] > hw)  { p[bi] = hw;  p[bi + 3] = -Math.abs(p[bi + 3]) }
      if (p[bi + 1] < -hh) { p[bi + 1] = -hh; p[bi + 4] = Math.abs(p[bi + 4]) }
      if (p[bi + 1] > hh)  { p[bi + 1] = hh;  p[bi + 4] = -Math.abs(p[bi + 4]) }
    }
  }

  render() {
    const n = this.particleCount
    const p = this.particles

    for (let i = 0; i < n; i++) {
      const bi = i * 6
      const species = Math.floor(p[bi + 5])

      this._dummy.position.set(p[bi], p[bi + 1], p[bi + 2])
      this._dummy.scale.setScalar(1.2)
      this._dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this._dummy.matrix)

      const color = this._getColor(species)
      this.mesh.setColorAt(i, color)
    }

    this.mesh.instanceMatrix.needsUpdate = true
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true

    this.controls.update()
    this.renderer.render(this.scene, this.camera)

    // FPS tracking
    this.frameCount++
    const now = performance.now()
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastTime = now
    }
  }

  _resize() {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  onResize() {
    this._resize()
  }

  reset() {
    this._initParticles()
  }

  destroy() {
    this.mesh?.geometry?.dispose()
    this.mesh?.material?.dispose()
    this.renderer?.dispose()
    this.controls?.dispose()
  }
}
