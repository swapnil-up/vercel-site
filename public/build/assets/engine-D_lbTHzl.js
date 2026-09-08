const f={binCount:`
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
  `,prefixSum:`
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
  `,sortParticles:`
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
  `,computeForces:`
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
  `,advanceParticles:`
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
  `,renderVert:`
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
  `,renderFrag:`
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
  `};class h{constructor(e,t={}){this.canvas=e,this.particleCount=t.particleCount||1e4,this.typeCount=t.typeCount||6,this.friction=t.friction||.02,this.interactionRadius=t.interactionRadius||80,this.forces=t.forces||null,this.paused=!1,this.simWidth=t.simWidth||600,this.simHeight=t.simHeight||600,this.onFrame=t.onFrame||null,this.device=null,this.context=null,this.particleBuffer=null,this.sortedBuffer=null,this.binSizesBuffer=null,this.binOffsetsBuffer=null,this.binCurBuffer=null,this.forcesBuffer=null,this.simOptionsBuffer=null,this.cameraBuffer=null,this.pipeline={},this.bindGroups={},this.frameCount=0,this.lastTime=performance.now(),this.fps=0}async init(){if(!navigator.gpu)throw new Error("WebGPU not supported");const e=await navigator.gpu.requestAdapter();if(!e)throw new Error("No WebGPU adapter found");if(this.device=await e.requestDevice(),this.context=this.canvas.getContext("webgpu"),!this.context)throw new Error("Failed to get WebGPU context");const t=navigator.gpu.getPreferredCanvasFormat();return this.context.configure({device:this.device,format:t,alphaMode:"premultiplied"}),this.canvasFormat=t,this._createBuffers(),this._createPipelines(),this._initParticles(),this}_createBuffers(){const e=this.device,i=this.particleCount*8*4;this.particleBuffer=e.createBuffer({size:i,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.sortedBuffer=e.createBuffer({size:i,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});const n=(this._getBinCount()+1)*4;this.binSizesBuffer=e.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.binOffsetsBuffer=e.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.binCurBuffer=e.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});const a=this.typeCount*this.typeCount*2;this.forcesBuffer=e.createBuffer({size:a*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.simOptionsBuffer=e.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.cameraBuffer=e.createBuffer({size:128,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})}_getBinCount(){const e=this.interactionRadius,t=Math.ceil(this.simWidth/e)+1,i=Math.ceil(this.simHeight/e)+1;return t*i}_createPipelines(){const e=this.device,t=e.createShaderModule({code:f.binCount}),i=e.createShaderModule({code:f.prefixSum}),s=e.createShaderModule({code:f.sortParticles}),n=e.createShaderModule({code:f.computeForces}),a=e.createShaderModule({code:f.advanceParticles}),o=e.createShaderModule({code:f.renderVert}),u=e.createShaderModule({code:f.renderFrag}),r=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]});this.pipeline.binCount=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:[e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}]}),r]}),compute:{module:t,entryPoint:"main"}}),this.pipeline.prefixSum=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:[e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]})]}),compute:{module:i,entryPoint:"main"}}),this.pipeline.sort=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:[e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}]}),r]}),compute:{module:s,entryPoint:"main"}}),this.pipeline.forces=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:[e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}}]}),r]}),compute:{module:n,entryPoint:"main"}}),this.pipeline.advance=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:[e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}]}),r]}),compute:{module:a,entryPoint:"main"}}),this.pipeline.render=e.createRenderPipeline({layout:e.createPipelineLayout({bindGroupLayouts:[e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:"read-only-storage"}}]}),e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:"uniform"}}]})]}),vertex:{module:o,entryPoint:"vsMain"},fragment:{module:u,entryPoint:"fsMain",targets:[{format:this.canvasFormat,blend:{color:{srcFactor:"src-alpha",dstFactor:"one",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one",operation:"add"}}}]},primitive:{topology:"triangle-list"}})}_initParticles(){const e=this.particleCount,t=new Float32Array(e*8);this.simWidth*.5,this.simHeight*.5;for(let i=0;i<e;i++){const s=i*8;t[s]=(Math.random()-.5)*this.simWidth*.8,t[s+1]=(Math.random()-.5)*this.simHeight*.8,t[s+2]=0,t[s+3]=0,t[s+4]=Math.floor(Math.random()*this.typeCount)}this.device.queue.writeBuffer(this.particleBuffer,0,t),this.device.queue.writeBuffer(this.sortedBuffer,0,t)}setForces(e){this.forces=e;const t=new Float32Array(this.typeCount*this.typeCount*2);for(let i=0;i<this.typeCount;i++)for(let s=0;s<this.typeCount;s++){const n=(i*this.typeCount+s)*2;t[n]=e[i][s],t[n+1]=Math.abs(e[i][s])*.5}this.device.queue.writeBuffer(this.forcesBuffer,0,t)}_updateSimOptions(){const e=this.interactionRadius,t=Math.ceil(this.simWidth/e)+1,i=Math.ceil(this.simHeight/e)+1,s=new Float32Array([this.simWidth,this.simHeight,e,t,i,this.typeCount,1,this.friction]);this.device.queue.writeBuffer(this.simOptionsBuffer,0,s)}_updateCamera(e){this.device.queue.writeBuffer(this.cameraBuffer,0,new Float32Array(e))}_workgroupCount(e){return Math.ceil(e/256)}step(){if(this.paused)return;const e=this.device,t=this.particleCount,i=this._getBinCount(),s=this.interactionRadius;Math.ceil(this.simWidth/s)+1,Math.ceil(this.simHeight/s)+1,this._updateSimOptions();const n=e.createCommandEncoder();e.queue.writeBuffer(this.binSizesBuffer,0,new Uint32Array(i+1)),e.queue.writeBuffer(this.binCurBuffer,0,new Uint32Array(i+1));{const o=e.createBindGroup({layout:this.pipeline.binCount.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.particleBuffer}},{binding:1,resource:{buffer:this.binSizesBuffer}}]}),u=e.createBindGroup({layout:this.pipeline.binCount.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:this.simOptionsBuffer}}]}),r=n.beginComputePass();r.setPipeline(this.pipeline.binCount),r.setBindGroup(0,o),r.setBindGroup(1,u),r.dispatchWorkgroups(this._workgroupCount(t)),r.end()}const a=Math.ceil(Math.ceil(Math.log2(i+1))/2)*2;for(let o=0;o<a;o++){const u=new Uint32Array([1<<o]);e.queue.writeBuffer(this.simOptionsBuffer,0,u);const r=o%2===0?this.binSizesBuffer:this.binOffsetsBuffer,d=o%2===0?this.binOffsetsBuffer:this.binSizesBuffer,c=e.createBindGroup({layout:this.pipeline.prefixSum.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:r}},{binding:1,resource:{buffer:d}},{binding:2,resource:{buffer:this.simOptionsBuffer}}]}),p=n.beginComputePass();p.setPipeline(this.pipeline.prefixSum),p.setBindGroup(0,c),p.dispatchWorkgroups(this._workgroupCount(i+1)),p.end()}a%2===0&&n.copyBufferToBuffer(this.binSizesBuffer,0,this.binOffsetsBuffer,0,(i+1)*4),e.queue.writeBuffer(this.binCurBuffer,0,new Uint32Array(i+1));{const o=e.createBindGroup({layout:this.pipeline.sort.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.particleBuffer}},{binding:1,resource:{buffer:this.sortedBuffer}},{binding:2,resource:{buffer:this.binOffsetsBuffer}},{binding:3,resource:{buffer:this.binCurBuffer}}]}),u=e.createBindGroup({layout:this.pipeline.sort.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:this.simOptionsBuffer}}]}),r=n.beginComputePass();r.setPipeline(this.pipeline.sort),r.setBindGroup(0,o),r.setBindGroup(1,u),r.dispatchWorkgroups(this._workgroupCount(t)),r.end()}{const o=e.createBindGroup({layout:this.pipeline.forces.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.sortedBuffer}},{binding:1,resource:{buffer:this.binOffsetsBuffer}},{binding:2,resource:{buffer:this.forcesBuffer}}]}),u=e.createBindGroup({layout:this.pipeline.forces.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:this.simOptionsBuffer}}]}),r=n.beginComputePass();r.setPipeline(this.pipeline.forces),r.setBindGroup(0,o),r.setBindGroup(1,u),r.dispatchWorkgroups(this._workgroupCount(t)),r.end()}{const o=e.createBindGroup({layout:this.pipeline.advance.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.sortedBuffer}}]}),u=e.createBindGroup({layout:this.pipeline.advance.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:this.simOptionsBuffer}}]}),r=n.beginComputePass();r.setPipeline(this.pipeline.advance),r.setBindGroup(0,o),r.setBindGroup(1,u),r.dispatchWorkgroups(this._workgroupCount(t)),r.end()}e.queue.submit([n.finish()])}render(e){this._updateCamera(e);const t=this.context.getCurrentTexture().createView(),i=this.device.createCommandEncoder(),s=this.device.createBindGroup({layout:this.pipeline.render.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.sortedBuffer}}]}),n=this.device.createBindGroup({layout:this.pipeline.render.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:this.cameraBuffer}}]}),a=i.beginRenderPass({colorAttachments:[{view:t,loadOp:"clear",storeOp:"store",clearValue:{r:.02,g:.02,b:.04,a:1}}]});a.setPipeline(this.pipeline.render),a.setBindGroup(0,s),a.setBindGroup(1,n),a.draw(this.particleCount*6),a.end(),this.device.queue.submit([i.finish()]),this.frameCount++;const o=performance.now();o-this.lastTime>=1e3&&(this.fps=this.frameCount,this.frameCount=0,this.lastTime=o)}async readParticles(){const e=this.particleCount,t=this.device.createBuffer({size:e*8*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),i=this.device.createCommandEncoder();i.copyBufferToBuffer(this.sortedBuffer,0,t,0,e*8*4),this.device.queue.submit([i.finish()]),await t.mapAsync(GPUMapMode.READ);const s=new Float32Array(t.getMappedRange().slice(0));return t.unmap(),t.destroy(),s}injectParticles(e){this.device.queue.writeBuffer(this.particleBuffer,0,e),this.device.queue.writeBuffer(this.sortedBuffer,0,e)}reset(){this._initParticles()}destroy(){var e,t,i,s,n,a,o,u,r;(e=this.particleBuffer)==null||e.destroy(),(t=this.sortedBuffer)==null||t.destroy(),(i=this.binSizesBuffer)==null||i.destroy(),(s=this.binOffsetsBuffer)==null||s.destroy(),(n=this.binCurBuffer)==null||n.destroy(),(a=this.forcesBuffer)==null||a.destroy(),(o=this.simOptionsBuffer)==null||o.destroy(),(u=this.cameraBuffer)==null||u.destroy(),(r=this.device)==null||r.destroy()}}export{h as ParticleLifeEngine};
