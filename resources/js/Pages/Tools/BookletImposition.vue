<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib'
import { computeImposition, ImpositionError } from '../../Utils/bookletImposition.js'

const STORAGE_KEY = 'site_booklet-imposition-data'

// State
const pdfFile = ref(null)
const pdfPageCount = ref(0)
const mode = ref('2up')
const placements = ref([])
const error = ref('')
const toasts = ref([])
const isProcessing = ref(false)
const isGenerating = ref(false)
const generatedPdfBlob = ref(null)
const generatedPdfUrl = ref('')

let toastId = 0

const showToast = (message, type = 'info') => {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, type === 'error' ? 5000 : 3400)
}

// Compute placements when file or mode changes
const compute = () => {
  error.value = ''
  placements.value = []
  try {
    if (!pdfPageCount.value) return
    placements.value = computeImposition(pdfPageCount.value, mode.value)
    showToast(`Computed ${placements.value.length} placements (${placements.value.length / 4} sheets)`, 'success')
  } catch (err) {
    if (err instanceof ImpositionError) {
      error.value = err.message
    } else {
      error.value = err.message || 'Computation failed'
    }
    showToast(error.value, 'error')
  }
}

// Handle PDF file upload
const handleFile = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.type !== 'application/pdf') {
    showToast('Please select a PDF file', 'error')
    return
  }
  pdfFile.value = file
  isProcessing.value = true
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    pdfPageCount.value = pdfDoc.getPageCount()
    showToast(`Loaded PDF: ${pdfPageCount.value} pages`, 'success')
    compute()
  } catch (err) {
    console.error(err)
    showToast('Failed to read PDF', 'error')
    pdfPageCount.value = 0
  } finally {
    isProcessing.value = false
  }
}

// Generate output PDF
const generateOutput = async () => {
  if (!pdfFile.value || placements.value.length === 0) return
  isGenerating.value = true
  error.value = ''
  try {
    const arrayBuffer = await pdfFile.value.arrayBuffer()
    const sourcePdf = await PDFDocument.load(arrayBuffer)
    const outputPdf = await PDFDocument.create()

    // Get page dimensions from source (assume all pages same size)
    const [firstPage] = sourcePdf.getPages()
    const { width: srcWidth, height: srcHeight } = firstPage.getSize()
    
    // A4 landscape dimensions
    const a4Width = 841.89
    const a4Height = 595.28
    // A5 dimensions (half A4)
    const a5Width = a4Width / 2
    const a5Height = a4Height

    // Group placements by sheet and side
    const sheets = new Map()
    for (const p of placements.value) {
      const key = `${p.sheet}-${p.side}`
      if (!sheets.has(key)) sheets.set(key, [])
      sheets.get(key).push(p)
    }

    // Create pages in order: outermost sheet first, front then back, left then right
    for (const sheetIndex of Array.from(new Set(placements.value.map(p => p.sheet))).sort((a, b) => a - b)) {
      for (const side of ['front', 'back']) {
        const key = `${sheetIndex}-${side}`
        const sheetPlacements = sheets.get(key) || []
        if (sheetPlacements.length === 0) continue

        const page = outputPdf.addPage([a4Width, a4Height])
        
        // Sort left then right
        sheetPlacements.sort((a, b) => a.position === 'left' ? -1 : 1)

        for (const placement of sheetPlacements) {
          const x = placement.position === 'left' ? 0 : a5Width
          const srcPage = sourcePdf.getPage(placement.sourcePage - 1)
          
          // Embed the source page
          const [embeddedPage] = await outputPdf.embedPdf(sourcePdf, [placement.sourcePage - 1])
          
          // Calculate scale to fit A5
          const scaleX = a5Width / srcWidth
          const scaleY = a5Height / srcHeight
          const scale = Math.min(scaleX, scaleY)
          
          const drawWidth = srcWidth * scale
          const drawHeight = srcHeight * scale
          
          // Center within A5 cell
          const offsetX = x + (a5Width - drawWidth) / 2
          const offsetY = (a5Height - drawHeight) / 2

          // Draw with rotation
          if (placement.rotation === 180) {
            page.drawPage(embeddedPage, {
              x: offsetX + drawWidth,
              y: offsetY + drawHeight,
              width: -drawWidth,
              height: -drawHeight,
            })
          } else {
            page.drawPage(embeddedPage, {
              x: offsetX,
              y: offsetY,
              width: drawWidth,
              height: drawHeight,
            })
          }
        }

        // Add sheet/side label for reference
        const font = await outputPdf.embedFont(StandardFonts.Helvetica)
        page.drawText(`Sheet ${sheetIndex + 1} — ${side.charAt(0).toUpperCase() + side.slice(1)}`, {
          x: 10,
          y: 10,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        })
      }
    }

    const pdfBytes = await outputPdf.save()
    generatedPdfBlob.value = new Blob([pdfBytes], { type: 'application/pdf' })
    if (generatedPdfUrl.value) URL.revokeObjectURL(generatedPdfUrl.value)
    generatedPdfUrl.value = URL.createObjectURL(generatedPdfBlob.value)
    showToast('Booklet PDF generated', 'success')
  } catch (err) {
    console.error(err)
    error.value = err.message || 'Generation failed'
    showToast(error.value, 'error')
  } finally {
    isGenerating.value = false
  }
}

const downloadPdf = () => {
  if (!generatedPdfUrl.value) return
  const a = document.createElement('a')
  a.href = generatedPdfUrl.value
  a.download = `booklet-${pdfFile.value?.name?.replace('.pdf', '') || 'output'}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  showToast('Download started', 'success')
}

const clearAll = () => {
  pdfFile.value = null
  pdfPageCount.value = 0
  placements.value = []
  error.value = ''
  generatedPdfBlob.value = null
  if (generatedPdfUrl.value) URL.revokeObjectURL(generatedPdfUrl.value)
  generatedPdfUrl.value = ''
  const input = document.querySelector('input[type="file"]')
  if (input) input.value = ''
}

// Computed summary
const sheetCount = computed(() => placements.value.length / 4)
const sidesCount = computed(() => sheetCount.value * 2)

const previewSheets = computed(() => {
  const result = []
  for (let s = 0; s < sheetCount.value; s++) {
    const front = placements.value.filter(p => p.sheet === s && p.side === 'front').sort((a, b) => a.position === 'left' ? -1 : 1)
    const back = placements.value.filter(p => p.sheet === s && p.side === 'back').sort((a, b) => a.position === 'left' ? -1 : 1)
    result.push({ sheet: s, front, back })
  }
  return result
})

watch([pdfPageCount, mode], compute, { immediate: false })

onMounted(() => {
  // Load any saved state if needed
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-8">
    <header class="mb-8">
      <h1 class="font-display text-4xl font-bold text-ink mb-2">Booklet Imposition (2-up)</h1>
      <p class="text-warm-muted">
        Upload a PDF (page count multiple of 4, min 8) to generate a print-ready booklet layout.
        Each A4 sheet holds 4 pages (2 front, 2 back) at A5 size for saddle-stitch binding.
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Input Panel -->
      <aside class="lg:col-span-1 space-y-6">
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-5">
          <h2 class="font-display text-xl font-bold text-ink">PDF File</h2>
          <input
            type="file"
            accept="application/pdf"
            @change="handleFile"
            class="w-full p-3 bg-cream border-2 border-warm-border rounded-lg text-ink file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-coral file:text-white hover:file:bg-coral/90"
          />
          <p v-if="pdfPageCount" class="text-sm text-warm-muted">
            {{ pdfPageCount }} pages loaded
            <span v-if="pdfPageCount % 4 !== 0" class="text-red-600 ml-2">⚠ Must be multiple of 4</span>
            <span v-else-if="pdfPageCount < 8" class="text-red-600 ml-2">⚠ Minimum 8 pages</span>
            <span v-else class="text-green-600 ml-2">✓ Valid</span>
          </p>
        </div>

        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-5">
          <h2 class="font-display text-xl font-bold text-ink">Mode</h2>
          <div class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                value="2up"
                v-model="mode"
                class="w-4 h-4 text-coral border-warm-border focus:ring-coral"
              />
              <span class="text-ink">2-up (saddle-stitch)</span>
            </label>
            <label class="flex items-center gap-3 cursor-not-allowed opacity-50">
              <input type="radio" value="4up" disabled class="w-4 h-4" />
              <span class="text-ink">4-up (coming soon)</span>
            </label>
          </div>
        </div>

        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-5">
          <h2 class="font-display text-xl font-bold text-ink">Summary</h2>
          <div v-if="pdfPageCount" class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-warm-muted">Original pages</span>
              <span class="font-medium text-ink">{{ pdfPageCount }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-warm-muted">Physical sheets</span>
              <span class="font-medium text-ink">{{ sheetCount }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-warm-muted">Printed sides</span>
              <span class="font-medium text-ink">{{ sidesCount }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-warm-muted">Pages per side</span>
              <span class="font-medium text-ink">2 (A5)</span>
            </div>
          </div>
          <p v-else class="text-sm text-warm-muted">Upload a PDF to see summary</p>
        </div>

        <div class="flex flex-col gap-3">
          <button
            @click="generateOutput"
            :disabled="isGenerating || !pdfPageCount || pdfPageCount % 4 !== 0 || pdfPageCount < 8"
            class="w-full py-3 bg-coral text-white font-semibold rounded-lg hover:bg-coral/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <svg v-if="isGenerating" class="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span v-else>Generate Booklet PDF</span>
            <span v-if="isGenerating">Generating…</span>
          </button>
          <button
            @click="downloadPdf"
            :disabled="!generatedPdfUrl"
            class="w-full py-3 bg-warm-surface border-2 border-warm-border text-ink font-semibold rounded-lg hover:bg-cream/50 transition-colors"
          >
            Download PDF
          </button>
          <button
            @click="clearAll"
            class="w-full py-3 bg-white border-2 border-warm-border text-warm-muted font-semibold rounded-lg hover:bg-cream/50 transition-colors"
          >
            Clear
          </button>
        </div>

        <div v-if="error" class="p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
          {{ error }}
        </div>
      </aside>

      <!-- Preview Panel -->
      <main class="lg:col-span-2 space-y-6">
        <div v-if="placements.length === 0" class="bg-warm-surface border-2 border-dashed border-warm-border rounded-xl p-12 text-center">
          <svg class="mx-auto h-16 w-16 text-warm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <p class="mt-4 text-warm-muted text-lg">Upload a valid PDF to see the imposition preview</p>
        </div>

        <div v-else class="space-y-6">
          <div class="bg-gradient-to-r from-coral/10 to-amber/10 border-2 border-warm-border rounded-xl p-4">
            <h3 class="font-display text-lg font-bold text-ink">Sheet-by-Sheet Preview</h3>
            <p class="text-sm text-warm-muted mt-1">
              Order: outermost sheet → innermost. Each sheet: front (left→right), then back (left→right).
              Rotations: front-left/back-right = 180°, front-right/back-left = 0°.
            </p>
          </div>

          <div class="space-y-4">
            <div
              v-for="s in previewSheets"
              :key="s.sheet"
              class="bg-warm-surface border-2 border-warm-border rounded-xl overflow-hidden"
            >
              <div class="p-4 bg-white border-b-2 border-warm-border flex items-center justify-between">
                <h4 class="font-display text-lg font-bold text-ink">Sheet {{ s.sheet + 1 }} (pages {{ s.front[0]?.sourcePage }}-{{ s.back[1]?.sourcePage }})</h4>
                <span class="text-xs text-warm-muted px-2 py-1 bg-slate-100 rounded">{{ s.front.length + s.back.length }} pages</span>
              </div>
              
              <div class="grid grid-cols-2 gap-0">
                <!-- Front -->
                <div class="p-4 border-r border-warm-border bg-slate-50">
                  <div class="text-xs font-semibold text-warm-muted uppercase tracking-wide mb-2">FRONT</div>
                  <div class="flex gap-2">
                    <div v-for="p in s.front" :key="p.sourcePage" class="flex-1 p-3 bg-white border-2 rounded-lg" :class="p.position === 'left' ? 'border-l-4 border-coral' : 'border-r-4 border-coral'">
                      <div class="text-xs text-warm-muted">{{ p.position.toUpperCase() }}</div>
                      <div class="text-2xl font-bold text-ink font-mono">{{ p.sourcePage }}</div>
                      <div class="text-xs text-warm-muted">{{ p.rotation }}° rotation</div>
                    </div>
                  </div>
                </div>
                
                <!-- Back -->
                <div class="p-4 bg-slate-100">
                  <div class="text-xs font-semibold text-warm-muted uppercase tracking-wide mb-2">BACK</div>
                  <div class="flex gap-2">
                    <div v-for="p in s.back" :key="p.sourcePage" class="flex-1 p-3 bg-white border-2 rounded-lg" :class="p.position === 'left' ? 'border-l-4 border-amber-500' : 'border-r-4 border-amber-500'">
                      <div class="text-xs text-warm-muted">{{ p.position.toUpperCase() }}</div>
                      <div class="text-2xl font-bold text-ink font-mono">{{ p.sourcePage }}</div>
                      <div class="text-xs text-warm-muted">{{ p.rotation }}° rotation</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Full placement table -->
          <details class="bg-warm-surface border-2 border-warm-border rounded-xl">
            <summary class="p-4 cursor-pointer font-medium text-ink select-none">
              Show full placement table ({{ placements.length }} rows)
            </summary>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-900 text-white">
                  <tr>
                    <th class="p-3 text-left font-semibold">#</th>
                    <th class="p-3 text-left font-semibold">Source Page</th>
                    <th class="p-3 text-left font-semibold">Sheet</th>
                    <th class="p-3 text-left font-semibold">Side</th>
                    <th class="p-3 text-left font-semibold">Position</th>
                    <th class="p-3 text-left font-semibold">Rotation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, i) in placements" :key="i" :class="i % 2 === 0 ? 'bg-white' : 'bg-slate-50'">
                    <td class="p-3 border-t border-warm-border font-mono">{{ i + 1 }}</td>
                    <td class="p-3 border-t border-warm-border font-bold">{{ p.sourcePage }}</td>
                    <td class="p-3 border-t border-warm-border">{{ p.sheet + 1 }}</td>
                    <td class="p-3 border-t border-warm-border capitalize">{{ p.side }}</td>
                    <td class="p-3 border-t border-warm-border capitalize">{{ p.position }}</td>
                    <td class="p-3 border-t border-warm-border font-mono">{{ p.rotation }}°</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </main>
    </div>

    <!-- Toasts -->
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-slide-in"
        :class="toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'"
      >
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-in {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}
.animate-slide-in { animation: slide-in 0.3s ease-out; }

details summary::-webkit-details-marker { display: none; }
details summary::before {
  content: '▸';
  display: inline-block;
  margin-right: 0.5rem;
  transition: transform 0.2s;
}
details[open] summary::before { transform: rotate(90deg); }
</style>