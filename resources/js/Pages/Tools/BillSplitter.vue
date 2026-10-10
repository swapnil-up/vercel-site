<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { toPng } from 'html-to-image'
import {
  normalizeData,
  computeBalances,
  computeSettlements,
  computeTotalCents
} from '../../Utils/billSplitter.js'

const STORAGE_KEY = 'site_bill-splitter-data'

const people = ref([{ id: 1, name: '' }])
const items = ref([])
const currency = ref('Rs.')
const currencyCustomVisible = ref(false)
const importExportMode = ref(null)
const toasts = ref([])
const confirmingClear = ref(false)
const isExporting = ref(false)
const exportNode = ref(null)

let toastId = 0
let confirmTimer = null

const currencyPresets = ['Rs.', '$', '€', '£', '¥', '₹', '৳', 'A$', 'C$', 'R', '₱', '₦', '₩', '฿']

const showToast = (message, type = 'info', action = null) => {
  const id = ++toastId
  toasts.value.push({ id, message, type, action })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, action ? 5000 : 3400)
}

const runToastAction = (toast) => {
  toast.action?.run()
  toasts.value = toasts.value.filter(t => t.id !== toast.id)
}

const fmt = (amount) => {
  const c = currency.value.trim()
  const n = Number(amount).toFixed(2)
  return c ? `${c} ${n}` : n
}

const fmtCents = (cents) => fmt((cents || 0) / 100)

const nextPersonId = () => people.value.reduce((m, p) => Math.max(m, p.id), 0) + 1
const nextItemId = () => items.value.reduce((m, i) => Math.max(m, i.id), 0) + 1

const personLabel = (person, index) => person.name.trim() || `Person ${index + 1}`

const nameOf = (id) => {
  const idx = people.value.findIndex(p => p.id === id)
  return idx >= 0 ? personLabel(people.value[idx], idx) : '?'
}

const totalCents = computed(() => computeTotalCents(items.value))
const totalAmount = computed(() => totalCents.value / 100)

const animatedTotal = ref(0)
let totalRaf = null
watch(totalAmount, (to) => {
  const from = animatedTotal.value
  const start = performance.now()
  const duration = 350
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    animatedTotal.value = from + (to - from) * eased
    if (t < 1) totalRaf = requestAnimationFrame(tick)
  }
  if (totalRaf) cancelAnimationFrame(totalRaf)
  totalRaf = requestAnimationFrame(tick)
})

const balancesCents = computed(() => computeBalances(people.value, items.value))
const settlements = computed(() => computeSettlements(balancesCents.value))

const buildScallopPath = (w, h, step, side) => {
  const n = Math.ceil(w / step)
  let d = ''
  if (side === 'bottom') {
    d = `M0 0 `
    for (let i = 0; i < n; i++) {
      const x = Math.min((i + 1) * step, w)
      d += `Q ${i * step + step / 2} ${h * 2} ${x} 0 `
    }
    d += `L ${w} 0 Z`
  } else {
    d = `M0 ${h} `
    for (let i = 0; i < n; i++) {
      const x = Math.min((i + 1) * step, w)
      d += `Q ${i * step + step / 2} ${-h} ${x} ${h} `
    }
    d += `L ${w} ${h} Z`
  }
  return d
}

const scallopTop = buildScallopPath(480, 10, 12, 'top')
const scallopBottom = buildScallopPath(480, 10, 12, 'bottom')

const todayLabel = computed(() =>
  new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
)

const saveToStorage = () => {
  try {
    const data = {
      version: 2,
      people: people.value.map(p => ({ id: p.id, name: p.name })),
      items: items.value.map(it => ({
        id: it.id,
        description: it.description,
        cost: it.cost,
        paidBy: it.paidBy,
        sharedBy: [...it.sharedBy]
      })),
      currency: currency.value,
      savedAt: Date.now()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save bill splitter data')
  }
}

const loadFromStorage = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return
  try {
    const result = normalizeData(JSON.parse(saved))
    if (!result.ok) return
    people.value = result.people.length ? result.people : [{ id: 1, name: '' }]
    items.value = result.items
    currency.value = result.currency
    currencyCustomVisible.value = !currencyPresets.includes(result.currency)
  } catch (e) {
    console.warn('Failed to load saved data')
  }
}

const clearStorage = () => {
  localStorage.removeItem(STORAGE_KEY)
}

watch([people, items, currency], () => {
  saveToStorage()
}, { deep: true })

const personInputs = ref([])
const descriptionInputs = ref([])
const costInputs = ref([])
const paidBySelects = ref([])

const addPerson = () => {
  people.value.push({ id: nextPersonId(), name: '' })
  nextTick(() => {
    const lastIndex = people.value.length - 1
    personInputs.value[lastIndex]?.focus()
    personInputs.value[lastIndex]?.select()
  })
}

const removePerson = (index) => {
  if (people.value.length <= 1) return
  const snapshot = { ...people.value[index] }
  const itemsSnapshot = JSON.parse(JSON.stringify(items.value))
  const removedId = snapshot.id
  people.value.splice(index, 1)
  personInputs.value.splice(index, 1)

  items.value.forEach(item => {
    item.sharedBy = item.sharedBy.filter(id => id !== removedId)
    if (item.paidBy === removedId) {
      item.paidBy = people.value[0]?.id ?? null
    }
  })

  showToast(`${personLabel(snapshot, index)} removed.`, 'info', {
    label: 'Undo',
    run: () => {
      people.value.splice(Math.min(index, people.value.length), 0, snapshot)
      items.value = itemsSnapshot
    }
  })
}

const addItem = () => {
  items.value.push({
    id: nextItemId(),
    description: '',
    cost: '',
    paidBy: people.value[0]?.id ?? null,
    sharedBy: []
  })
  nextTick(() => {
    descriptionInputs.value[items.value.length - 1]?.focus()
  })
}

const removeItem = (index) => {
  const snapshot = { ...items.value[index], sharedBy: [...items.value[index].sharedBy] }
  items.value.splice(index, 1)
  descriptionInputs.value.splice(index, 1)
  costInputs.value.splice(index, 1)
  paidBySelects.value.splice(index, 1)

  showToast(`Item ${index + 1} removed.`, 'info', {
    label: 'Undo',
    run: () => {
      items.value.splice(Math.min(index, items.value.length), 0, snapshot)
    }
  })
}

const toggleShare = (item, personId) => {
  const i = item.sharedBy.indexOf(personId)
  if (i >= 0) item.sharedBy.splice(i, 1)
  else item.sharedBy.push(personId)
}

const selectAllSharedBy = (item) => {
  item.sharedBy = people.value.map(p => p.id)
}

const clearAllSharedBy = (item) => {
  item.sharedBy = []
}

const requestClear = () => {
  if (confirmingClear.value) {
    people.value = [{ id: 1, name: '' }]
    items.value = []
    personInputs.value = []
    descriptionInputs.value = []
    costInputs.value = []
    paidBySelects.value = []
    clearStorage()
    confirmingClear.value = false
    if (confirmTimer) clearTimeout(confirmTimer)
    return
  }
  confirmingClear.value = true
  if (confirmTimer) clearTimeout(confirmTimer)
  confirmTimer = setTimeout(() => { confirmingClear.value = false }, 4000)
}

const addSampleData = () => {
  people.value = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' }
  ]
  items.value = [
    { id: 1, description: 'Dinner at restaurant', cost: '1200.00', paidBy: 1, sharedBy: [1, 2, 3] },
    { id: 2, description: 'Pathao delivery', cost: '400', paidBy: 2, sharedBy: [1, 2] },
    { id: 3, description: 'Movie tickets', cost: '900.00', paidBy: 3, sharedBy: [2, 3] }
  ]
  showToast('Sample data loaded.', 'success')
}

const exportData = () => {
  const data = {
    version: 2,
    currency: currency.value,
    people: people.value.map(p => ({ id: p.id, name: p.name })),
    items: items.value.map(it => ({
      id: it.id,
      description: it.description,
      cost: it.cost,
      paidBy: it.paidBy,
      sharedBy: [...it.sharedBy]
    })),
    exportedAt: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bill-split-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('JSON exported.', 'success')
}

const exportImage = async () => {
  if (!exportNode.value || isExporting.value) return
  isExporting.value = true
  try {
    if (document.fonts?.ready) await document.fonts.ready
    const dataUrl = await toPng(exportNode.value, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: '#FCF9F2',
      style: {
        position: 'static',
        left: '0',
        top: '0',
        margin: '0',
        transform: 'none',
        pointerEvents: 'auto'
      }
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `bill-split-${new Date().toISOString().split('T')[0]}.png`
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

const handleImportFile = (e) => {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const result = normalizeData(JSON.parse(event.target?.result))
      if (!result.ok) {
        showToast(result.error, 'error')
        return
      }
      people.value = result.people.length ? result.people : [{ id: 1, name: '' }]
      items.value = result.items
      currency.value = result.currency
      currencyCustomVisible.value = !currencyPresets.includes(result.currency)
      personInputs.value = []
      descriptionInputs.value = []
      costInputs.value = []
      paidBySelects.value = []
      importExportMode.value = null
      showToast(result.notes.length ? `Import successful! ${result.notes.join(' ')}` : 'Import successful!', 'success')
    } catch (err) {
      showToast('Could not parse that file. Is it valid JSON?', 'error')
    }
  }
  reader.readAsText(file)
}

const copyShareLink = () => {
  const lines = [`Bill Split — ${todayLabel.value}`, `Total: ${fmt(totalAmount.value)}`, '']
  lines.push('Items:')
  items.value.forEach(item => {
    const sharers = item.sharedBy.map(id => nameOf(id)).join(', ') || '—'
    lines.push(`- ${item.description || 'Untitled'}: ${fmt(parseFloat(item.cost) || 0)} (paid by ${nameOf(item.paidBy)}; shared: ${sharers})`)
  })
  lines.push('', 'Balances:')
  people.value.forEach((p, i) => {
    const b = balancesCents.value[p.id] || 0
    lines.push(`${personLabel(p, i)}: ${b > 0 ? '+' : ''}${fmtCents(b)}`)
  })
  if (settlements.value.length) {
    lines.push('', 'Settlements:')
    settlements.value.forEach(s => {
      lines.push(`${nameOf(s.fromId)} pays ${nameOf(s.toId)} ${fmtCents(s.cents)}`)
    })
  }

  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    showToast('Summary copied.', 'success')
  }).catch(() => {
    showToast('Could not copy to clipboard.', 'error')
  })
}

const onCurrencyChange = (e) => {
  if (e.target.value === 'other') {
    currencyCustomVisible.value = true
  } else {
    currency.value = e.target.value
    currencyCustomVisible.value = false
  }
}

const selectCurrencyValue = computed(() =>
  currencyPresets.includes(currency.value) ? currency.value : 'other'
)

const receiptEl = ref(null)
const modalEl = ref(null)
const fileInputEl = ref(null)
let lastFocused = null

const scrollToReceipt = () => {
  receiptEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const trapModalKeydown = (e) => {
  if (e.key !== 'Tab' || !modalEl.value) return
  const focusables = modalEl.value.querySelectorAll('input, button, select, [tabindex]:not([tabindex="-1"])')
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(importExportMode, async (mode, prev) => {
  if (mode === 'import') {
    lastFocused = document.activeElement
    await nextTick()
    fileInputEl.value?.focus()
  } else if (prev === 'import' && lastFocused) {
    lastFocused.focus?.()
    lastFocused = null
  }
})

const handleGlobalKeydown = (e) => {
  if (importExportMode.value) return

  if (e.ctrlKey && e.key === 'n' && !e.shiftKey) {
    e.preventDefault()
    addItem()
  }

  if (e.ctrlKey && e.shiftKey && e.key === 'N') {
    e.preventDefault()
    addPerson()
  }

  if (e.ctrlKey && e.key === 'e') {
    e.preventDefault()
    exportData()
  }

  if (e.ctrlKey && e.key === 'i') {
    e.preventDefault()
    importExportMode.value = 'import'
  }

  if (e.key === 'Escape' && importExportMode.value) {
    importExportMode.value = null
  }
}

const handleItemKeydown = (e, itemIndex, field) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (field === 'description') {
      costInputs.value[itemIndex]?.focus()
    } else if (field === 'cost') {
      paidBySelects.value[itemIndex]?.focus()
    } else if (field === 'paidBy') {
      const firstCheckbox = document.querySelector(`#item-${itemIndex} .shared-checkbox`)
      firstCheckbox?.focus()
    }
  }

  if (e.key === 'Tab' && !e.shiftKey && field === 'paidBy') {
    e.preventDefault()
    const firstCheckbox = document.querySelector(`#item-${itemIndex} .shared-checkbox`)
    firstCheckbox?.focus()
  }
}

const handleSharedByKeydown = (e, itemIndex, personIndex) => {
  const item = items.value[itemIndex]
  const person = people.value[personIndex]
  if (!item || !person) return

  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    toggleShare(item, person.id)
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault()
    if (personIndex < people.value.length - 1) {
      nextTick(() => {
        document.querySelector(`#item-${itemIndex} .shared-checkbox[data-person="${personIndex + 1}"]`)?.focus()
      })
    }
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (personIndex > 0) {
      nextTick(() => {
        document.querySelector(`#item-${itemIndex} .shared-checkbox[data-person="${personIndex - 1}"]`)?.focus()
      })
    }
  }

  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault()
    addItem()
    nextTick(() => {
      descriptionInputs.value[items.value.length - 1]?.focus()
    })
  }

  if (e.key === 'Tab' && e.shiftKey) {
    e.preventDefault()
    paidBySelects.value[itemIndex]?.focus()
  }
}

const handlePersonKeydown = (e, index) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    addPerson()
  }

  if (e.key === 'ArrowDown' && index < people.value.length - 1) {
    e.preventDefault()
    personInputs.value[index + 1]?.focus()
  }

  if (e.key === 'ArrowUp' && index > 0) {
    e.preventDefault()
    personInputs.value[index - 1]?.focus()
  }

  if (e.key === 'Backspace' && people.value[index].name.trim() === '' && people.value.length > 1) {
    e.preventDefault()
    removePerson(index)
    nextTick(() => {
      personInputs.value[Math.max(0, index - 1)]?.focus()
    })
  }
}

onMounted(() => {
  loadFromStorage()
  window.addEventListener('keydown', handleGlobalKeydown, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown, true)
  if (totalRaf) cancelAnimationFrame(totalRaf)
  if (confirmTimer) clearTimeout(confirmTimer)
})
</script>

<template>
  <div class="max-w-7xl mx-auto p-4 sm:p-6 pb-24 lg:pb-6 bg-cream min-h-screen">
    <header class="mb-8 rise" style="animation-delay: 0ms">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="font-display text-3xl font-bold text-ink mb-2 tracking-tight">
            Bill Splitter
          </h1>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-warm-muted text-sm">
            <span><kbd class="px-1.5 py-0.5 bg-cream border border-warm-border rounded text-xs font-mono">Ctrl+N</kbd> New item</span>
            <span><kbd class="px-1.5 py-0.5 bg-cream border border-warm-border rounded text-xs font-mono">Ctrl+Shift+N</kbd> New person</span>
            <span><kbd class="px-1.5 py-0.5 bg-cream border border-warm-border rounded text-xs font-mono">Enter</kbd> Next field</span>
            <span><kbd class="px-1.5 py-0.5 bg-cream border border-warm-border rounded text-xs font-mono">Space</kbd> Toggle share</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 items-end">
          <label class="flex flex-col gap-1 text-xs text-warm-muted">
            Currency
            <div class="flex gap-2">
              <select
                :value="selectCurrencyValue"
                @change="onCurrencyChange"
                class="min-h-[44px] px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              >
                <option v-for="c in currencyPresets" :key="c" :value="c">{{ c }}</option>
                <option value="other">Custom…</option>
              </select>
              <input
                v-if="currencyCustomVisible"
                v-model="currency"
                type="text"
                maxlength="5"
                placeholder="Sym"
                class="w-20 min-h-[44px] px-2 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                title="Currency symbol shown on all amounts"
              />
            </div>
          </label>
          <button
            @click="exportImage"
            :disabled="isExporting"
            class="min-h-[44px] px-4 py-2 bg-coral text-white rounded-sm hover:bg-coral/80 transition-colors text-sm font-medium flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:opacity-60"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            {{ isExporting ? 'Rendering…' : 'Export Image' }}
          </button>
          <button
            @click="exportData"
            class="min-h-[44px] px-4 py-2 bg-mint text-ink rounded-sm hover:bg-mint/80 transition-colors text-sm font-medium flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Export
          </button>
          <button
            @click="importExportMode = 'import'"
            class="min-h-[44px] px-4 py-2 bg-sky text-white rounded-sm hover:bg-sky/80 transition-colors text-sm font-medium flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Import
          </button>
        </div>
      </div>
    </header>

    <div
      v-if="importExportMode === 'import'"
      ref="modalEl"
      class="fixed inset-0 bg-ink/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      @keydown="trapModalKeydown"
    >
      <div class="bg-warm-surface p-6 rounded-sm max-w-md w-full mx-4 shadow-2xl">
        <h3 id="import-modal-title" class="font-display text-lg font-bold text-ink mb-4">Import Bill Data</h3>
        <p class="text-sm text-warm-muted mb-4">Select a JSON file previously exported from Bill Splitter.</p>
        <input ref="fileInputEl" type="file" accept=".json,application/json" @change="handleImportFile" class="w-full mb-4 file:mr-4 file:py-2 file:px-4 file:min-h-[44px] file:rounded-sm file:border-0 file:bg-coral file:text-white hover:file:bg-coral/80 file:cursor-pointer" />
        <div class="flex justify-end">
          <button @click="importExportMode = null" class="min-h-[44px] px-4 py-2 bg-warm-surface border border-warm-border rounded-sm hover:bg-cream">Cancel</button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-8 items-start">
      <div class="space-y-6">
        <section class="bg-warm-surface border border-warm-border p-6 rounded-sm rise" style="animation-delay: 60ms">
          <h2 class="font-display text-xl font-bold text-ink flex items-center mb-4">
            <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>
            People
          </h2>

          <div class="space-y-2">
            <div v-for="(person, index) in people" :key="person.id" class="flex items-center space-x-2">
              <input
                v-model="person.name"
                @keydown="handlePersonKeydown($event, index)"
                :ref="el => personInputs[index] = el"
                type="text"
                :placeholder="`Person ${index + 1}`"
                class="flex-1 min-h-[44px] px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              />
              <button
                v-if="people.length > 1"
                @click="removePerson(index)"
                class="p-2 min-h-[44px] min-w-[44px] text-coral hover:bg-coral/10 rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                :aria-label="`Remove ${personLabel(person, index)}`"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <button
              @click="addPerson"
              class="w-full min-h-[44px] px-3 py-2 bg-sky text-white rounded-sm hover:bg-sky/80 transition-colors flex items-center justify-center text-sm mt-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-warm-surface"
            >
              <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add Person
            </button>
          </div>
        </section>

        <section class="bg-warm-surface border border-warm-border p-6 rounded-sm rise" style="animation-delay: 120ms">
          <h2 class="font-display text-xl font-bold text-ink flex items-center mb-4">
            <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Items
          </h2>

          <TransitionGroup name="chit" tag="div" class="space-y-4">
            <div
              v-for="(item, index) in items"
              :key="item.id"
              :id="`item-${index}`"
              class="border border-warm-border rounded-sm p-4 bg-warm-surface"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs text-warm-muted font-mono">#{{ index + 1 }}</span>
                <button
                  @click="removeItem(index)"
                  class="p-1 min-h-[44px] min-w-[44px] -my-2 text-coral hover:bg-coral/10 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                  :aria-label="`Remove item ${index + 1}`"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <input
                v-model="item.description"
                @keydown="handleItemKeydown($event, index, 'description')"
                :ref="el => descriptionInputs[index] = el"
                type="text"
                :placeholder="`Item ${index + 1} description`"
                class="w-full min-h-[44px] px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              />

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <div>
                  <label class="block text-sm font-medium text-warm-muted mb-1">
                    Cost ({{ currency }})
                  </label>
                  <input
                    v-model="item.cost"
                    @keydown="handleItemKeydown($event, index, 'cost')"
                    :ref="el => costInputs[index] = el"
                    type="number"
                    inputmode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="w-full min-h-[44px] px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-warm-muted mb-1">
                    Paid by
                  </label>
                  <select
                    v-model="item.paidBy"
                    @keydown="handleItemKeydown($event, index, 'paidBy')"
                    :ref="el => paidBySelects[index] = el"
                    class="w-full min-h-[44px] px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                  >
                    <option
                      v-for="(person, personIndex) in people"
                      :key="person.id"
                      :value="person.id"
                    >
                      {{ personLabel(person, personIndex) }}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="block text-sm font-medium text-warm-muted">
                    Shared by
                  </label>
                  <div class="flex space-x-2">
                    <button
                      @click="selectAllSharedBy(item)"
                      class="px-2 py-1 min-h-[32px] bg-mint text-white text-xs rounded hover:bg-mint/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                    >
                      All
                    </button>
                    <button
                      @click="clearAllSharedBy(item)"
                      class="px-2 py-1 min-h-[32px] bg-ink dark:bg-[#1C1C1E] text-white text-xs rounded-sm hover:bg-coral transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2" role="group">
                  <label
                    v-for="(person, personIndex) in people"
                    :key="person.id"
                    class="flex items-center space-x-2 px-3 py-2 min-h-[44px] rounded-sm cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-coral"
                    :class="item.sharedBy.includes(person.id)
                      ? 'bg-coral/10 text-coral border border-coral/30'
                      : 'bg-cream text-warm-muted hover:bg-coral/10'"
                  >
                    <input
                      :checked="item.sharedBy.includes(person.id)"
                      @change="toggleShare(item, person.id)"
                      @keydown="handleSharedByKeydown($event, index, personIndex)"
                      type="checkbox"
                      class="sr-only shared-checkbox"
                      :data-person="personIndex"
                      tabindex="-1"
                    />
                    <span
                      class="w-4 h-4 flex items-center justify-center rounded border transition-colors"
                      :class="item.sharedBy.includes(person.id)
                        ? 'bg-coral border-coral text-white'
                        : 'border-warm-border'"
                    >
                      <svg v-if="item.sharedBy.includes(person.id)" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                    </span>
                    <span class="text-sm font-medium">{{ personLabel(person, personIndex) }}</span>
                  </label>
                </div>
              </div>
            </div>
          </TransitionGroup>

          <button
            @click="addItem"
            class="w-full min-h-[44px] px-3 py-2 bg-mint text-ink rounded-sm hover:bg-mint/80 transition-colors flex items-center justify-center text-sm mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-warm-surface"
          >
            <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add Item
          </button>

          <div v-if="items.length === 0" class="text-center py-10 text-warm-muted">
            <p class="mb-2">No items yet — add one to start splitting.</p>
            <p class="text-xs">Press <kbd class="px-2 py-1 bg-cream border border-warm-border rounded text-xs font-mono">Ctrl+N</kbd> or use the button above.</p>
          </div>
        </section>

        <section class="bg-warm-surface border border-warm-border p-6 rounded-sm rise" style="animation-delay: 180ms">
          <h2 class="font-display text-xl font-bold text-ink mb-4">Quick Actions</h2>
          <div class="flex flex-wrap gap-2">
            <button
              @click="addSampleData"
              class="px-4 py-2 min-h-[44px] bg-sky text-white rounded-sm hover:bg-sky/80 transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-warm-surface"
            >
              Sample Data
            </button>
            <button
              @click="copyShareLink"
              class="px-4 py-2 min-h-[44px] bg-ink dark:bg-[#1C1C1E] text-white rounded-sm hover:bg-coral transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-warm-surface"
            >
              Copy Summary
            </button>
            <button
              @click="requestClear"
              class="px-4 py-2 min-h-[44px] rounded-sm transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-warm-surface"
              :class="confirmingClear
                ? 'bg-coral text-white animate-pulse'
                : 'bg-coral/10 text-coral hover:bg-coral/20'"
            >
              {{ confirmingClear ? 'Click again to confirm' : 'Clear All' }}
            </button>
          </div>
        </section>
      </div>

      <aside ref="receiptEl" class="lg:sticky lg:top-6 space-y-6 scroll-mt-4">
        <div class="rise" style="animation-delay: 100ms">
          <div class="relative drop-shadow-[0_10px_30px_rgba(28,28,30,0.10)]">
            <svg viewBox="0 0 480 10" preserveAspectRatio="none" class="block w-full h-2.5 fill-warm-surface"><path :d="scallopTop"/></svg>
            <div class="bg-warm-surface px-6 py-6 space-y-6">
              <div class="flex items-baseline justify-between">
                <h2 class="font-display text-2xl font-bold text-ink tracking-tight">Bill Split</h2>
                <span class="text-xs uppercase tracking-wider text-warm-muted">{{ todayLabel }}</span>
              </div>

              <div class="text-xs uppercase tracking-wider text-warm-muted flex flex-wrap gap-x-3">
                <span>{{ people.length }} {{ people.length === 1 ? 'person' : 'people' }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}</span>
              </div>

              <div>
                <h3 class="text-xs uppercase tracking-wider text-warm-muted mb-3">People</h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="(person, index) in people"
                    :key="person.id"
                    class="px-2.5 py-1 bg-cream border border-warm-border rounded-sm text-sm text-ink"
                  >
                    {{ personLabel(person, index) }}
                  </span>
                </div>
              </div>

              <div v-if="items.length > 0">
                <h3 class="text-xs uppercase tracking-wider text-warm-muted mb-3">Items</h3>
                <div class="space-y-3">
                  <div v-for="(item, index) in items" :key="item.id">
                    <div class="flex items-baseline gap-2 text-sm">
                      <span class="text-ink truncate">{{ item.description || `Item ${index + 1}` }}</span>
                      <span class="flex-1 border-b border-dotted border-warm-border -translate-y-1" aria-hidden="true"></span>
                      <span class="text-ink font-medium tabular-nums shrink-0">{{ fmt(parseFloat(item.cost) || 0) }}</span>
                    </div>
                    <div class="text-xs text-warm-muted mt-0.5">
                      Paid by {{ nameOf(item.paidBy) }}
                      <template v-if="item.sharedBy.length">
                        · Split {{ item.sharedBy.length }} way{{ item.sharedBy.length === 1 ? '' : 's' }} ({{ item.sharedBy.map(nameOf).join(', ') }})
                      </template>
                      <template v-else> · Not shared</template>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="text-sm text-warm-muted py-2">
                Add items to see the breakdown.
              </div>

              <div class="border-t border-dashed border-warm-border pt-4">
                <div class="flex items-baseline justify-between">
                  <span class="text-xs uppercase tracking-wider text-warm-muted">Total</span>
                  <span class="font-display text-3xl font-bold text-ink tabular-nums">
                    {{ fmt(animatedTotal) }}
                  </span>
                </div>
              </div>

              <div class="border-t border-dashed border-warm-border pt-4">
                <h3 class="text-xs uppercase tracking-wider text-warm-muted mb-3">Balances</h3>
                <div class="space-y-2">
                  <div
                    v-for="(person, index) in people"
                    :key="person.id"
                    class="flex items-baseline gap-2 text-sm"
                  >
                    <span class="text-ink">{{ personLabel(person, index) }}</span>
                    <span class="flex-1 border-b border-dotted border-warm-border -translate-y-1" aria-hidden="true"></span>
                    <span
                      class="font-medium tabular-nums shrink-0"
                      :class="(balancesCents[person.id] || 0) > 0 ? 'text-mint' :
                              (balancesCents[person.id] || 0) < 0 ? 'text-coral' : 'text-warm-muted'"
                    >
                      {{ (balancesCents[person.id] || 0) > 0 ? '+' : '' }}{{ fmtCents(balancesCents[person.id] || 0) }}
                    </span>
                  </div>
                </div>
                <div class="mt-3 text-xs text-warm-muted space-y-0.5">
                  <p><span class="text-mint font-medium">Green</span> = gets money back · <span class="text-coral font-medium">Red</span> = owes money</p>
                </div>
              </div>

              <div class="border-t border-dashed border-warm-border pt-4">
                <h3 class="text-xs uppercase tracking-wider text-warm-muted mb-3">Settle up</h3>
                <div v-if="settlements.length === 0" class="text-sm text-warm-muted">
                  {{ items.length === 0 ? 'Add items to see who owes whom.' : 'All settled up.' }}
                </div>
                <TransitionGroup v-else name="chit" tag="div" class="space-y-2">
                  <div
                    v-for="(settlement, sIndex) in settlements"
                    :key="`${settlement.fromId}-${settlement.toId}`"
                    class="flex items-center justify-between gap-3 p-3 bg-cream rounded-sm border-l-4 border-coral"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="w-5 h-5 shrink-0 bg-ink text-[10px] font-bold text-white rounded-sm flex items-center justify-center font-display">
                        {{ sIndex + 1 }}
                      </span>
                      <span class="text-sm text-ink truncate">
                        <span class="font-medium">{{ nameOf(settlement.fromId) }}</span>
                        <span class="text-warm-muted"> → </span>
                        <span class="font-medium">{{ nameOf(settlement.toId) }}</span>
                      </span>
                    </div>
                    <span class="text-sm font-bold text-ink tabular-nums shrink-0">
                      {{ fmtCents(settlement.cents) }}
                    </span>
                  </div>
                </TransitionGroup>
              </div>

              <p class="text-[10px] text-warm-muted text-center pt-2 border-t border-dashed border-warm-border">
                swapnilupadhyay.com.np/tools/bill-splitter
              </p>
            </div>
            <svg viewBox="0 0 480 10" preserveAspectRatio="none" class="block w-full h-2.5 fill-warm-surface"><path :d="scallopBottom"/></svg>
          </div>
        </div>
      </aside>
    </div>

    <div
      ref="exportNode"
      class="fixed left-[-10000px] top-0 w-[480px] p-6 select-none pointer-events-none"
      style="background: #FCF9F2"
      aria-hidden="true"
    >
      <div class="text-[#1C1C1E]" style="font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif">
        <svg viewBox="0 0 480 10" preserveAspectRatio="none" class="block w-full h-2.5" style="fill: #FFFFFF"><path :d="scallopTop"/></svg>
        <div style="background: #FFFFFF" class="px-6 py-6 space-y-5">
          <div class="flex items-baseline justify-between">
            <h2 class="text-2xl font-bold tracking-tight" style="font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; color: #1C1C1E">Bill Split</h2>
            <span class="text-xs uppercase tracking-wider" style="color: #8B8076">{{ todayLabel }}</span>
          </div>

          <div class="text-xs uppercase tracking-wider flex flex-wrap gap-x-3" style="color: #8B8076">
            <span>{{ people.length }} {{ people.length === 1 ? 'person' : 'people' }}</span>
            <span>·</span>
            <span>{{ items.length }} {{ items.length === 1 ? 'item' : 'items' }}</span>
          </div>

          <div>
            <h3 class="text-xs uppercase tracking-wider mb-2" style="color: #8B8076">People</h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(person, index) in people"
                :key="person.id"
                class="px-2.5 py-1 rounded-sm text-sm border"
                style="background: #FCF9F2; border-color: #EAE2D6; color: #1C1C1E"
              >
                {{ personLabel(person, index) }}
              </span>
            </div>
          </div>

          <div v-if="items.length > 0">
            <h3 class="text-xs uppercase tracking-wider mb-2" style="color: #8B8076">Items</h3>
            <div class="space-y-2.5">
              <div v-for="(item, index) in items" :key="item.id">
                <div class="flex items-baseline gap-2 text-sm">
                  <span class="truncate" style="color: #1C1C1E">{{ item.description || `Item ${index + 1}` }}</span>
                  <span class="flex-1 border-b border-dotted -translate-y-1" style="border-color: #EAE2D6" aria-hidden="true"></span>
                  <span class="font-medium tabular-nums shrink-0" style="color: #1C1C1E">{{ fmt(parseFloat(item.cost) || 0) }}</span>
                </div>
                <div class="text-xs mt-0.5" style="color: #8B8076">
                  Paid by {{ nameOf(item.paidBy) }}
                  <template v-if="item.sharedBy.length">
                    · Split {{ item.sharedBy.length }} way{{ item.sharedBy.length === 1 ? '' : 's' }} ({{ item.sharedBy.map(nameOf).join(', ') }})
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-1" style="border-top: 1px dashed #EAE2D6">
            <div class="flex items-baseline justify-between pt-3">
              <span class="text-xs uppercase tracking-wider" style="color: #8B8076">Total</span>
              <span class="text-3xl font-bold tabular-nums" style="font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; color: #1C1C1E">
                {{ fmt(totalAmount) }}
              </span>
            </div>
          </div>

          <div style="border-top: 1px dashed #EAE2D6" class="pt-3">
            <h3 class="text-xs uppercase tracking-wider mb-2" style="color: #8B8076">Balances</h3>
            <div class="space-y-1.5">
              <div
                v-for="(person, index) in people"
                :key="person.id"
                class="flex items-baseline gap-2 text-sm"
              >
                <span style="color: #1C1C1E">{{ personLabel(person, index) }}</span>
                <span class="flex-1 border-b border-dotted -translate-y-1" style="border-color: #EAE2D6" aria-hidden="true"></span>
                <span
                  class="font-medium tabular-nums shrink-0"
                  :style="{ color: (balancesCents[person.id] || 0) > 0 ? '#06D6A0' : (balancesCents[person.id] || 0) < 0 ? '#FF5A3D' : '#8B8076' }"
                >
                  {{ (balancesCents[person.id] || 0) > 0 ? '+' : '' }}{{ fmtCents(balancesCents[person.id] || 0) }}
                </span>
              </div>
            </div>
          </div>

          <div style="border-top: 1px dashed #EAE2D6" class="pt-3">
            <h3 class="text-xs uppercase tracking-wider mb-2" style="color: #8B8076">Settle up</h3>
            <div v-if="settlements.length === 0" class="text-sm" style="color: #8B8076">
              {{ items.length === 0 ? 'Add items to see who owes whom.' : 'All settled up.' }}
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="(settlement, sIndex) in settlements"
                :key="`${settlement.fromId}-${settlement.toId}`"
                class="flex items-center justify-between gap-3 p-3 rounded-sm border-l-4"
                style="background: #FCF9F2; border-color: #FF5A3D"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="w-5 h-5 shrink-0 rounded-sm flex items-center justify-center text-[10px] font-bold"
                    style="background: #1C1C1E; color: #FFFFFF; font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif"
                  >
                    {{ sIndex + 1 }}
                  </span>
                  <span class="text-sm truncate" style="color: #1C1C1E">
                    <span class="font-medium">{{ nameOf(settlement.fromId) }}</span>
                    <span style="color: #8B8076"> → </span>
                    <span class="font-medium">{{ nameOf(settlement.toId) }}</span>
                  </span>
                </div>
                <span class="text-sm font-bold tabular-nums shrink-0" style="color: #1C1C1E">
                  {{ fmtCents(settlement.cents) }}
                </span>
              </div>
            </div>
          </div>

          <p class="text-[10px] text-center pt-2" style="border-top: 1px dashed #EAE2D6; color: #8B8076">
            swapnilupadhyay.com.np/tools/bill-splitter
          </p>
        </div>
        <svg viewBox="0 0 480 10" preserveAspectRatio="none" class="block w-full h-2.5" style="fill: #FFFFFF"><path :d="scallopBottom"/></svg>
      </div>
    </div>

    <div class="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-warm-surface border-t border-warm-border px-4 py-3 flex items-center justify-between gap-3 rise" style="animation-delay: 200ms">
      <div class="min-w-0">
        <div class="text-xs uppercase tracking-wider text-warm-muted">Total</div>
        <div class="font-display text-lg font-bold text-ink tabular-nums">{{ fmt(animatedTotal) }}</div>
      </div>
      <button
        @click="scrollToReceipt"
        class="min-h-[44px] px-4 bg-coral text-white text-sm font-medium rounded-sm flex items-center gap-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
      >
        {{ settlements.length ? `${settlements.length} transfer${settlements.length === 1 ? '' : 's'}` : 'View receipt' }}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
      </button>
    </div>

    <TransitionGroup
      tag="div"
      name="chit"
      aria-live="polite"
      class="fixed bottom-20 right-4 lg:bottom-4 z-50 flex flex-col gap-2 items-end"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="px-4 py-3 rounded-sm shadow-lg text-sm font-medium flex items-center gap-2 bg-warm-surface border border-warm-border border-l-4 max-w-xs"
        :class="t.type === 'success' ? 'border-l-mint' : t.type === 'error' ? 'border-l-coral' : 'border-l-sky'"
      >
        <span>{{ t.message }}</span>
        <button
          v-if="t.action"
          @click="runToastAction(t)"
          class="ml-1 shrink-0 text-coral font-semibold underline underline-offset-2 hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral rounded"
        >
          {{ t.action.label }}
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
@keyframes bs-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.rise {
  animation: bs-rise 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.chit-enter-active {
  transition: all 0.25s ease;
}

.chit-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.chit-leave-active {
  transition: all 0.2s ease;
}

.chit-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.chit-move {
  transition: transform 0.25s ease;
}

@media (prefers-reduced-motion: reduce) {
  .rise {
    animation: none;
  }

  .chit-enter-active,
  .chit-leave-active,
  .chit-move {
    transition: none;
  }
}
</style>
