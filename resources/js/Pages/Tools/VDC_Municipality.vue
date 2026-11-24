<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import vdcMapping from '../../data/vdcMapping.json'
import {
  loadMappingData,
  lookup,
  lookupBatch,
  search,
  getDistricts,
  getVdcsByDistrict,
  getDataVersion,
  VdcLookupError
} from '../../Utils/vdcLookup.js'

const STORAGE_KEY = 'site_vdc-lookup-data'

// State
const districtInput = ref('')
const vdcInput = ref('')
const wardInput = ref('')
const result = ref(null)
const error = ref('')
const toasts = ref([])
const isLoadingData = ref(false)
const batchMode = ref(false)
const batchInput = ref('')
const batchResult = ref(null)
const searchQuery = ref('')
const searchResults = ref([])
const showSearch = ref(false)

let toastId = 0

const showToast = (message, type = 'info') => {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, type === 'error' ? 5000 : 3400)
}

// Load mapping data on mount
onMounted(async () => {
  isLoadingData.value = true
  try {
    // Load the bundled sample data
    loadMappingData(vdcMapping)
    showToast(`Mapping data loaded (${getDataVersion()})`, 'success')
  } catch (err) {
    console.error(err)
    showToast('Failed to load mapping data', 'error')
  } finally {
    isLoadingData.value = false
  }
})

// Districts for autocomplete
const districts = computed(() => getDistricts())
const districtOptions = computed(() =>
  districts.value.map(d => ({ en: d.district_en, ne: d.district_ne }))
)

// VDCs for selected district
const availableVdcs = computed(() => {
  if (!districtInput.value) return []
  try {
    return getVdcsByDistrict(districtInput.value)
  } catch {
    return []
  }
})

const vdcOptions = computed(() =>
  availableVdcs.value.map(v => ({ en: v.vdc_en, ne: v.vdc_ne }))
)

// Single lookup
const doLookup = () => {
  error.value = ''
  result.value = null
  try {
    const ward = Number(wardInput.value)
    if (!Number.isInteger(ward) || ward < 1 || ward > 35) {
      throw new VdcLookupError('Ward must be an integer between 1 and 35')
    }
    const res = lookup({
      district: districtInput.value,
      vdc: vdcInput.value,
      ward
    })
    result.value = res
    showToast('Lookup successful', 'success')
  } catch (err) {
    if (err instanceof VdcLookupError) {
      error.value = err.message
    } else {
      error.value = err.message || 'Lookup failed'
    }
    showToast(error.value, 'error')
  }
}

// Search
const doSearch = () => {
  const q = searchQuery.value.trim()
  if (!q) {
    searchResults.value = []
    showSearch.value = false
    return
  }
  searchResults.value = search(q, 20)
  showSearch.value = true
}

// Batch lookup
const doBatch = () => {
  error.value = ''
  batchResult.value = null
  try {
    const lines = batchInput.value.trim().split('\n').filter(l => l.trim())
    if (lines.length === 0) throw new VdcLookupError('Enter at least one address')
    const addresses = lines.map((line, i) => {
      const parts = line.split(',').map(s => s.trim())
      if (parts.length < 3) throw new VdcLookupError(`Line ${i + 1}: format is "District, VDC, Ward"`)
      const ward = Number(parts[2])
      if (!Number.isInteger(ward) || ward < 1 || ward > 35) {
        throw new VdcLookupError(`Line ${i + 1}: Ward must be an integer 1-35`)
      }
      return { district: parts[0], vdc: parts[1], ward }
    })
    batchResult.value = lookupBatch(addresses)
    showToast(`Batch complete: ${batchResult.value.results.length} found, ${batchResult.value.notFound.length} not found`, 'success')
  } catch (err) {
    if (err instanceof VdcLookupError) {
      error.value = err.message
    } else {
      error.value = err.message || 'Batch lookup failed'
    }
    showToast(error.value, 'error')
  }
}

const copyResult = () => {
  if (!result.value) return
  navigator.clipboard.writeText(JSON.stringify(result.value, null, 2))
  showToast('Copied to clipboard', 'success')
}

const copyBatchResult = () => {
  if (!batchResult.value) return
  navigator.clipboard.writeText(JSON.stringify(batchResult.value, null, 2))
  showToast('Copied to clipboard', 'success')
}

const copyFormatted = (lang = 'en') => {
  if (!result.value) return
  const key = lang === 'en' ? 'formatted_en' : 'formatted_ne'
  navigator.clipboard.writeText(result.value[key])
  showToast(`Copied ${lang === 'en' ? 'English' : 'Devanagari'} format`, 'success')
}

const copyFormal = (lang = 'en') => {
  if (!result.value) return
  const key = lang === 'en' ? 'formal_en' : 'formal_ne'
  navigator.clipboard.writeText(result.value[key])
  showToast(`Copied ${lang === 'en' ? 'English' : 'Devanagari'} formal`, 'success')
}

const clearAll = () => {
  districtInput.value = ''
  vdcInput.value = ''
  wardInput.value = ''
  result.value = null
  error.value = ''
  batchMode.value = false
  batchInput.value = ''
  batchResult.value = null
  searchQuery.value = ''
  searchResults.value = []
  showSearch.value = false
}

// Persistence
const saveState = () => {
  const state = {
    district: districtInput.value,
    vdc: vdcInput.value,
    ward: wardInput.value
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const loadState = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return
  try {
    const state = JSON.parse(saved)
    if (state.district) districtInput.value = state.district
    if (state.vdc) vdcInput.value = state.vdc
    if (state.ward) wardInput.value = state.ward
  } catch {
    // ignore
  }
}

onMounted(() => {
  loadState()
})

watch([districtInput, vdcInput, wardInput], saveState, { deep: true })

// Province info for display
const provinceLabels = {
  1: { en: 'Koshi', ne: 'कोशी' },
  2: { en: 'Madhesh', ne: 'मधेश' },
  3: { en: 'Bagmati', ne: 'बागमती' },
  4: { en: 'Gandaki', ne: 'गण्डकी' },
  5: { en: 'Lumbini', ne: 'लुम्बिनी' },
  6: { en: 'Karnali', ne: 'कर्णाली' },
  7: { en: 'Sudurpashchim', ne: 'सुदूरपश्चिम' }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 py-8">
    <header class="mb-8">
      <h1 class="font-display text-4xl font-bold text-ink mb-2">VDC → Municipality Lookup</h1>
      <p class="text-warm-muted">
        Convert old VDC/ward addresses to the new federal structure (2017 restructuring).
        Bilingual output in English and Devanagari.
      </p>
      <p v-if="!isLoadingData" class="text-xs text-warm-muted mt-1">
        Data version: {{ getDataVersion() }} — {{ districts.length }} districts loaded
      </p>
    </header>

    <!-- Mode Tabs -->
    <div class="mb-6 border-b-2 border-warm-border">
      <nav class="flex gap-1" aria-label="Lookup mode">
        <button
          @click="batchMode = false"
          :class="[
            'px-4 py-2 rounded-t-lg font-medium transition-colors',
            !batchMode ? 'bg-coral text-white' : 'bg-warm-surface text-ink hover:bg-cream/50'
          ]"
        >
          Single Lookup
        </button>
        <button
          @click="batchMode = true"
          :class="[
            'px-4 py-2 rounded-t-lg font-medium transition-colors',
            batchMode ? 'bg-coral text-white' : 'bg-warm-surface text-ink hover:bg-cream/50'
          ]"
        >
          Batch Lookup
        </button>
      </nav>
    </div>

    <!-- Single Lookup -->
    <div v-if="!batchMode" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <aside class="lg:col-span-1 space-y-6">
        <!-- District -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-4">
          <h2 class="font-display text-xl font-bold text-ink">District</h2>
          <div class="relative">
            <input
              v-model="districtInput"
              type="text"
              @input="doSearch"
              @focus="doSearch"
              @blur="setTimeout(() => showSearch = false, 200)"
              class="w-full p-3 bg-cream border-2 border-warm-border rounded-lg text-ink placeholder-warm-muted focus:border-coral focus:outline-none"
              placeholder="Type district name (English or Devanagari)"
              autocomplete="off"
            />
            <div v-if="showSearch && searchResults.length > 0" class="absolute z-10 w-full mt-1 bg-white border-2 border-warm-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div
                v-for="r in searchResults"
                :key="r.district + '|' + r.vdc"
                @mousedown="districtInput = r.district; vdcInput = r.vdc; showSearch = false"
                class="px-3 py-2 hover:bg-coral/10 cursor-pointer border-b last:border-0"
              >
                <div class="font-medium text-ink">{{ r.district }} ({{ r.vdc }})</div>
                <div class="text-sm text-warm-muted">{{ r.district_ne }} ({{ r.vdc_ne }})</div>
              </div>
            </div>
          </div>
          <div v-if="districtInput && !showSearch" class="text-sm text-warm-muted">
            {{ availableVdcs.length }} VDCs in this district
          </div>
        </div>

        <!-- VDC -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-4">
          <h2 class="font-display text-xl font-bold text-ink">VDC / Old Municipality</h2>
          <select
            v-model="vdcInput"
            class="w-full p-3 bg-cream border-2 border-warm-border rounded-lg text-ink focus:border-coral focus:outline-none"
          >
            <option value="">Select VDC</option>
            <option
              v-for="v in availableVdcs"
              :key="v.vdc_en"
              :value="v.vdc_en"
            >
              {{ v.vdc_en }} ({{ v.vdc_ne }})
            </option>
          </select>
          <p v-if="vdcInput" class="text-sm text-warm-muted">
            Valid wards: {{ availableVdcs.find(v => v.vdc_en === vdcInput)?.oldWards.join(', ') || '—' }}
          </p>
        </div>

        <!-- Ward -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-4">
          <h2 class="font-display text-xl font-bold text-ink">Ward Number</h2>
          <input
            v-model="wardInput"
            type="number"
            min="1"
            max="35"
            class="w-full p-3 bg-cream border-2 border-warm-border rounded-lg text-ink placeholder-warm-muted focus:border-coral focus:outline-none text-center text-xl"
            placeholder="1–35"
          />
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3">
          <button
            @click="doLookup"
            :disabled="!districtInput || !vdcInput || !wardInput"
            class="w-full py-3 bg-coral text-white font-semibold rounded-lg hover:bg-coral/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Lookup
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

      <!-- Result Panel -->
      <main class="lg:col-span-2 space-y-6">
        <div v-if="!result" class="bg-warm-surface border-2 border-dashed border-warm-border rounded-xl p-12 text-center">
          <svg class="mx-auto h-16 w-16 text-warm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
          <p class="mt-4 text-warm-muted text-lg">Fill in the details and click <strong class="text-ink">Lookup</strong></p>
        </div>

        <div v-else class="space-y-6">
          <!-- Formal Formats -->
          <div class="bg-gradient-to-r from-coral/10 to-amber/10 border-2 border-warm-border rounded-xl p-6 space-y-4">
            <h3 class="font-display text-lg font-bold text-ink">Formal Address (English)</h3>
            <p class="bg-white p-4 rounded-lg border border-warm-border font-mono text-sm text-ink break-all">{{ result.formal_en }}</p>
            <div class="flex gap-2">
              <button @click="copyFormal('en')" class="px-3 py-1 bg-warm-surface border border-warm-border rounded text-sm hover:bg-cream/50">Copy</button>
            </div>
          </div>

          <div class="bg-gradient-to-r from-coral/10 to-amber/10 border-2 border-warm-border rounded-xl p-6 space-y-4">
            <h3 class="font-display text-lg font-bold text-ink">औपचारिक ठेगाना (नेपाली)</h3>
            <p class="bg-white p-4 rounded-lg border border-warm-border font-mono text-sm text-ink break-all">{{ result.formal_ne }}</p>
            <div class="flex gap-2">
              <button @click="copyFormal('ne')" class="px-3 py-1 bg-warm-surface border border-warm-border rounded text-sm hover:bg-cream/50">नकल गर्नुहोस्</button>
            </div>
          </div>

          <!-- Compact Formats -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-white border-2 border-warm-border rounded-xl p-4 space-y-3">
              <h4 class="font-display text-sm font-bold text-ink">Compact (EN)</h4>
              <p class="text-sm text-slate-700">{{ result.formatted_en }}</p>
              <button @click="copyFormatted('en')" class="text-sm text-coral hover:underline">Copy</button>
            </div>
            <div class="bg-white border-2 border-warm-border rounded-xl p-4 space-y-3">
              <h4 class="font-display text-sm font-bold text-ink">संक्षिप्त (ने)</h4>
              <p class="text-sm text-slate-700">{{ result.formatted_ne }}</p>
              <button @click="copyFormatted('ne')" class="text-sm text-coral hover:underline">नकल गर्नुहोस्</button>
            </div>
          </div>

          <!-- Structured Data -->
          <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-4">
            <h3 class="font-display text-lg font-bold text-ink">Structured Data</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p class="text-warm-muted">Province</p>
                <p class="font-medium text-ink">{{ result.province }}</p>
              </div>
              <div>
                <p class="text-warm-muted">प्रदेश</p>
                <p class="font-medium text-ink">{{ result.province_ne }}</p>
              </div>
              <div>
                <p class="text-warm-muted">District</p>
                <p class="font-medium text-ink">{{ result.district_en }}</p>
              </div>
              <div>
                <p class="text-warm-muted">जिल्ला</p>
                <p class="font-medium text-ink">{{ result.district_ne }}</p>
              </div>
              <div>
                <p class="text-warm-muted">Local Level</p>
                <p class="font-medium text-ink">{{ result.localLevel_en }}</p>
              </div>
              <div>
                <p class="text-warm-muted">स्थानीय तह</p>
                <p class="font-medium text-ink">{{ result.localLevel_ne }}</p>
              </div>
              <div>
                <p class="text-warm-muted">Type</p>
                <p class="font-medium text-ink">{{ result.localLevelType }}</p>
              </div>
              <div>
                <p class="text-warm-muted">New Ward</p>
                <p class="font-medium text-ink">{{ result.newWard }}</p>
              </div>
            </div>
            <div class="flex gap-2 pt-2">
              <button @click="copyResult" class="px-4 py-2 bg-warm-surface border-2 border-warm-border text-ink rounded-lg hover:bg-cream/50">
                Copy Full JSON
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Batch Lookup -->
    <div v-if="batchMode" class="space-y-6">
      <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-xl font-bold text-ink">Batch Lookup</h2>
          <span class="text-xs text-warm-muted">One per line: District, VDC, Ward</span>
        </div>
        <textarea
          v-model="batchInput"
          class="w-full h-40 p-3 bg-cream border-2 border-warm-border rounded-lg text-ink placeholder-warm-muted focus:border-coral focus:outline-none resize-y font-mono text-sm"
          placeholder="Kathmandu, Dhapasi, 1&#10;Lalitpur, Lubhu, 5&#10;काठमाडौं, टोखा, 3"
        />
        <div class="flex gap-3">
          <button
            @click="doBatch"
            :disabled="!batchInput.trim()"
            class="px-6 py-3 bg-coral text-white font-semibold rounded-lg hover:bg-coral/90 disabled:opacity-50"
          >
            Process Batch
          </button>
          <button
            @click="clearAll"
            class="px-6 py-3 bg-white border-2 border-warm-border text-warm-muted font-semibold rounded-lg hover:bg-cream/50"
          >
            Clear
          </button>
        </div>
      </div>

      <div v-if="batchResult" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-display text-lg font-bold text-ink">Results</h3>
          <button @click="copyBatchResult" class="px-3 py-1 bg-warm-surface border border-warm-border rounded text-sm hover:bg-cream/50">Copy All JSON</button>
        </div>

        <div v-if="batchResult.results.length > 0" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-900 text-white">
              <tr>
                <th class="p-3 text-left font-semibold">District</th>
                <th class="p-3 text-left font-semibold">VDC</th>
                <th class="p-3 text-left font-semibold">Ward</th>
                <th class="p-3 text-left font-semibold">New Local Level</th>
                <th class="p-3 text-left font-semibold">New Ward</th>
                <th class="p-3 text-left font-semibold">Type</th>
                <th class="p-3 text-left font-semibold">Formal (EN)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in batchResult.results" :key="i" :class="i % 2 === 0 ? 'bg-white' : 'bg-slate-50'">
                <td class="p-3 border-t border-warm-border">{{ r.district_en }}</td>
                <td class="p-3 border-t border-warm-border">{{ r.localLevel_en }}</td>
                <td class="p-3 border-t border-warm-border">{{ r.newWard }}</td>
                <td class="p-3 border-t border-warm-border">{{ r.localLevel_en }}</td>
                <td class="p-3 border-t border-warm-border">{{ r.newWard }}</td>
                <td class="p-3 border-t border-warm-border">{{ r.localLevelType }}</td>
                <td class="p-3 border-t border-warm-border max-w-xs truncate">{{ r.formal_en }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="batchResult.notFound.length > 0" class="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
          <h4 class="font-bold text-amber-800 mb-2">Not Found ({{ batchResult.notFound.length }})</h4>
          <ul class="text-sm text-amber-700 space-y-1">
            <li v-for="(n, i) in batchResult.notFound" :key="i">
              {{ n.district }}, {{ n.vdc }}, {{ n.ward }}
            </li>
          </ul>
        </div>
      </div>
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

/* Search dropdown */
.absolute.z-10 {
  z-index: 100;
}
</style>