<template>
  <div class="flex flex-col h-screen bg-stone-100 font-mono overflow-hidden">

    <!-- Header -->
    <header class="flex items-baseline gap-6 px-6 py-3 border-b-2 border-stone-800 bg-stone-100 shrink-0">
      <h1 class="text-sm font-bold tracking-tight" style="font-family: 'Space Mono', monospace">
        sketch <span class="text-red-700">→</span> digital
      </h1>
      <p class="text-xs text-stone-400 italic hidden sm:block">
        upload · bleach · crop · annotate · export
      </p>
    </header>

    <div class="flex flex-1 min-h-0">

      <!-- Sidebar -->
      <aside class="w-56 shrink-0 border-r-2 border-stone-800 bg-stone-200 flex flex-col gap-5 p-4 overflow-y-auto">

        <!-- 01 Image -->
        <section>
          <h3 class="sidebar-heading">01 — Image</h3>
          <button
            class="w-full border-2 border-dashed border-stone-400 hover:border-red-700 hover:bg-red-50 text-stone-400 hover:text-red-700 text-xs py-4 px-2 text-center leading-relaxed transition-colors cursor-pointer"
            :class="{ 'border-red-700 bg-red-50 text-red-700': isDragging }"
            @click="fileInputRef?.click()"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="onDrop"
          >
            <span class="block text-2xl mb-1 opacity-50">⌃</span>
            drop sketch here<br>or click to upload
          </button>
          <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileChange" />
        </section>

        <!-- 02 Bleach -->
        <section>
          <h3 class="sidebar-heading">02 — Bleach</h3>
          <div class="flex justify-between items-center text-xs mb-1">
            <span>Threshold</span>
            <span class="text-red-700 font-bold" style="font-family: 'Space Mono', monospace">{{ threshold }}</span>
          </div>
          <input
            v-model.number="threshold"
            type="range" min="0" max="255"
            :disabled="!hasImage"
            class="w-full accent-red-700 cursor-pointer disabled:opacity-30 mb-3"
            @input="applyFilter"
          />
          <div class="flex items-center justify-between text-xs mb-1">
            <span>Invert</span>
            <button
              :disabled="!hasImage"
              class="w-8 h-4 rounded-full transition-colors relative disabled:opacity-30"
              :class="invert ? 'bg-red-700' : 'bg-stone-400'"
              @click="invert = !invert; applyFilter()"
            >
              <span
                class="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all"
                :class="invert ? 'left-4' : 'left-0.5'"
              />
            </button>
          </div>
          <p class="text-[10px] text-stone-400 italic mt-1">Use invert for white ink on dark paper</p>
        </section>

        <!-- 03 Crop -->
        <section>
          <h3 class="sidebar-heading">03 — Crop</h3>

          <button
            :disabled="!hasImage || cropMode"
            class="w-full text-left px-3 py-2 text-xs font-bold tracking-wide border-2 border-stone-800 bg-stone-100 hover:bg-stone-800 hover:text-stone-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed mb-2"
            style="font-family: 'Space Mono', monospace"
            @click="enterCropMode"
          >
            ⌗ Set Crop Region
          </button>

          <template v-if="cropMode">
            <div class="text-[10px] leading-relaxed p-2 border border-red-700 text-red-700 bg-red-50 italic mb-2">
              Drag on canvas to select crop region.
            </div>
            <div class="flex gap-1">
              <button
                class="flex-1 px-2 py-1.5 text-xs font-bold border-2 border-green-700 bg-green-700 text-white hover:bg-green-800 transition-colors"
                style="font-family: 'Space Mono', monospace"
                @click="confirmCrop"
              >✓ Confirm</button>
              <button
                class="flex-1 px-2 py-1.5 text-xs font-bold border-2 border-stone-400 hover:border-stone-800 transition-colors"
                style="font-family: 'Space Mono', monospace"
                @click="cancelCrop"
              >✕ Cancel</button>
            </div>
          </template>

          <template v-else-if="cropRect">
            <div class="text-[10px] p-2 border border-stone-400 text-stone-600 mb-2 leading-relaxed">
              Crop active:
              <span class="text-red-700 font-bold" style="font-family: 'Space Mono', monospace">
                {{ cropRect.w }}×{{ cropRect.h }}
              </span>
              px
            </div>
            <button
              class="w-full text-left px-3 py-1.5 text-xs border-2 border-stone-400 hover:border-stone-800 transition-colors"
              style="font-family: 'Space Mono', monospace"
              @click="clearCrop"
            >✕ Clear Crop</button>
          </template>

          <template v-else>
            <p class="text-[10px] text-stone-400 italic">No crop set — full image will export.</p>
          </template>
        </section>

        <!-- 04 Zoom -->
        <section>
          <h3 class="sidebar-heading">04 — Zoom</h3>
          <div class="flex justify-between items-center text-xs mb-1">
            <span>View zoom</span>
            <span class="text-red-700 font-bold" style="font-family: 'Space Mono', monospace">{{ Math.round(zoom * 100) }}%</span>
          </div>
          <input
            v-model.number="zoom"
            type="range" min="0.25" max="3" step="0.05"
            :disabled="!hasImage"
            class="w-full accent-red-700 cursor-pointer disabled:opacity-30 mb-1"
          />
          <button
            :disabled="!hasImage"
            class="text-[10px] text-stone-400 hover:text-stone-700 disabled:opacity-30 transition-colors underline underline-offset-2"
            @click="zoom = 1"
          >reset to 100%</button>
          <p class="text-[10px] text-stone-400 italic mt-1">Display only — doesn't affect export.</p>
        </section>

        <!-- 05 Annotate -->
        <section>
          <h3 class="sidebar-heading">05 — Annotate</h3>
          <button
            :disabled="!hasImage || cropMode"
            class="w-full text-left px-3 py-2 text-xs font-bold tracking-wide border-2 border-stone-800 bg-stone-100 hover:bg-stone-800 hover:text-stone-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed mb-2"
            style="font-family: 'Space Mono', monospace"
            @click="toggleTextMode"
          >
            {{ textMode ? '✕ Cancel' : '+ Add Label' }}
          </button>
          <div
            class="text-[10px] leading-relaxed p-2 border italic transition-colors"
            :class="textMode ? 'border-red-700 text-red-700 bg-red-50' : 'border-stone-300 text-stone-400'"
          >
            {{ textMode ? 'Click the canvas to place a label.' : 'Click "Add Label" then click the canvas.' }}
          </div>

          <div class="mt-3 space-y-2">
            <div>
              <div class="flex justify-between items-center text-xs mb-1">
                <span>Font size</span>
                <span class="text-red-700 font-bold" style="font-family: 'Space Mono', monospace">{{ labelFontSize }}px</span>
              </div>
              <input v-model.number="labelFontSize" type="range" min="8" max="48" class="w-full accent-red-700 cursor-pointer" />
            </div>
            <div>
              <p class="text-xs mb-1">Color</p>
              <input v-model="labelColor" type="color" class="w-full h-7 border border-stone-300 cursor-pointer p-px" />
            </div>
            <div>
              <p class="text-xs mb-1">Style</p>
              <div class="flex gap-1">
                <button
                  class="px-2 py-1 text-xs border transition-colors font-bold"
                  :class="labelBold ? 'bg-stone-800 text-stone-100 border-stone-800' : 'border-stone-300 hover:border-stone-800'"
                  @click="labelBold = !labelBold"
                >B</button>
                <button
                  class="px-2 py-1 text-xs border transition-colors italic"
                  :class="labelItalic ? 'bg-stone-800 text-stone-100 border-stone-800' : 'border-stone-300 hover:border-stone-800'"
                  @click="labelItalic = !labelItalic"
                >I</button>
              </div>
            </div>
            <div>
              <p class="text-xs mb-1">Font</p>
              <select v-model="labelFont" class="w-full text-xs border border-stone-300 bg-stone-100 px-2 py-1 cursor-pointer appearance-none">
                <option value="'Space Mono', monospace">Space Mono</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Impact, sans-serif">Impact</option>
              </select>
            </div>
          </div>
        </section>

        <!-- 06 Export -->
        <section>
          <h3 class="sidebar-heading">06 — Export</h3>
          <button
            :disabled="!hasImage || cropMode"
            class="w-full text-left px-3 py-2 text-xs font-bold tracking-wide border-2 border-red-700 bg-red-700 text-stone-100 hover:bg-red-800 hover:border-red-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style="font-family: 'Space Mono', monospace"
            @click="exportPNG"
          >
            ↓ Save as PNG
          </button>
          <p class="text-[10px] text-stone-400 italic mt-2">
            Exports {{ cropRect ? 'cropped region' : 'full image' }} + labels at full original resolution.
          </p>
        </section>

      </aside>

      <!-- Canvas Area -->
      <main
        class="flex-1 overflow-auto p-8"
        style="background-color: #aaa; background-image: linear-gradient(45deg, #999 25%, transparent 25%), linear-gradient(-45deg, #999 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #999 75%), linear-gradient(-45deg, transparent 75%, #999 75%); background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0px;"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="onDrop"
      >
        <!-- Empty state -->
        <div v-if="!hasImage" class="flex flex-col items-center justify-center h-full gap-2 text-stone-500 italic text-sm pointer-events-none">
          <span class="text-5xl opacity-30">✏</span>
          <span>Upload a sketch to get started</span>
        </div>

        <!--
          Zoom wrapper: scale() with transform-origin top-left so the canvas
          grows down/right and doesn't shift. The outer div gets the natural
          (pre-zoom) dimensions so the scrollable main can size correctly.
        -->
        <div
          v-show="hasImage"
          :style="{
            display: 'inline-block',
            transformOrigin: 'top left',
            transform: `scale(${zoom})`,
          }"
        >
          <!-- Canvas + overlays container -->
          <div
            ref="containerRef"
            class="relative inline-block shadow-[4px_4px_0_rgba(0,0,0,0.3),8px_8px_0_rgba(0,0,0,0.1)]"
            :class="cropMode ? 'cursor-crosshair' : textMode ? 'cursor-text' : 'cursor-default'"
            @mousedown="onContainerMousedown"
            @click="onContainerClick"
          >
            <canvas ref="canvasRef" class="block" />

            <!-- ── Crop selection overlay ── -->
            <!-- Live drag selection (in crop mode) -->
            <template v-if="cropMode && cropSelection && cropSelection.w > 0 && cropSelection.h > 0">
              <div class="absolute inset-0 pointer-events-none">
                <div class="absolute bg-black/40 left-0 right-0 top-0"
                  :style="{ height: cropSelection.y + 'px' }" />
                <div class="absolute bg-black/40 left-0 right-0"
                  :style="{ top: (cropSelection.y + cropSelection.h) + 'px', bottom: 0 }" />
                <div class="absolute bg-black/40"
                  :style="{ top: cropSelection.y + 'px', height: cropSelection.h + 'px', left: 0, width: cropSelection.x + 'px' }" />
                <div class="absolute bg-black/40"
                  :style="{ top: cropSelection.y + 'px', height: cropSelection.h + 'px', left: (cropSelection.x + cropSelection.w) + 'px', right: 0 }" />
                <!-- Selection border + corner handles -->
                <div class="absolute border-2 border-white box-border"
                  :style="{ left: cropSelection.x + 'px', top: cropSelection.y + 'px', width: cropSelection.w + 'px', height: cropSelection.h + 'px' }">
                  <div class="absolute -top-1 -left-1 w-2 h-2 bg-white" />
                  <div class="absolute -top-1 -right-1 w-2 h-2 bg-white" />
                  <div class="absolute -bottom-1 -left-1 w-2 h-2 bg-white" />
                  <div class="absolute -bottom-1 -right-1 w-2 h-2 bg-white" />
                </div>
              </div>
            </template>

            <!-- Confirmed crop indicator (shown outside crop mode) -->
            <template v-if="!cropMode && cropRect">
              <div class="absolute inset-0 pointer-events-none">
                <div class="absolute bg-black/30 left-0 right-0 top-0"
                  :style="{ height: cropRect.y + 'px' }" />
                <div class="absolute bg-black/30 left-0 right-0"
                  :style="{ top: (cropRect.y + cropRect.h) + 'px', bottom: 0 }" />
                <div class="absolute bg-black/30"
                  :style="{ top: cropRect.y + 'px', height: cropRect.h + 'px', left: 0, width: cropRect.x + 'px' }" />
                <div class="absolute bg-black/30"
                  :style="{ top: cropRect.y + 'px', height: cropRect.h + 'px', left: (cropRect.x + cropRect.w) + 'px', right: 0 }" />
                <div class="absolute border border-dashed border-red-400 box-border"
                  :style="{ left: cropRect.x + 'px', top: cropRect.y + 'px', width: cropRect.w + 'px', height: cropRect.h + 'px' }" />
              </div>
            </template>

            <!-- ── Text labels ── -->
            <div
              v-for="label in labels"
              :key="label.id"
              class="absolute select-none border border-dashed border-transparent hover:border-red-500 px-1"
              :class="{ 'border-red-500 !border-solid': selectedLabelId === label.id }"
              :style="{
                left: label.x + 'px',
                top: label.y + 'px',
                fontSize: label.fontSize + 'px',
                color: label.color,
                fontFamily: label.font,
                fontWeight: label.bold ? '700' : '400',
                fontStyle: label.italic ? 'italic' : 'normal',
                cursor: cropMode ? 'crosshair' : 'move',
                lineHeight: '1.3',
                pointerEvents: cropMode ? 'none' : 'auto',
              }"
              @mousedown.stop="startDrag($event, label)"
              @touchstart.passive="startDragTouch($event, label)"
            >
              <button
                v-if="selectedLabelId === label.id"
                class="absolute -top-2 -right-2 w-4 h-4 bg-red-700 text-white rounded-full text-[10px] flex items-center justify-center leading-none z-10"
                @click.stop="deleteLabel(label.id)"
              >×</button>
              <input
                :ref="el => { if (el) inputRefs[label.id] = el }"
                type="text"
                v-model="label.text"
                class="bg-transparent border-none outline-none font-[inherit] text-[inherit] cursor-text min-w-[40px]"
                :style="{
                  width: Math.max(label.text.length, 1) * 0.6 + 'em',
                  fontSize: 'inherit', color: 'inherit',
                  fontFamily: 'inherit', fontWeight: 'inherit', fontStyle: 'inherit',
                }"
                spellcheck="false"
                @mousedown.stop
                @click.stop="selectLabel(label.id)"
              />
            </div>

          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, onUnmounted } from 'vue'

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const fileInputRef = ref(null)
const canvasRef    = ref(null)
const containerRef = ref(null)
const inputRefs    = reactive({})

// ─── Image state ──────────────────────────────────────────────────────────────
const hasImage  = ref(false)
const isDragging = ref(false)
let originalImage = null
// Ratio of display canvas px to original image px (≤1 because we clamp max display size)
let displayScale = 1

// ─── Filter state ─────────────────────────────────────────────────────────────
const threshold = ref(128)
const invert    = ref(false)

// ─── Zoom state ───────────────────────────────────────────────────────────────
// zoom is a CSS transform scale — purely visual, no effect on canvas coords
const zoom = ref(1)

// ─── Crop state ───────────────────────────────────────────────────────────────
const cropMode      = ref(false)
// cropRect: confirmed crop region in display-canvas px space { x, y, w, h }
const cropRect      = ref(null)
// cropSelection: live drag rect while in crop mode, display-canvas px space
const cropSelection = ref(null)
let cropDragState   = null

// ─── Label state ──────────────────────────────────────────────────────────────
const labels          = reactive([])
const selectedLabelId = ref(null)
const textMode        = ref(false)
let labelCounter      = 0

// Label style defaults
const labelFontSize = ref(14)
const labelColor    = ref('#000000')
const labelBold     = ref(false)
const labelItalic   = ref(false)
const labelFont     = ref("'Space Mono', monospace")

// ─── Image loading ────────────────────────────────────────────────────────────
function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) loadFile(file)
}

function onDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) loadFile(file)
}

function loadFile(file) {
  const reader = new FileReader()
  reader.onload = ev => {
    const img = new Image()
    img.onload = () => {
      originalImage = img
      // Clamp display size; record the scale ratio for coordinate conversion
      const maxW = 1200, maxH = 900
      displayScale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight)
      const w = Math.round(img.naturalWidth * displayScale)
      const h = Math.round(img.naturalHeight * displayScale)
      canvasRef.value.width  = w
      canvasRef.value.height = h
      hasImage.value = true
      labels.length  = 0
      selectedLabelId.value = null
      cropRect.value      = null
      cropMode.value      = false
      cropSelection.value = null
      zoom.value          = 1
      applyFilter()
    }
    img.src = ev.target.result
  }
  reader.readAsDataURL(file)
}

// ─── Threshold filter ────────────────────────────────────────────────────────
function applyFilter() {
  if (!originalImage || !canvasRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  const t   = threshold.value
  const inv = invert.value
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const val = inv ? (lum < t ? 255 : 0) : (lum < t ? 0 : 255)
    data[i] = data[i + 1] = data[i + 2] = val
    data[i + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
}

// ─── Crop ─────────────────────────────────────────────────────────────────────
function enterCropMode() {
  cropMode.value = true
  textMode.value = false
  deselectAll()
  // Pre-fill with existing crop or full canvas
  const c = canvasRef.value
  cropSelection.value = cropRect.value
    ? { ...cropRect.value }
    : { x: 0, y: 0, w: c.width, h: c.height }
}

function confirmCrop() {
  const sel = cropSelection.value
  if (sel && sel.w > 2 && sel.h > 2) {
    cropRect.value = { ...sel }
  }
  cropMode.value      = false
  cropSelection.value = null
}

function cancelCrop() {
  cropMode.value      = false
  cropSelection.value = null
}

function clearCrop() {
  cropRect.value = null
}

// Mouse drag to draw crop rectangle on the canvas.
// Key detail: containerRef is inside the zoom scale() wrapper, so
// getBoundingClientRect() returns *screen* pixels of the scaled element.
// We divide by zoom to get back to canvas-space px.
function startCropDrag(e) {
  if (!cropMode.value || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const z = zoom.value
  const x = Math.max(0, (e.clientX - rect.left) / z)
  const y = Math.max(0, (e.clientY - rect.top)  / z)
  cropDragState = { startX: x, startY: y }
  cropSelection.value = { x, y, w: 0, h: 0 }
  window.addEventListener('mousemove', onCropMove)
  window.addEventListener('mouseup', onCropUp)
}

function onCropMove(e) {
  if (!cropDragState || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const z = zoom.value
  const canvas = canvasRef.value
  const cx = Math.max(0, Math.min(canvas.width,  (e.clientX - rect.left) / z))
  const cy = Math.max(0, Math.min(canvas.height, (e.clientY - rect.top)  / z))
  const { startX, startY } = cropDragState
  cropSelection.value = {
    x: Math.round(Math.min(cx, startX)),
    y: Math.round(Math.min(cy, startY)),
    w: Math.round(Math.abs(cx - startX)),
    h: Math.round(Math.abs(cy - startY)),
  }
}

function onCropUp() {
  cropDragState = null
  window.removeEventListener('mousemove', onCropMove)
  window.removeEventListener('mouseup', onCropUp)
}

// ─── Unified container pointer handler ───────────────────────────────────────
function onContainerMousedown(e) {
  if (cropMode.value) {
    startCropDrag(e)
    return
  }
  // Bare canvas click → deselect labels
  if (e.target === canvasRef.value || e.target === containerRef.value) {
    deselectAll()
  }
}

function onContainerClick(e) {
  if (cropMode.value) return
  if (!textMode.value || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  // Divide by zoom: click coords are screen px, labels live in canvas px
  const x = (e.clientX - rect.left) / zoom.value
  const y = (e.clientY - rect.top)  / zoom.value
  spawnLabel(x, y)
}

// ─── Text labels ─────────────────────────────────────────────────────────────
function toggleTextMode() {
  textMode.value = !textMode.value
  if (!textMode.value) deselectAll()
}

function spawnLabel(x, y) {
  const id = ++labelCounter
  labels.push({
    id, x, y,
    text: 'label',
    fontSize: labelFontSize.value,
    color:    labelColor.value,
    bold:     labelBold.value,
    italic:   labelItalic.value,
    font:     labelFont.value,
  })
  textMode.value        = false
  selectedLabelId.value = id
  nextTick(() => {
    const el = inputRefs[id]
    if (el) { el.focus(); el.select() }
  })
}

function selectLabel(id) { selectedLabelId.value = id }
function deselectAll()   { selectedLabelId.value = null }

function deleteLabel(id) {
  const idx = labels.findIndex(l => l.id === id)
  if (idx !== -1) labels.splice(idx, 1)
  if (selectedLabelId.value === id) selectedLabelId.value = null
}

// ─── Label dragging ───────────────────────────────────────────────────────────
let dragState = null

function startDrag(e, label) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return
  e.preventDefault()
  selectLabel(label.id)
  dragState = {
    label,
    startX: e.clientX, startY: e.clientY,
    origX: label.x,    origY: label.y,
  }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

function onDragMove(e) {
  if (!dragState) return
  const { label, startX, startY, origX, origY } = dragState
  // Screen delta ÷ zoom = canvas-space delta
  label.x = origX + (e.clientX - startX) / zoom.value
  label.y = origY + (e.clientY - startY) / zoom.value
}

function onDragEnd() {
  dragState = null
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
}

function startDragTouch(e, label) {
  const t = e.touches[0]
  dragState = {
    label,
    startX: t.clientX, startY: t.clientY,
    origX: label.x,    origY: label.y,
  }
  window.addEventListener('touchmove', onTouchMove, { passive: true })
  window.addEventListener('touchend', onTouchEnd)
}

function onTouchMove(e) {
  if (!dragState) return
  const t = e.touches[0]
  dragState.label.x = dragState.origX + (t.clientX - dragState.startX) / zoom.value
  dragState.label.y = dragState.origY + (t.clientY - dragState.startY) / zoom.value
}

function onTouchEnd() {
  dragState = null
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
}

// ─── Export ───────────────────────────────────────────────────────────────────
// Non-destructive: re-draws from originalImage at full native resolution,
// applies the threshold filter, then slices out the crop region (if any).
// Labels are repositioned from display-canvas px → original image px.
function exportPNG() {
  if (!originalImage) return

  const cr = cropRect.value

  // Source rectangle in original image px space
  const srcX = cr ? Math.round(cr.x / displayScale) : 0
  const srcY = cr ? Math.round(cr.y / displayScale) : 0
  const srcW = cr ? Math.round(cr.w / displayScale) : originalImage.naturalWidth
  const srcH = cr ? Math.round(cr.h / displayScale) : originalImage.naturalHeight

  // 1. Render full-res filtered image onto a temp canvas
  const tmp = document.createElement('canvas')
  tmp.width  = originalImage.naturalWidth
  tmp.height = originalImage.naturalHeight
  const tmpCtx = tmp.getContext('2d', { willReadFrequently: true })
  tmpCtx.drawImage(originalImage, 0, 0)
  const imageData = tmpCtx.getImageData(0, 0, tmp.width, tmp.height)
  const data = imageData.data
  const t   = threshold.value
  const inv = invert.value
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const val = inv ? (lum < t ? 255 : 0) : (lum < t ? 0 : 255)
    data[i] = data[i + 1] = data[i + 2] = val
    data[i + 3] = 255
  }
  tmpCtx.putImageData(imageData, 0, 0)

  // 2. Create export canvas sized to the (possibly cropped) output
  const exp = document.createElement('canvas')
  exp.width  = srcW
  exp.height = srcH
  const expCtx = exp.getContext('2d')

  // Blit cropped region from full-res filtered canvas
  expCtx.drawImage(tmp, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH)

  // 3. Draw labels — convert from display-canvas coords to export coords
  for (const label of labels) {
    // display-canvas px → original image px → offset by crop origin
    const lx = (label.x / displayScale) - srcX
    const ly = (label.y / displayScale) - srcY
    // Scale font size proportionally to native resolution
    const fs = Math.round(label.fontSize / displayScale)
    const fw = label.bold   ? '700'    : '400'
    const fi = label.italic ? 'italic' : 'normal'
    expCtx.font          = `${fi} ${fw} ${fs}px ${label.font}`
    expCtx.fillStyle     = label.color
    expCtx.textBaseline  = 'top'
    expCtx.fillText(label.text, lx + 4, ly + 2)
  }

  // 4. Trigger download
  const link = document.createElement('a')
  link.download = 'sketch-digital.png'
  link.href = exp.toDataURL('image/png')
  link.click()
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
function onKeyDown(e) {
  if (e.key === 'Escape') {
    if (cropMode.value) { cancelCrop(); return }
    textMode.value = false
    deselectAll()
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLabelId.value) {
    if (document.activeElement?.tagName === 'INPUT') return
    deleteLabel(selectedLabelId.value)
  }
}

onMounted(()   => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
</script>

<style scoped>
.sidebar-heading {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #a8a29e;
  border-bottom: 1px solid #d6d3d1;
  padding-bottom: 4px;
  margin-bottom: 12px;
}
</style>