// WebGPU Particle Life Simulation Engine
// Compute shader-based particle physics with spatial hashing

const PARTICLE_STRIDE = 8 // x, y, vx, vy, species, _pad1, _pad2, _pad3

// WGSL compute shaders
const SHADERS = {
  // Phase 1: Count particles per bin
  binCount: `
    struct Particle { x: f32, y: f32, vx: f32, vy: f32, species: f32, _pad1: f32, _pad2: f32, _pad3: f32 }
    struct SimOptions { width: f32, height: f32, binSize: f32, gridW: u32, gridH: u32, typeCount: u32, dt: f32, friction: f32 }

    @group(0) @binding(0) var<storage, read> particles: array<Particle>;
    @group(0) @binding(1) var<storage, read_write> binSizes: array<atomic<u32>>;
    @group(1) @binding(0) var<uniform> opts: SimOptions;

    fn binIndex(px: f32, py: f32) -> u32 {
      let hx = clamp(u32(floor((px + opts.width * 0.5) / opts.binSize)), 0u, opts.gridW - 1u);
      let hy = clamp(u32(floor((py + opts.height * 0.5) / opts.binSize)), 0u, opts.gridH - 1u);
      return hy * opts.gridW + hx;
    }

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) gid: vec3u) {
      if (gid.x >= arrayLength(&particles)) { return; }
      let idx = binIndex(particles[gid.x].x, particles[gid.x].y);
      atomicAdd(&binSizes[idx + 1u], 1u);
    }
  `,

  // Phase 2: Parallel prefix sum (single step)
  prefixSum: `
    @group(0) @binding(0) var<storage, read> input: array<u32>;
    @group(0) @binding(1) var<storage, read_write> output: array<u32>;
    @group(0) @binding(2) var<uniform> stepSize: u32;

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) gid: vec3u) {
      if (gid.x >= arrayLength(&input)) { return; }
      if (gid.x < stepSize) {
        output[gid.x] = input[gid.x];
      } else {
        output[gid.x] = input[gid.x] + input[gid.x - stepSize];
      }
    }
  `,

  // Phase 3: Sort particles into bins
  sortParticles: `
    struct Particle { x: f32, y: f32, vx: f32, vy: f32, species: f32, _pad1: f32, _pad2: f32, _pad3: f32 }
    struct SimOptions { width: f32, height: f32, binSize: f32, gridW: u32, gridH: u32, typeCount: u32, dt: f32, friction: f32 }

    @group(0) @binding(0) var<storage, read> src: array<Particle>;
    @group(0) @binding(1) var<storage, read_write> dst: array<Particle>;
    @group(0) @binding(2) var<storage, read> binOffset: array<u32>;
    @group(0) @binding(3) var<storage, read_write> binCur: array<atomic<u32>>;
    @group(1) @binding(0) var<uniform> opts: SimOptions;

    fn binIndex(px: f32, py: f32) -> u32 {
      let hx = clamp(u32(floor((px + opts.width * 0.5) / opts.binSize)), 0u, opts.gridW - 1u);
      let hy = clamp(u32(floor((py + opts.height * 0.5) / opts.binSize)), 0u, opts.gridH - 1u);
      return hy * opts.gridW + hx;
    }

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) gid: vec3u) {
      if (gid.x >= arrayLength(&src)) { return; }
      let p = src[gid.x];
      let bin = binIndex(p.x, p.y);
      let slot = atomicAdd(&binCur[bin], 1u);
      dst[binOffset[bin] + slot] = p;
    }
  `,

  // Phase 4: Compute forces
  computeForces: `
    struct Particle { x: f32, y: f32, vx: f32, vy: f32, species: f32, _pad1: f32, _pad2: f32, _pad3: f32 }
    struct SimOptions { width: f32, height: f32, binSize: f32, gridW: u32, gridH: u32, typeCount: u32, dt: f32, friction: f32 }

    @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
    @group(0) @binding(1) var<storage, read> binOffset: array<u32>;
    @group(0) @binding(2) var<storage, read> forces: array<f32>;
    @group(1) @binding(0) var<uniform> opts: SimOptions;

    fn binIndex(px: f32, py: f32) -> u32 {
      let hx = clamp(u32(floor((px + opts.width * 0.5) / opts.binSize)), 0u, opts.gridW - 1u);
      let hy = clamp(u32(floor((py + opts.height * 0.5) / opts.binSize)), 0u, opts.gridH - 1u);
      return hy * opts.gridW + hx;
    }

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) gid: vec3u) {
      if (gid.x >= arrayLength(&particles)) { return; }

      var p = particles[gid.x];
      let myBin = binIndex(p.x, p.y);
      let bx = myBin % opts.gridW;
      let by = myBin / opts.gridW;

      var totalFx: f32 = 0.0;
      var totalFy: f32 = 0.0;

      // Iterate 3x3 neighborhood of bins
      for (var dy: i32 = -1; dy <= 1; dy++) {
        for (var dx: i32 = -1; dx <= 1; dx++) {
          let nbx = i32(bx) + dx;
          let nby = i32(by) + dy;
          if (nbx < 0 || nbx >= i32(opts.gridW) || nby < 0 || nby >= i32(opts.gridH)) { continue; }
          let binIdx = u32(nby) * opts.gridW + u32(nbx);
          let start = binOffset[binIdx];
          let end = binOffset[binIdx + 1u];

          for (var j = start; j < end; j++) {
            if (j == gid.x) { continue; }
            let q = particles[j];
            let rx = q.x - p.x;
            let ry = q.y - p.y;
            let dist = sqrt(rx * rx + ry * ry);
            if (dist < 0.001 || dist > opts.binSize) { continue; }

            let ni = u32(p.species) * opts.typeCount + u32(q.species);
            let strength = forces[ni * 2u];
            let collStr = forces[ni * 2u + 1u];
            let radius = opts.interactionRadius;
            let collRadius = radius * 0.3;

            // Interaction force (linear falloff)
            let factor = max(0.0, 1.0 - dist / radius);
            totalFx += strength * factor * (rx / dist);
            totalFy += strength * factor * (ry / dist);

            // Collision force (always repulsive, short range)
            let collFactor = max(0.0, 1.0 - dist / collRadius);
            totalFx -= collStr * collFactor * (rx / dist);
            totalFy -= collStr * collFactor * (ry / dist);
          }
        }
      }

      // Update velocity
      p.vx += totalFx * opts.dt;
      p.vy += totalFy * opts.dt;

      // Apply friction
      p.vx *= (1.0 - opts.friction);
      p.vy *= (1.0 - opts.friction);

      // Speed limit
      let speed = sqrt(p.vx * p.vx + p.vy * p.vy);
      let maxSpeed = 5.0;
      if (speed > maxSpeed) {
        p.vx = p.vx / speed * maxSpeed;
        p.vy = p.vy / speed * maxSpeed;
      }

      particles[gid.x] = p;
    }
  `,

  // Phase 5: Advance particles
  advanceParticles: `
    struct Particle { x: f32, y: f32, vx: f32, vy: f32, species: f32, _pad1: f32, _pad2: f32, _pad3: f32 }
    struct SimOptions { width: f32, height: f32, binSize: f32, gridW: u32, gridH: u32, typeCount: u32, dt: f32, friction: f32 }

    @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
    @group(1) @binding(0) var<uniform> opts: SimOptions;

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) gid: vec3u) {
      if (gid.x >= arrayLength(&particles)) { return; }
      var p = particles[gid.x];

      p.x += p.vx * opts.dt;
      p.y += p.vy * opts.dt;

      // Boundary: soft bounce
      let halfW = opts.width * 0.5;
      let halfH = opts.height * 0.5;
      if (p.x < -halfW) { p.x = -halfW; p.vx = abs(p.vx); }
      if (p.x > halfW)  { p.x = halfW;  p.vx = -abs(p.vx); }
      if (p.y < -halfH) { p.y = -halfH; p.vy = abs(p.vy); }
      if (p.y > halfH)  { p.y = halfH;  p.vy = -abs(p.vy); }

      particles[gid.x] = p;
    }
  `,

  // Render: vertex shader for particles
  renderVert: `
    struct Particle { x: f32, y: f32, vx: f32, vy: f32, species: f32, _pad1: f32, _pad2: f32, _pad3: f32 }
    struct Camera { mvp: mat4x4f }

    @group(0) @binding(0) var<storage, read> particles: array<Particle>;
    @group(1) @binding(0) var<uniform> camera: Camera;

    struct VertOut {
      @builtin(position) pos: vec4f,
      @location(0) color: vec3f,
      @location(1) uv: vec2f,
    }

    const OFFSETS = array<vec2f, 6>(
      vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
      vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1),
    );

    const PALETTE = array<vec3f, 8>(
      vec3f(0.0, 0.7, 1.0),
      vec3f(1.0, 0.3, 0.5),
      vec3f(0.2, 1.0, 0.5),
      vec3f(1.0, 0.8, 0.2),
      vec3f(0.6, 0.3, 1.0),
      vec3f(1.0, 0.5, 0.0),
      vec3f(0.0, 1.0, 0.8),
      vec3f(0.9, 0.2, 0.7),
    );

    @vertex
    fn vsMain(@builtin(vertex_index) vid: u32) -> VertOut {
      let pid = vid / 6u;
      let p = particles[pid];
      let off = OFFSETS[vid % 6u] * 2.5;
      let worldPos = vec4f(p.x + off.x, p.y + off.y, 0.0, 1.0);
      let color = PALETTE[u32(p.species) % 8u];
      return VertOut(camera.mvp * worldPos, color, OFFSETS[vid % 6u] * 0.5 + 0.5);
    }
  `,

  // Render: fragment shader for particles (glowing circles)
  renderFrag: `
    @fragment
    fn fsMain(@location(0) color: vec3f, @location(1) uv: vec2f) -> @location(0) vec4f {
      let d = length(uv - 0.5) * 2.0;
      if (d > 1.0) { discard; }
      let glow = exp(-3.0 * d * d);
      let core = smoothstep(1.0, 0.3, d);
      let finalColor = color * (0.3 + 0.7 * glow) + vec3f(0.1) * core;
      let alpha = glow * 0.9 + core * 0.1;
      return vec4f(finalColor, alpha);
    }
  `,
}

export class ParticleLifeEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.particleCount = options.particleCount || 10000
    this.typeCount = options.typeCount || 6
    this.friction = options.friction || 0.02
    this.interactionRadius = options.interactionRadius || 80
    this.forces = options.forces || null
    this.paused = false
    this.simWidth = options.simWidth || 600
    this.simHeight = options.simHeight || 600
    this.onFrame = options.onFrame || null

    this.device = null
    this.context = null
    this.particleBuffer = null
    this.sortedBuffer = null
    this.binSizesBuffer = null
    this.binOffsetsBuffer = null
    this.binCurBuffer = null
    this.forcesBuffer = null
    this.simOptionsBuffer = null
    this.cameraBuffer = null
    this.pipeline = {}
    this.bindGroups = {}
    this.frameCount = 0
    this.lastTime = performance.now()
    this.fps = 0
  }

  async init() {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported')
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      throw new Error('No WebGPU adapter found')
    }

    this.device = await adapter.requestDevice()
    this.context = this.canvas.getContext('webgpu')
    if (!this.context) {
      throw new Error('Failed to get WebGPU context')
    }

    const format = navigator.gpu.getPreferredCanvasFormat()
    this.context.configure({
      device: this.device,
      format,
      alphaMode: 'premultiplied',
    })
    this.canvasFormat = format

    this._createBuffers()
    this._createPipelines()
    this._initParticles()

    return this
  }

  _createBuffers() {
    const d = this.device
    const count = this.particleCount
    const particleBytes = count * PARTICLE_STRIDE * 4

    // Particle buffers (ping-pong)
    this.particleBuffer = d.createBuffer({
      size: particleBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })
    this.sortedBuffer = d.createBuffer({
      size: particleBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Spatial hash buffers
    const binCount = this._getBinCount() + 1
    const bufSize = binCount * 4
    this.binSizesBuffer = d.createBuffer({ size: bufSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    this.binOffsetsBuffer = d.createBuffer({ size: bufSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    this.binCurBuffer = d.createBuffer({ size: bufSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })

    // Forces buffer (flattened NxN * 2 values: strength + collisionStrength per pair)
    const forceCount = this.typeCount * this.typeCount * 2
    this.forcesBuffer = d.createBuffer({
      size: forceCount * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Sim options uniform
    this.simOptionsBuffer = d.createBuffer({
      size: 32, // 8 x f32
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    // Camera uniform (4x4 matrix = 64 bytes)
    this.cameraBuffer = d.createBuffer({
      size: 128, // mat4x4 + padding
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
  }

  _getBinCount() {
    const binSize = this.interactionRadius
    const gridW = Math.ceil(this.simWidth / binSize) + 1
    const gridH = Math.ceil(this.simHeight / binSize) + 1
    return gridW * gridH
  }

  _createPipelines() {
    const d = this.device

    // Compute shader modules
    const binCountModule = d.createShaderModule({ code: SHADERS.binCount })
    const prefixSumModule = d.createShaderModule({ code: SHADERS.prefixSum })
    const sortModule = d.createShaderModule({ code: SHADERS.sortParticles })
    const forcesModule = d.createShaderModule({ code: SHADERS.computeForces })
    const advanceModule = d.createShaderModule({ code: SHADERS.advanceParticles })

    // Render shader modules
    const vertModule = d.createShaderModule({ code: SHADERS.renderVert })
    const fragModule = d.createShaderModule({ code: SHADERS.renderFrag })

    // Bind group layouts
    const simOptionsLayout = d.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }],
    })

    // Pipeline 1: Bin count
    this.pipeline.binCount = d.createComputePipeline({
      layout: d.createPipelineLayout({ bindGroupLayouts: [
        d.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          ],
        }),
        simOptionsLayout,
      ]}),
      compute: { module: binCountModule, entryPoint: 'main' },
    })

    // Pipeline 2: Prefix sum
    this.pipeline.prefixSum = d.createComputePipeline({
      layout: d.createPipelineLayout({ bindGroupLayouts: [
        d.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
          ],
        }),
      ]}),
      compute: { module: prefixSumModule, entryPoint: 'main' },
    })

    // Pipeline 3: Sort
    this.pipeline.sort = d.createComputePipeline({
      layout: d.createPipelineLayout({ bindGroupLayouts: [
        d.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          ],
        }),
        simOptionsLayout,
      ]}),
      compute: { module: sortModule, entryPoint: 'main' },
    })

    // Pipeline 4: Compute forces
    this.pipeline.forces = d.createComputePipeline({
      layout: d.createPipelineLayout({ bindGroupLayouts: [
        d.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          ],
        }),
        simOptionsLayout,
      ]}),
      compute: { module: forcesModule, entryPoint: 'main' },
    })

    // Pipeline 5: Advance
    this.pipeline.advance = d.createComputePipeline({
      layout: d.createPipelineLayout({ bindGroupLayouts: [
        d.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          ],
        }),
        simOptionsLayout,
      ]}),
      compute: { module: advanceModule, entryPoint: 'main' },
    })

    // Render pipeline
    this.pipeline.render = d.createRenderPipeline({
      layout: d.createPipelineLayout({ bindGroupLayouts: [
        d.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
          ],
        }),
        d.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
          ],
        }),
      ]}),
      vertex: { module: vertModule, entryPoint: 'vsMain' },
      fragment: {
        module: fragModule,
        entryPoint: 'fsMain',
        targets: [{ format: this.canvasFormat, blend: {
          color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
        }}],
      },
      primitive: { topology: 'triangle-list' },
    })
  }

  _initParticles() {
    const count = this.particleCount
    const data = new Float32Array(count * PARTICLE_STRIDE)
    const halfW = this.simWidth * 0.5
    const halfH = this.simHeight * 0.5

    for (let i = 0; i < count; i++) {
      const base = i * PARTICLE_STRIDE
      data[base] = (Math.random() - 0.5) * this.simWidth * 0.8 // x
      data[base + 1] = (Math.random() - 0.5) * this.simHeight * 0.8 // y
      data[base + 2] = 0 // vx
      data[base + 3] = 0 // vy
      data[base + 4] = Math.floor(Math.random() * this.typeCount) // species
    }

    this.device.queue.writeBuffer(this.particleBuffer, 0, data)
    this.device.queue.writeBuffer(this.sortedBuffer, 0, data)
  }

  setForces(forces) {
    this.forces = forces
    const flat = new Float32Array(this.typeCount * this.typeCount * 2)
    for (let i = 0; i < this.typeCount; i++) {
      for (let j = 0; j < this.typeCount; j++) {
        const idx = (i * this.typeCount + j) * 2
        flat[idx] = forces[i][j]
        flat[idx + 1] = Math.abs(forces[i][j]) * 0.5 // collision = half of abs(interaction)
      }
    }
    this.device.queue.writeBuffer(this.forcesBuffer, 0, flat)
  }

  _updateSimOptions() {
    const binSize = this.interactionRadius
    const gridW = Math.ceil(this.simWidth / binSize) + 1
    const gridH = Math.ceil(this.simHeight / binSize) + 1

    const opts = new Float32Array([
      this.simWidth, this.simHeight, binSize,
      gridW, gridH, this.typeCount,
      1.0, this.friction,
    ])
    // Pack gridW/gridH as f32 for the shader (they're small integers)
    this.device.queue.writeBuffer(this.simOptionsBuffer, 0, opts)
  }

  _updateCamera(mvp) {
    this.device.queue.writeBuffer(this.cameraBuffer, 0, new Float32Array(mvp))
  }

  _workgroupCount(n) {
    return Math.ceil(n / 256)
  }

  step() {
    if (this.paused) return

    const d = this.device
    const count = this.particleCount
    const binCount = this._getBinCount()
    const binSize = this.interactionRadius
    const gridW = Math.ceil(this.simWidth / binSize) + 1
    const gridH = Math.ceil(this.simHeight / binSize) + 1

    this._updateSimOptions()

    const encoder = d.createCommandEncoder()

    // Zero out bin buffers
    d.queue.writeBuffer(this.binSizesBuffer, 0, new Uint32Array(binCount + 1))
    d.queue.writeBuffer(this.binCurBuffer, 0, new Uint32Array(binCount + 1))

    // Phase 1: Bin count
    {
      const bg0 = d.createBindGroup({
        layout: this.pipeline.binCount.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.particleBuffer } },
          { binding: 1, resource: { buffer: this.binSizesBuffer } },
        ],
      })
      const bg1 = d.createBindGroup({
        layout: this.pipeline.binCount.getBindGroupLayout(1),
        entries: [{ binding: 0, resource: { buffer: this.simOptionsBuffer } }],
      })
      const pass = encoder.beginComputePass()
      pass.setPipeline(this.pipeline.binCount)
      pass.setBindGroup(0, bg0)
      pass.setBindGroup(1, bg1)
      pass.dispatchWorkgroups(this._workgroupCount(count))
      pass.end()
    }

    // Phase 2: Prefix sum
    const iterations = Math.ceil(Math.ceil(Math.log2(binCount + 1)) / 2) * 2
    for (let i = 0; i < iterations; i++) {
      const stepVal = new Uint32Array([1 << i])
      d.queue.writeBuffer(this.simOptionsBuffer, 0, stepVal) // reuse simOptions for stepSize

      const src = (i % 2 === 0) ? this.binSizesBuffer : this.binOffsetsBuffer
      const dst = (i % 2 === 0) ? this.binOffsetsBuffer : this.binSizesBuffer

      const bg = d.createBindGroup({
        layout: this.pipeline.prefixSum.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: src } },
          { binding: 1, resource: { buffer: dst } },
          { binding: 2, resource: { buffer: this.simOptionsBuffer } },
        ],
      })
      const pass = encoder.beginComputePass()
      pass.setPipeline(this.pipeline.prefixSum)
      pass.setBindGroup(0, bg)
      pass.dispatchWorkgroups(this._workgroupCount(binCount + 1))
      pass.end()
    }

    // Ensure final offsets are in binOffsetsBuffer
    // If iterations is even, result is in binSizesBuffer, need to copy to binOffsetsBuffer
    if (iterations % 2 === 0) {
      encoder.copyBufferToBuffer(this.binSizesBuffer, 0, this.binOffsetsBuffer, 0, (binCount + 1) * 4)
    }

    // Zero out binCur for sort phase
    d.queue.writeBuffer(this.binCurBuffer, 0, new Uint32Array(binCount + 1))

    // Phase 3: Sort
    {
      const bg0 = d.createBindGroup({
        layout: this.pipeline.sort.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.particleBuffer } },
          { binding: 1, resource: { buffer: this.sortedBuffer } },
          { binding: 2, resource: { buffer: this.binOffsetsBuffer } },
          { binding: 3, resource: { buffer: this.binCurBuffer } },
        ],
      })
      const bg1 = d.createBindGroup({
        layout: this.pipeline.sort.getBindGroupLayout(1),
        entries: [{ binding: 0, resource: { buffer: this.simOptionsBuffer } }],
      })
      const pass = encoder.beginComputePass()
      pass.setPipeline(this.pipeline.sort)
      pass.setBindGroup(0, bg0)
      pass.setBindGroup(1, bg1)
      pass.dispatchWorkgroups(this._workgroupCount(count))
      pass.end()
    }

    // Phase 4: Compute forces (read from sortedBuffer, write back to sortedBuffer)
    {
      const bg0 = d.createBindGroup({
        layout: this.pipeline.forces.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.sortedBuffer } },
          { binding: 1, resource: { buffer: this.binOffsetsBuffer } },
          { binding: 2, resource: { buffer: this.forcesBuffer } },
        ],
      })
      const bg1 = d.createBindGroup({
        layout: this.pipeline.forces.getBindGroupLayout(1),
        entries: [{ binding: 0, resource: { buffer: this.simOptionsBuffer } }],
      })
      const pass = encoder.beginComputePass()
      pass.setPipeline(this.pipeline.forces)
      pass.setBindGroup(0, bg0)
      pass.setBindGroup(1, bg1)
      pass.dispatchWorkgroups(this._workgroupCount(count))
      pass.end()
    }

    // Phase 5: Advance (read/write sortedBuffer)
    {
      const bg0 = d.createBindGroup({
        layout: this.pipeline.advance.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.sortedBuffer } },
        ],
      })
      const bg1 = d.createBindGroup({
        layout: this.pipeline.advance.getBindGroupLayout(1),
        entries: [{ binding: 0, resource: { buffer: this.simOptionsBuffer } }],
      })
      const pass = encoder.beginComputePass()
      pass.setPipeline(this.pipeline.advance)
      pass.setBindGroup(0, bg0)
      pass.setBindGroup(1, bg1)
      pass.dispatchWorkgroups(this._workgroupCount(count))
      pass.end()
    }

    d.queue.submit([encoder.finish()])
  }

  render(mvp) {
    this._updateCamera(mvp)

    const textureView = this.context.getCurrentTexture().createView()
    const encoder = this.device.createCommandEncoder()

    const bg0 = this.device.createBindGroup({
      layout: this.pipeline.render.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.sortedBuffer } }],
    })
    const bg1 = this.device.createBindGroup({
      layout: this.pipeline.render.getBindGroupLayout(1),
      entries: [{ binding: 0, resource: { buffer: this.cameraBuffer } }],
    })

    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0.02, g: 0.02, b: 0.04, a: 1 },
      }],
    })
    pass.setPipeline(this.pipeline.render)
    pass.setBindGroup(0, bg0)
    pass.setBindGroup(1, bg1)
    pass.draw(this.particleCount * 6)
    pass.end()

    this.device.queue.submit([encoder.finish()])

    // FPS tracking
    this.frameCount++
    const now = performance.now()
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastTime = now
    }
  }

  // Read back particle positions (for URL sharing, etc.)
  async readParticles() {
    const count = this.particleCount
    const readBuffer = this.device.createBuffer({
      size: count * PARTICLE_STRIDE * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })
    const encoder = this.device.createCommandEncoder()
    encoder.copyBufferToBuffer(this.sortedBuffer, 0, readBuffer, 0, count * PARTICLE_STRIDE * 4)
    this.device.queue.submit([encoder.finish()])

    await readBuffer.mapAsync(GPUMapMode.READ)
    const data = new Float32Array(readBuffer.getMappedRange().slice(0))
    readBuffer.unmap()
    readBuffer.destroy()
    return data
  }

  // Inject particles from external data (for URL loading)
  injectParticles(data) {
    this.device.queue.writeBuffer(this.particleBuffer, 0, data)
    this.device.queue.writeBuffer(this.sortedBuffer, 0, data)
  }

  reset() {
    this._initParticles()
  }

  destroy() {
    // Clean up GPU resources
    this.particleBuffer?.destroy()
    this.sortedBuffer?.destroy()
    this.binSizesBuffer?.destroy()
    this.binOffsetsBuffer?.destroy()
    this.binCurBuffer?.destroy()
    this.forcesBuffer?.destroy()
    this.simOptionsBuffer?.destroy()
    this.cameraBuffer?.destroy()
    this.device?.destroy()
  }
}
