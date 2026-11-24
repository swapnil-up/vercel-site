<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  computeWacc,
  computeWaccFromEvents,
  NepseCalcError,
  NEPSE_FEE_DEFAULTS
} from '../../Utils/nepseWacc.js'

const STORAGE_KEY = 'site_nepse-wacc-data'

// State
const purchases = ref([{ id: 1, quantity: '', pricePerShare: '', date: '', brokerage: '', dpCharge: '', sebonFee: '' }])
const bonuses = ref([{ id: 1, ratio: '', date: '' }])
const rights = ref([{ id: 1, ratio: '', pricePerShare: '', date: '', brokerage: '', dpCharge: '', sebonFee: '' }])
const autoFees = ref(false)
const brokerageRate = ref('')
const dpCharge = ref(NEPSE_FEE_DEFAULTS.dpCharge)
const sebonRate = ref(NEPSE_FEE_DEFAULTS.sebonRate)
const result = ref(null)
const error = ref('')
const toasts = ref([])
const showJson = ref(false)
const nextId = ref(100)

let toastId = 0

const showToast = (message, type = 'info') => {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, type === 'error' ? 5000 : 3400)
}

// Compute WACC
const compute = () => {
  error.value = ''
  result.value = null
  try {
    const validPurchases = purchases.value
      .filter(p => p.quantity !== '' && p.pricePerShare !== '')
      .map(p => ({
        type: 'buy',
        quantity: Number(p.quantity),
        pricePerShare: Number(p.pricePerShare),
        ...(p.date ? { date: p.date } : {}),
        ...(p.brokerage !== '' ? { brokerage: Number(p.brokerage) } : {}),
        ...(p.dpCharge !== '' ? { dpCharge: Number(p.dpCharge) } : {}),
        ...(p.sebonFee !== '' ? { sebonFee: Number(p.sebonFee) } : {}),
      }))
    if (validPurchases.length === 0) {
      throw new NepseCalcError('At least one purchase is required')
    }

    const validBonuses = bonuses.value
      .filter(b => b.ratio !== '')
      .map(b => ({
        ratio: Number(b.ratio),
        ...(b.date ? { date: b.date } : {}),
      }))

    const validRights = rights.value
      .filter(r => r.ratio !== '' && r.pricePerShare !== '')
      .map(r => ({
        ratio: Number(r.ratio),
        pricePerShare: Number(r.pricePerShare),
        ...(r.date ? { date: r.date } : {}),
        ...(r.brokerage !== '' ? { brokerage: Number(r.brokerage) } : {}),
        ...(r.dpCharge !== '' ? { dpCharge: Number(r.dpCharge) } : {}),
        ...(r.sebonFee !== '' ? { sebonFee: Number(r.sebonFee) } : {}),
      }))

    const options = {
      autoCalculateFees: autoFees.value,
      ...(brokerageRate.value !== '' ? { brokerageRate: Number(brokerageRate.value) } : {}),
      dpCharge: Number(dpCharge.value),
      sebonRate: Number(sebonRate.value),
    }

    const res = computeWacc(validPurchases, validBonuses, validRights, options)
    result.value = res
    showToast('Calculation complete', 'success')
  } catch (err) {
    if (err instanceof NepseCalcError) {
      error.value = err.message
    } else {
      error.value = err.message || 'Calculation failed'
    }
    showToast(error.value, 'error')
  }
}

// Purchase CRUD
const addPurchase = () => {
  purchases.value.push({ id: nextId.value++, quantity: '', pricePerShare: '', date: '', brokerage: '', dpCharge: '', sebonFee: '' })
}
const removePurchase = (id) => {
  if (purchases.value.length <= 1) return
  purchases.value = purchases.value.filter(p => p.id !== id)
}

// Bonus CRUD
const addBonus = () => {
  bonuses.value.push({ id: nextId.value++, ratio: '', date: '' })
}
const removeBonus = (id) => {
  bonuses.value = bonuses.value.filter(b => b.id !== id)
}

// Right CRUD
const addRight = () => {
  rights.value.push({ id: nextId.value++, ratio: '', pricePerShare: '', date: '', brokerage: '', dpCharge: '', sebonFee: '' })
}
const removeRight = (id) => {
  rights.value = rights.value.filter(r => r.id !== id)
}

const clearAll = () => {
  purchases.value = [{ id: nextId.value++, quantity: '', pricePerShare: '', date: '', brokerage: '', dpCharge: '', sebonFee: '' }]
  bonuses.value = [{ id: nextId.value++, ratio: '', date: '' }]
  rights.value = [{ id: nextId.value++, ratio: '', pricePerShare: '', date: '', brokerage: '', dpCharge: '', sebonFee: '' }]
  autoFees.value = false
  brokerageRate.value = ''
  dpCharge.value = NEPSE_FEE_DEFAULTS.dpCharge
  sebonRate.value = NEPSE_FEE_DEFAULTS.sebonRate
  result.value = null
  error.value = ''
  showJson.value = false
}

// Export
const exportJson = () => {
  if (!result.value) return
  const data = {
    inputs: {
      purchases: purchases.value,
      bonuses: bonuses.value,
      rights: rights.value,
      options: {
        autoCalculateFees: autoFees.value,
        brokerageRate: brokerageRate.value || null,
        dpCharge: Number(dpCharge.value),
        sebonRate: Number(sebonRate.value),
      }
    },
    result: result.value,
    generatedAt: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nepse-wacc-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('JSON exported', 'success')
}

const exportCsv = () => {
  if (!result.value) return
  const rows = []
  rows.push(['Type', 'Quantity', 'Price/Share', 'Date', 'Brokerage', 'DP Charge', 'SEBON Fee'])
  for (const p of purchases.value) {
    if (p.quantity && p.pricePerShare) {
      rows.push(['Buy', p.quantity, p.pricePerShare, p.date || '', p.brokerage || '', p.dpCharge || '', p.sebonFee || ''])
    }
  }
  for (const b of bonuses.value) {
    if (b.ratio) {
      rows.push(['Bonus', '', (b.ratio * 100).toFixed(2) + '%', b.date || '', '', '', ''])
    }
  }
  for (const r of rights.value) {
    if (r.ratio && r.pricePerShare) {
      rows.push(['Right', '', r.pricePerShare, r.date || '', r.brokerage || '', r.dpCharge || '', r.sebonFee || ''])
    }
  }
  rows.push([])
  rows.push(['Result', 'Value'])
  rows.push(['Total Shares', result.value.totalShares])
  rows.push(['Total Cost (NPR)', result.value.totalCost.toFixed(2)])
  rows.push(['WACC (NPR)', result.value.wacc.toFixed(2)])
  rows.push(['Purchase Cost', result.value.breakdown.purchaseCost.toFixed(2)])
  rows.push(['Right Cost', result.value.breakdown.rightCost.toFixed(2)])
  rows.push(['Total Fees', result.value.breakdown.fees.toFixed(2)])
  rows.push(['Brokerage', result.value.breakdown.brokerage.toFixed(2)])
  rows.push(['DP Charge', result.value.breakdown.dpCharge.toFixed(2)])
  rows.push(['SEBON Fee', result.value.breakdown.sebonFee.toFixed(2)])
  rows.push(['Purchased Shares', result.value.breakdown.purchasedShares])
  rows.push(['Bonus Shares', result.value.breakdown.bonusShares])
  rows.push(['Right Shares', result.value.breakdown.rightShares])

  const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nepse-wacc-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('CSV exported', 'success')
}

// Persistence
const saveState = () => {
  const state = {
    purchases: purchases.value,
    bonuses: bonuses.value,
    rights: rights.value,
    autoFees: autoFees.value,
    brokerageRate: brokerageRate.value,
    dpCharge: dpCharge.value,
    sebonRate: sebonRate.value,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const loadState = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return
  try {
    const state = JSON.parse(saved)
    if (state.purchases?.length) purchases.value = state.purchases
    if (state.bonuses?.length) bonuses.value = state.bonuses
    if (state.rights?.length) rights.value = state.rights
    if (state.autoFees !== undefined) autoFees.value = state.autoFees
    if (state.brokerageRate !== undefined) brokerageRate.value = state.brokerageRate
    if (state.dpCharge !== undefined) dpCharge.value = state.dpCharge
    if (state.sebonRate !== undefined) sebonRate.value = state.sebonRate
  } catch {
    // ignore
  }
}

onMounted(() => {
  loadState()
  // initial compute if data exists
  if (purchases.value.some(p => p.quantity && p.pricePerShare)) {
    compute()
  }
})

watch([purchases, bonuses, rights, autoFees, brokerageRate, dpCharge, sebonRate], compute, { deep: true })
watch([purchases, bonuses, rights, autoFees, brokerageRate, dpCharge, sebonRate], saveState, { deep: true })

const formatNpr = (n) => new Intl.NumberFormat('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-8">
    <header class="mb-8">
      <h1 class="font-display text-4xl font-bold text-ink mb-2">NEPSE WACC Calculator</h1>
      <p class="text-warm-muted">
        Calculate weighted average acquisition cost for NEPSE holdings with bonuses, right issues, and fee breakdown.
        Uses official NEPSE brokerage slabs, DP charges, and SEBON rates.
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Input Panels -->
      <aside class="lg:col-span-3 space-y-6">
        <!-- Purchases -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-xl font-bold text-ink">Purchases</h2>
            <button @click="addPurchase" class="text-sm text-coral hover:underline">+ Add</button>
          </div>
          <p class="text-sm text-warm-muted">At least one purchase required. Fees are optional per transaction.</p>
          <div class="space-y-3">
            <div v-for="p in purchases" :key="p.id" class="grid grid-cols-2 md:grid-cols-7 gap-3 items-end" :class="{ 'opacity-50': purchases.length === 1 }">
              <div>
                <label class="block text-xs text-warm-muted mb-1">Qty</label>
                <input v-model="p.quantity" type="number" min="1" step="1" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" placeholder="100" />
              </div>
              <div>
                <label class="block text-xs text-warm-muted mb-1">Price/Share</label>
                <input v-model="p.pricePerShare" type="number" min="0.01" step="0.01" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" placeholder="500" />
              </div>
              <div>
                <label class="block text-xs text-warm-muted mb-1">Date</label>
                <input v-model="p.date" type="date" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs text-warm-muted mb-1">Brokerage</label>
                <input v-model="p.brokerage" type="number" min="0" step="0.01" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" placeholder="Auto" />
              </div>
              <div>
                <label class="block text-xs text-warm-muted mb-1">DP Charge</label>
                <input v-model="p.dpCharge" type="number" min="0" step="0.01" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" placeholder="Auto" />
              </div>
              <div>
                <label class="block text-xs text-warm-muted mb-1">SEBON Fee</label>
                <input v-model="p.sebonFee" type="number" min="0" step="0.01" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" placeholder="Auto" />
              </div>
              <div class="md:col-span-7 flex">
                <button @click="removePurchase(p.id)" class="px-3 py-2 text-red-600 hover:underline text-sm" :disabled="purchases.length <= 1">Remove</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Bonuses -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-xl font-bold text-ink">Bonus Shares</h2>
            <button @click="addBonus" class="text-sm text-coral hover:underline">+ Add</button>
          </div>
          <p class="text-sm text-warm-muted">Ratio as decimal (e.g., 0.10 = 10%). Entitlement = floor(held × ratio). No cash cost.</p>
          <div class="space-y-3">
            <div v-for="b in bonuses" :key="b.id" class="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
              <div>
                <label class="block text-xs text-warm-muted mb-1">Ratio</label>
                <input v-model="b.ratio" type="number" min="0" step="0.01" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" placeholder="0.10" />
              </div>
              <div>
                <label class="block text-xs text-warm-muted mb-1">Date</label>
                <input v-model="b.date" type="date" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" />
              </div>
              <div class="md:col-span-3 flex">
                <button @click="removeBonus(b.id)" class="px-3 py-2 text-red-600 hover:underline text-sm">Remove</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Rights -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-xl font-bold text-ink">Right Issues</h2>
            <button @click="addRight" class="text-sm text-coral hover:underline">+ Add</button>
          </div>
          <p class="text-sm text-warm-muted">Ratio as decimal (e.g., 0.25 = 1:4). Entitlement = floor(held × ratio). Cash cost = entitlement × issue price.</p>
          <div class="space-y-3">
            <div v-for="r in rights" :key="r.id" class="grid grid-cols-2 md:grid-cols-7 gap-3 items-end">
              <div>
                <label class="block text-xs text-warm-muted mb-1">Ratio</label>
                <input v-model="r.ratio" type="number" min="0" step="0.01" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" placeholder="0.25" />
              </div>
              <div>
                <label class="block text-xs text-warm-muted mb-1">Issue Price</label>
                <input v-model="r.pricePerShare" type="number" min="0.01" step="0.01" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" placeholder="300" />
              </div>
              <div>
                <label class="block text-xs text-warm-muted mb-1">Date</label>
                <input v-model="r.date" type="date" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs text-warm-muted mb-1">Brokerage</label>
                <input v-model="r.brokerage" type="number" min="0" step="0.01" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" placeholder="Auto" />
              </div>
              <div>
                <label class="block text-xs text-warm-muted mb-1">DP Charge</label>
                <input v-model="r.dpCharge" type="number" min="0" step="0.01" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" placeholder="Auto" />
              </div>
              <div>
                <label class="block text-xs text-warm-muted mb-1">SEBON Fee</label>
                <input v-model="r.sebonFee" type="number" min="0" step="0.01" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" placeholder="Auto" />
              </div>
              <div class="md:col-span-7 flex">
                <button @click="removeRight(r.id)" class="px-3 py-2 text-red-600 hover:underline text-sm">Remove</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Fee Configuration -->
        <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-4">
          <h2 class="font-display text-xl font-bold text-ink">Fee Configuration</h2>
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="autoFees" type="checkbox" class="w-4 h-4 text-coral border-warm-border focus:ring-coral" />
            <span class="text-ink">Auto-calculate fees using NEPSE defaults</span>
          </label>
          <div v-if="autoFees" class="grid grid-cols-3 gap-4 pl-7">
            <div>
              <label class="block text-xs text-warm-muted mb-1">Flat Brokerage Rate (optional)</label>
              <input v-model="brokerageRate" type="number" min="0" step="0.0001" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" placeholder="0.0036" />
              <p class="text-xs text-warm-muted mt-1">Overrides tiered slabs (e.g., 0.0036 = 0.36%)</p>
            </div>
            <div>
              <label class="block text-xs text-warm-muted mb-1">DP Charge (NPR)</label>
              <input v-model="dpCharge" type="number" min="0" step="1" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs text-warm-muted mb-1">SEBON Rate</label>
              <input v-model="sebonRate" type="number" min="0" step="0.00001" class="w-full p-2 bg-cream border border-warm-border rounded text-ink text-sm focus:border-coral focus:outline-none" />
            </div>
          </div>
          <div v-else class="pl-7 text-sm text-warm-muted">
            Fees entered per transaction will be used. Leave blank to treat as zero.
          </div>
          <details class="text-sm text-warm-muted">
            <summary class="cursor-pointer font-medium text-ink">NEPSE Fee Defaults (reference)</summary>
            <div class="mt-2 space-y-1">
              <div>Brokerage: ≤50k: 0.36% | 50k-500k: 0.33% | 500k-2M: 0.31% | 2M-10M: 0.27% | >10M: 0.24%</div>
              <div>Min brokerage: Rs. 10 | DP Charge: Rs. 25 | SEBON: 0.015%</div>
            </div>
          </details>
        </div>

        <div v-if="error" class="p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
          {{ error }}
        </div>
      </aside>

      <!-- Results Panel -->
      <main class="lg:col-span-1 space-y-6">
        <div v-if="!result" class="bg-warm-surface border-2 border-dashed border-warm-border rounded-xl p-12 text-center">
          <svg class="mx-auto h-16 w-16 text-warm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p class="mt-4 text-warm-muted text-lg">Enter purchases and click <strong class="text-ink">Calculate</strong></p>
        </div>

        <div v-else class="space-y-6">
          <!-- Key Metrics -->
          <div class="bg-gradient-to-r from-coral/10 to-amber/10 border-2 border-warm-border rounded-xl p-6 space-y-4">
            <h3 class="font-display text-lg font-bold text-ink">Key Results</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-white p-4 rounded-lg border border-warm-border">
                <p class="text-xs text-warm-muted uppercase tracking-wide">Total Shares</p>
                <p class="text-3xl font-bold text-ink font-mono">{{ result.totalShares }}</p>
              </div>
              <div class="bg-white p-4 rounded-lg border border-warm-border">
                <p class="text-xs text-warm-muted uppercase tracking-wide">WACC</p>
                <p class="text-3xl font-bold text-coral font-mono">Rs. {{ result.wacc.toFixed(2) }}</p>
              </div>
              <div class="bg-white p-4 rounded-lg border border-warm-border">
                <p class="text-xs text-warm-muted uppercase tracking-wide">Total Cost</p>
                <p class="text-2xl font-bold text-ink font-mono">Rs. {{ formatNpr(result.totalCost) }}</p>
              </div>
              <div class="bg-white p-4 rounded-lg border border-warm-border">
                <p class="text-xs text-warm-muted uppercase tracking-wide">Cash Outflow</p>
                <p class="text-2xl font-bold text-slate-600 font-mono">Rs. {{ formatNpr(result.breakdown.totalCashOutflow) }}</p>
              </div>
            </div>
          </div>

          <!-- Breakdown -->
          <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6 space-y-4">
            <h3 class="font-display text-lg font-bold text-ink">Cost Breakdown</h3>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="flex justify-between py-2 border-b border-warm-border/50">
                <span class="text-warm-muted">Purchase Principal</span>
                <span class="font-medium text-ink">Rs. {{ formatNpr(result.breakdown.purchaseCost) }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-warm-border/50">
                <span class="text-warm-muted">Right Issue Principal</span>
                <span class="font-medium text-ink">Rs. {{ formatNpr(result.breakdown.rightCost) }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-warm-border/50">
                <span class="text-warm-muted">Total Fees</span>
                <span class="font-medium text-coral">Rs. {{ formatNpr(result.breakdown.fees) }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-warm-border/50">
                <span class="text-warm-muted">└ Brokerage</span>
                <span class="font-medium text-ink">Rs. {{ formatNpr(result.breakdown.brokerage) }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-warm-border/50">
                <span class="text-warm-muted">└ DP Charge</span>
                <span class="font-medium text-ink">Rs. {{ formatNpr(result.breakdown.dpCharge) }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-warm-border/50">
                <span class="text-warm-muted">└ SEBON Fee</span>
                <span class="font-medium text-ink">Rs. {{ formatNpr(result.breakdown.sebonFee) }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-warm-border/50">
                <span class="text-warm-muted">Purchased Shares</span>
                <span class="font-medium text-ink">{{ result.breakdown.purchasedShares }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-warm-border/50">
                <span class="text-warm-muted">Bonus Shares</span>
                <span class="font-medium text-green-600">{{ result.breakdown.bonusShares }}</span>
              </div>
              <div class="flex justify-between py-2">
                <span class="text-warm-muted">Right Shares</span>
                <span class="font-medium text-amber-600">{{ result.breakdown.rightShares }}</span>
              </div>
            </div>
          </div>

          <!-- Timeline -->
          <div class="bg-warm-surface border-2 border-warm-border rounded-xl p-6">
            <h3 class="font-display text-lg font-bold text-ink mb-4">Timeline</h3>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div v-for="(t, i) in result.timeline" :key="i" class="p-3 bg-white border border-warm-border/50 rounded-lg text-sm">
                <div class="flex items-center justify-between">
                  <span class="font-medium capitalize text-ink">{{ t.type }}</span>
                  <span class="text-xs text-warm-muted">{{ t.date || 'undated' }}</span>
                </div>
                <div class="grid grid-cols-4 gap-2 mt-1 text-xs">
                  <div><span class="text-warm-muted">Shares:</span> {{ t.sharesBefore }} → <span class="font-medium">{{ t.sharesAfter }}</span></div>
                  <div><span class="text-warm-muted">Added:</span> <span class="font-medium">{{ t.sharesAdded }}</span></div>
                  <div><span class="text-warm-muted">Cost:</span> {{ formatNpr(t.costBefore) }} → <span class="font-medium">{{ formatNpr(t.costAfter) }}</span></div>
                  <div><span class="text-warm-muted">WACC:</span> <span class="font-bold text-coral">Rs. {{ t.wacc.toFixed(2) }}</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap gap-3">
            <button @click="exportJson" class="px-4 py-2 bg-warm-surface border-2 border-warm-border text-ink rounded-lg hover:bg-cream/50 text-sm">Export JSON</button>
            <button @click="exportCsv" class="px-4 py-2 bg-warm-surface border-2 border-warm-border text-ink rounded-lg hover:bg-cream/50 text-sm">Export CSV</button>
            <button @click="clearAll" class="px-4 py-2 bg-white border-2 border-warm-border text-warm-muted rounded-lg hover:bg-cream/50 text-sm">Clear All</button>
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
</style>