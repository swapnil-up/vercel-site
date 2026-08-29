# 3D Particle Life Simulator — Plan

## What it is
A new tool page at `/tools/particle-life` — a browser-based 3D artificial life simulation where particles form emergent swarms, filaments, and organisms based on configurable attraction/repulsion rules. All computation runs on the GPU via WebGPU compute shaders, with a Three.js InstancedMesh fallback for browsers without WebGPU support.

## The Algorithm (Particle Life)
- Particles are divided into color types (e.g., 6 types)
- A **force matrix** (N×N grid) defines how each type attracts or repels each other type
- Forces are asymmetric: type A can attract type B while type B repels type A — this creates emergent "life-like" behavior
- Two force components per pair: **collision** (close-range repulsion, always) + **interaction** (far-range attract/repel)
- Force falloff is linear with distance, reaching zero at the interaction radius
- Friction dampens velocities to prevent energy runaway
- Spatial hashing (binning) reduces force computation from O(N²) to O(N) per frame

## Architecture

**Location:** `resources/js/Pages/Tools/ParticleLife.vue` + route at `/tools/particle-life`

**Tech stack:**
- **Primary renderer:** WebGPU compute shaders (WGSL) for physics + rendering
- **Fallback:** Three.js `InstancedMesh` with CPU-side simulation for browsers without WebGPU
- **3D:** Camera with orbit controls (mouse drag to rotate, scroll to zoom)
- **UI:** Minimal overlay panel (collapsible) with controls

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `resources/js/Pages/Tools/ParticleLife.vue` | Main Vue page, orchestrates everything |
| `resources/js/Pages/Tools/ParticleLife/engine.js` | Core simulation engine (WebGPU path) |
| `resources/js/Pages/Tools/ParticleLife/fallback.js` | Three.js CPU fallback engine |
| `resources/js/Pages/Tools/ParticleLife/presets.js` | Saved configurations (Cells, Snakes, Orbiting, etc.) |
| `routes/web.php` | Add `/tools/particle-life` route |

## Features (MVP scope)

1. **Core simulation engine** — WebGPU compute shaders for force computation, spatial hashing, particle advancement. Renders particles as instanced points/sprites.

2. **3D mode** — Particles exist in 3D space. OrbitControls for camera (rotate, zoom, pan). Particles bounded in a 3D box.

3. **Force matrix editor** — Interactive grid UI. Rows/columns = particle types. Drag up/down on a cell to set attract (green) / repel (red) strength.

4. **Presets** — Pre-configured force matrices:
   - Cells (particles form tight clusters)
   - Snakes & Chasers (predator-prey dynamics)
   - Orbiting Clusters (circular motion)
   - Webs (interconnected filaments)
   - Territorial (each type claims a zone)
   - Random Lifeform (random matrix)

5. **Particle trails** — Fading trail effect. Store last N positions, render as line segments with decreasing opacity.

6. **Audio reactivity** — Microphone input via Web Audio API. Split into low/mid/high frequency bands. Map bands to simulation parameters.

7. **Shareable URLs** — Encode entire simulation state into URL hash.

8. **UI Controls panel** (collapsible sidebar):
   - Particle count slider (1k — 50k)
   - Number of types (2 — 8)
   - Interaction radius
   - Force strength
   - Friction
   - Trail length / toggle
   - Color palette selector
   - Pause/Play, Randomize, Reset
   - Share button
   - Preset dropdown

## WebGPU Shader Pipeline

```
1. Bin particles (compute)       → spatial hash
2. Prefix sum (compute)          → bin offsets
3. Sort particles (compute)      → reorder into bins
4. Compute forces (compute)      → O(N) neighbor lookup
5. Advance particles (compute)   → integrate velocity + boundary
6. Render particles (vertex+fragment) → instanced circles with glow
7. [Optional] Render trails (vertex+fragment) → line segments
```

## WebGL Fallback

When `navigator.gpu` is unavailable:
- Use Three.js `InstancedMesh` for rendering
- Run physics on CPU with spatial hash
- Cap at ~10k particles
- Same UI, same presets

## Key Reference Implementations
- kajukabla/3d-life-sim — TypeScript/React/WebGPU, MIT
- lisyarus blog — technical deep-dive on algorithm + WGSL
- hammyasf/particle-life — single HTML file, clean WebGPU
- hzy/ParticleLife — minimal single-file WebGPU
