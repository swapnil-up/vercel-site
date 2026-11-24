<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { toPng } from 'html-to-image'
import {
  generateRoster,
  workloadSummary,
  ScheduleError,
  checkFeasibility,
  serializeState,
  deserializeState
} from '../../Utils/dutyRoster.js'

const STORAGE_KEY = 'site_duty-roster-data'

// State
const namesInput = ref('')
const unavailable = ref({}) // { name: Set(day) }
const duties = ref(['Cleaning', 'Gate', 'Events'])
const days = ref(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
const titleInput = ref('Weekly Duty Roster')
const roster = ref([])
const counts = ref({})
const error = ref('')
const toasts = ref([])
const isExporting = ref(false)
const showingConfirmClear = ref(false)
const importFile = ref(null)

let toastId = 0

const showToast = (message, type = 'info') => {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, type === 'error' ? 5000 : 3400)
}

// Computed parsed lists
const nameList = computed(() =>
  namesInput.value.split('\n').map(s => s.trim()).filter(s => s.length > 0)
)

const dutyList = computed(() => [...duties.value])
const dayList = computed(() => [...days.value])

const nameCount = computed(() => nameList.value.length)
const dutyCount = computed(() => dutyList.value.length)
const dayCount = computed(() => dayList.value.length)

const canGenerate = computed(() => nameCount.value > 0 && dutyCount.value > 0 && dayCount.value > 0)

// Feasibility check (reactive)
const feasibility = computed(() =>
  checkFeasibility(nameList.value, unavailable.value, { duties: dutyList.value, days: dayList.value })
)

// Unavailable helpers
const isUnavailable = (name, day) => unavailable.value[name]?.has(day) ?? false

const toggleUnavailable = (name, day) => {
  if (!unavailable.value[name]) {
    unavailable.value[name] = new Set()
  }
  const set = unavailable.value[name]
  if (set.has(day)) {
    set.delete(day)
    if (set.size === 0) delete unavailable.value[name]
  } else {
    set.add(day)
  }
  unavailable.value = { ...unavailable.value } // trigger reactivity
}

const unavailableCount = computed(() => {
  let count = 0
  for (const set of Object.values(unavailable.value)) count += set.size
  return count
})

// Actions
const generate = () => {
  error.value = ''
  try {
    // Convert unavailable Sets to arrays for the generator
    const unavailableForGen = {}
    for (const [name, set] of Object.entries(unavailable.value)) {
      unavailableForGen[name] = Array.from(set)
    }
    const rows = generateRoster(nameList.value, unavailableForGen, { duties: dutyList.value, days: dayList.value })
    roster.value = rows
    counts.value = workloadSummary(rows, nameList.value)
    showToast('Roster generated.', 'success')
  } catch (err) {
    if (err instanceof ScheduleError) {
      error.value = err.message
    } else {
      error.value = err.message || 'Generation failed'
    }
    showToast(error.value, 'error')
    roster.value = []
    counts.value = {}
  }
}

const loadSample = () => {
  namesInput.value = `Asha
Ravi
Sita
Hari
Mina
Kiran
Priya
Arun
Deepa
Vikram
Leela
Mohan
Nina
Raj
Zara`
  unavailable.value = {
    Asha: new Set(['Mon', 'Tue']),
    Ravi: new Set(['Fri']),
    Sita: new Set(['Wed']),
    Hari: new Set(['Sat', 'Sun']),
    Mina: new Set(['Mon'])
  }
  duties.value = ['Cleaning', 'Gate', 'Events']
  days.value = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  titleInput.value = 'Weekly Duty Roster'
  generate()
  showToast('Sample data loaded.', 'success')
}

const confirmClear = () => {
  showingConfirmClear.value = true
}

const clearAll = () => {
  namesInput.value = ''
  unavailable.value = {}
  duties.value = ['Cleaning', 'Gate', 'Events']
  days.value = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  titleInput.value = 'Weekly Duty Roster'
  roster.value = []
  counts.value = {}
  error.value = ''
  showingConfirmClear.value = false
}

const exportImage = async () => {
  const node = document.getElementById('roster-export')
  if (!node || isExporting.value || roster.value.length === 0) return
  isExporting.value = true
  try {
    if (document.fonts?.ready) await document.fonts.ready
    const dataUrl = await toPng(node, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: '#F3F6FA',
      style: {
        position: 'static',
        left: '0',
        top: '0',
        margin: '0',
        transform: 'none',
        pointerEvents: 'auto'
      }
    })

    // Try native share first (mobile Viber/WhatsApp)
    if (navigator.canShare && navigator.canShare({ files: [] })) {
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], `duty-roster-${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' })
      try {
        await navigator.share({
          title: 'Duty Roster',
          text: 'Weekly duty roster',
          files: [file]
        })
        showToast('Shared successfully.', 'success')
        return
      } catch (e) {
        // Fall through to download if share cancelled/failed
      }
    }

    // Download fallback
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `duty-roster-${new Date().toISOString().split('T')[0]}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    showToast('Image saved.', 'success')
  } catch (err) {
    console.error(err)
    showToast('Could not export image.', 'error')
  } finally {
    isExporting.value = false
  }
}

const copyJson = () => {
  const data = {
    roster: roster.value,
    counts: counts.value,
    generatedAt: new Date().toISOString()
  }
  navigator.clipboard.writeText(JSON.stringify(data, null, 2))
  showToast('JSON copied to clipboard.', 'success')
}

const exportState = () => {
  const json = serializeState(
    nameList.value,
    Object.fromEntries(
      Object.entries(unavailable.value).map(([k, v]) => [k, Array.from(v)])
    ),
    dutyList.value,
    dayList.value,
    titleInput.value
  )
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `duty-roster-state-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('State exported.', 'success')
}

const handleImport = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (evt) => {
    try {
      const state = deserializeState(evt.target.result)
      namesInput.value = state.names.join('\n')
      unavailable.value = {}
      for (const [name, daysArr] of Object.entries(state.unavailable)) {
        unavailable.value[name] = new Set(daysArr)
      }
      duties.value = state.duties
      days.value = state.days
      titleInput.value = state.title
      roster.value = []
      counts.value = {}
      error.value = ''
      showToast('State imported.', 'success')
    } catch (err) {
      showToast(err.message || 'Import failed', 'error')
    }
    importFile.value = null // reset for re-importing same file
  }
  reader.readAsText(file)
}

const triggerImport = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = handleImport
  input.click()
}

// Persistence
const saveState = () => {
  const state = {
    names: namesInput.value,
    unavailable: Object.fromEntries(
      Object.entries(unavailable.value).map(([k, v]) => [k, Array.from(v)])
    ),
    duties: dutyList.value,
    days: dayList.value,
    title: titleInput.value
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const loadState = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return
  try {
    const state = JSON.parse(saved)
    if (state.names) namesInput.value = state.names
    if (state.unavailable) {
      unavailable.value = {}
      for (const [name, daysArr] of Object.entries(state.unavailable)) {
        unavailable.value[name] = new Set(daysArr)
      }
    }
    if (state.duties) duties.value = state.duties
    if (state.days) days.value = state.days
    if (state.title) titleInput.value = state.title
  } catch {
    // Ignore corrupted state
  }
}

onMounted(() => {
  loadState()
})

// Auto-save on changes
watch([namesInput, duties, days, titleInput], saveState, { deep: true })
watch(unavailable, saveState, { deep: true })

// Export helpers for template
const dayHeaders = computed(() => dayList.value.map(d => ({ key: d, label: d })))
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-8">
    <header class="mb-8">
      <h1 class="font-display text-4xl font-bold text-ink mb-2">Duty Roster Generator</h1>
      <p class="text-warm-muted">
        Create a fair weekly schedule for cleaning, gate, events, and more.
        Enter names, mark unavailable days, and get a clash-free roster as a shareable image.
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Input Panel -->
      <aside class="lg:col-span-1 space-y-6">
        <!-- People -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-xl font-bold text-ink">People</h2>
            <span class="text-xs text-warm-muted">{{ nameCount }} people</span>
          </div>
          <p class="text-sm text-warm-muted">One name per line (paste from a list)</p>
          <textarea
            v-model="namesInput"
            class="w-full h-40 p-3 bg-cream border-2 border-warm-border rounded-lg text-ink placeholder-warm-muted focus:border-coral focus:outline-none resize-y font-mono text-sm"
            placeholder="Asha&#10;Ravi&#10;Sita&#10;Hari&#10;Mina"
            @keydown.enter.prevent
          />
        </div>

        <!-- Unavailable Days Grid -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-xl font-bold text-ink">Unavailable Days</h2>
            <span class="text-xs text-warm-muted" v-if="unavailableCount > 0">{{ unavailableCount }} blocked</span>
          </div>
          <p class="text-sm text-warm-muted">Click cells to toggle. Grey = unavailable.</p>

          <div v-if="nameList.length === 0" class="text-center py-8 text-warm-muted">
            Add people above to configure availability
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b-2 border-warm-border">
                  <th class="p-2 text-left font-semibold w-28 text-warm-muted">PERSON</th>
                  <th v-for="day in dayList" :key="day" class="p-2 text-center font-semibold text-warm-muted uppercase tracking-wide">
                    {{ day }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="name in nameList" :key="name" class="border-b border-warm-border/50 last:border-0">
                  <td class="p-2 font-medium text-ink w-28">{{ name }}</td>
                  <td v-for="day in dayList" :key="day" class="p-1 text-center">
                    <button
                      type="button"
                      @click="toggleUnavailable(name, day)"
                      :class="[
                        'w-8 h-8 rounded-lg transition-all',
                        isUnavailable(name, day)
                          ? 'bg-slate-200 text-slate-500 border-2 border-slate-300'
                          : 'bg-white text-slate-700 border-2 border-warm-border hover:bg-coral/10 hover:border-coral'
                      ]"
                      :aria-label="`${name} ${day} ${isUnavailable(name, day) ? 'available' : 'unavailable'}`"
                      :aria-pressed="isUnavailable(name, day)"
                    >
                      <span v-if="isUnavailable(name, day)" class="text-xs">✕</span>
                      <span v-else class="text-xs font-medium">{{ day }}</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Duties Chips -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-5">
          <h2 class="font-display text-xl font-bold text-ink">Duties</h2>
          <p class="text-sm text-warm-muted">Click to remove, type to add</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="duty in dutyList"
              :key="duty"
              class="inline-flex items-center gap-1 px-3 py-1 bg-white border-2 border-warm-border rounded-full text-sm text-ink"
            >
              {{ duty }}
              <button
                type="button"
                @click="duties.splice(dutyList.indexOf(duty), 1)"
                class="w-5 h-5 rounded-full hover:bg-slate-100 flex items-center justify-center text-warm-muted hover:text-red-600"
                aria-label="Remove duty"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
            <input
              type="text"
              @keydown.enter="e => { const v = e.target.value.trim(); if (v && !dutyList.includes(v)) { duties.push(v); e.target.value = '' } }"
              class="flex-1 min-w-[120px] px-3 py-1 bg-white border-2 border-warm-border rounded-full text-sm text-ink placeholder-warm-muted focus:border-coral focus:outline-none"
              placeholder="+ Add duty"
            />
          </div>
        </div>

        <!-- Days Chips -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-5">
          <h2 class="font-display text-xl font-bold text-ink">Schedule Days</h2>
          <p class="text-sm text-warm-muted">Drag to reorder (click to remove)</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(day, idx) in dayList"
              :key="day"
              class="inline-flex items-center gap-1 px-3 py-1 bg-white border-2 border-warm-border rounded-full text-sm text-ink"
            >
              {{ day }}
              <button
                type="button"
                @click="days.splice(idx, 1)"
                class="w-5 h-5 rounded-full hover:bg-slate-100 flex items-center justify-center text-warm-muted hover:text-red-600"
                aria-label="Remove day"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
            <input
              type="text"
              @keydown.enter="e => { const v = e.target.value.trim(); if (v && !dayList.includes(v)) { days.push(v); e.target.value = '' } }"
              class="flex-1 min-w-[120px] px-3 py-1 bg-white border-2 border-warm-border rounded-full text-sm text-ink placeholder-warm-muted focus:border-coral focus:outline-none"
              placeholder="+ Add day"
            />
          </div>
        </div>

        <!-- Title -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-5">
          <h2 class="font-display text-xl font-bold text-ink">Image Title</h2>
          <input
            v-model="titleInput"
            type="text"
            class="w-full p-3 bg-cream border-2 border-warm-border rounded-lg text-ink placeholder-warm-muted focus:border-coral focus:outline-none"
            placeholder="Weekly Duty Roster"
          />
        </div>

        <!-- Feasibility -->
        <div v-if="nameCount > 0" class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-3">
          <h2 class="font-display text-xl font-bold text-ink">Feasibility</h2>
          <div v-if="!feasibility.feasible" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {{ feasibility.error }}
          </div>
          <div v-else class="space-y-2">
            <div class="flex items-center gap-2 text-green-700 text-sm">
              <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
              Schedule is feasible
            </div>
            <ul v-if="feasibility.warnings.length > 0" class="text-amber-800 text-sm space-y-1">
              <li v-for="w in feasibility.warnings" :key="w" class="flex items-start gap-2">
                <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.765 1.361-.226 2.98-1.742 2.98H4.42c-1.516 0-2.507-1.619-1.742-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                {{ w }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3">
          <button
            @click="generate"
            :disabled="!canGenerate || isExporting || !feasibility.feasible"
            class="w-full py-3 bg-coral text-white font-semibold rounded-lg hover:bg-coral/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generate Roster
          </button>
          <button
            @click="loadSample"
            class="w-full py-3 bg-warm-surface border-2 border-warm-border text-ink font-semibold rounded-lg hover:bg-cream/50 transition-colors"
          >
            Load Sample (15 people)
          </button>
          <button
            @click="confirmClear"
            v-if="!showingConfirmClear"
            class="w-full py-3 bg-white border-2 border-warm-border text-warm-muted font-semibold rounded-lg hover:bg-cream/50 transition-colors"
          >
            Clear All
          </button>
          <div v-else class="flex gap-3">
            <button
              @click="clearAll"
              class="flex-1 py-3 bg-red-100 border-2 border-red-300 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition-colors"
            >
              Confirm Clear
            </button>
            <button
              @click="showingConfirmClear = false"
              class="flex-1 py-3 bg-white border-2 border-warm-border text-warm-muted font-semibold rounded-lg hover:bg-cream/50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Import/Export -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-4">
          <h2 class="font-display text-xl font-bold text-ink">Import / Export</h2>
          <div class="flex flex-wrap gap-3">
            <button
              @click="exportState"
              class="px-4 py-2 bg-warm-surface border-2 border-warm-border text-ink font-medium rounded-lg hover:bg-cream/50 transition-colors text-sm"
            >
              Export State (JSON)
            </button>
            <button
              @click="triggerImport"
              class="px-4 py-2 bg-warm-surface border-2 border-warm-border text-ink font-medium rounded-lg hover:bg-cream/50 transition-colors text-sm"
            >
              Import State (JSON)
            </button>
            <button
              @click="copyJson"
              :disabled="roster.length === 0"
              class="px-4 py-2 bg-warm-surface border-2 border-warm-border text-ink font-medium rounded-lg hover:bg-cream/50 transition-colors text-sm disabled:opacity-50"
            >
              Copy Roster JSON
            </button>
          </div>
        </div>

        <div v-if="error" class="p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
          {{ error }}
        </div>
      </aside>

      <!-- Output Panel -->
      <main class="lg:col-span-2 space-y-6">
        <div v-if="roster.length === 0" class="bg-warm-surface border-2 border-dashed border-warm-border rounded-xl p-12 text-center">
          <svg class="mx-auto h-16 w-16 text-warm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p class="mt-4 text-warm-muted text-lg">Fill in the details and click <strong class="text-ink">Generate Roster</strong></p>
          <p class="mt-2 text-sm text-warm-muted">The table will appear here with assignment counts</p>
        </div>

        <div v-else class="space-y-6">
          <!-- Roster Table -->
          <div id="roster-export" class="bg-warm-surface border-2 border-warm-border rounded-xl overflow-hidden">
            <div class="p-6 bg-gradient-to-r from-coral/10 to-amber/10 border-b-2 border-warm-border">
              <h2 class="font-display text-2xl font-bold text-ink">{{ titleInput }}</h2>
              <p class="text-warm-muted mt-1">{{ dayCount }} days  •  {{ dutyCount }} duties  •  {{ nameCount }} people</p>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-900 text-white">
                  <tr>
                    <th class="p-3 text-left font-semibold w-28">DAY</th>
                    <th v-for="duty in dutyList" :key="duty" class="p-3 text-left font-semibold">
                      {{ duty }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(day, idx) in dayList" :key="day" :class="idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'">
                    <td class="p-3 font-medium text-ink w-28">{{ day }}</td>
                    <td v-for="duty in dutyList" :key="duty" class="p-3 text-slate-700">
                      <span class="font-medium">
                        {{ roster.find(r => r.day === day && r.duty === duty)?.person || '—' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Assignment Counts -->
            <div class="p-6 bg-white border-t-2 border-warm-border">
              <h3 class="font-display text-lg font-bold text-ink mb-4">ASSIGNMENT COUNTS</h3>
              <div class="flex flex-wrap gap-2 text-sm text-slate-700">
                <span
                  v-for="name in nameList"
                  :key="name"
                  class="bg-slate-100 px-3 py-1 rounded-full font-mono"
                >
                  {{ name }}: {{ counts[name] || 0 }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap gap-4">
            <button
              @click="exportImage"
              :disabled="isExporting || roster.length === 0"
              class="px-6 py-3 bg-coral text-white font-semibold rounded-lg hover:bg-coral/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg v-if="isExporting" class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span v-else>Export as Image (PNG)</span>
              <span v-if="isExporting">Generating…</span>
            </button>

            <button
              @click="copyJson"
              :disabled="roster.length === 0"
              class="px-6 py-3 bg-warm-surface border-2 border-warm-border text-ink font-semibold rounded-lg hover:bg-cream/50 transition-colors"
            >
              Copy JSON
            </button>
          </div>
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

table td, table th { white-space: nowrap; }

/* Make unavailable grid buttons more touch-friendly */
@media (max-width: 640px) {
  .overflow-x-auto table {
    min-width: 480px;
  }
}
</style>