<script setup>
import { ref, computed, onMounted } from 'vue'
import Fuse from 'fuse.js'
import NepaliDate from 'nepali-date-converter'

const BS_MONTHS = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashoj',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
]

const branches = ref([])
const activeBranch = ref(null)
const query = ref('')
const dayFilter = ref(null)
const loading = ref(true)
const error = ref(null)

const DATA_URL = '/water/schedule.json'

onMounted(async () => {
  try {
    const res = await fetch(DATA_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    branches.value = data.branches || []
    activeBranch.value = branches.value[0]?.branch ?? null
  } catch (err) {
    error.value = err.message || 'Failed to load schedule'
  } finally {
    loading.value = false
  }
})

const branch = computed(
  () => branches.value.find((b) => b.branch === activeBranch.value) || null
)

const branchZones = computed(() => {
  const b = branch.value
  if (!b) return []
  const out = []
  for (const reservoir of b.reservoirs || []) {
    for (const zone of reservoir.zones || []) {
      out.push({
        ...zone,
        _reservoir: reservoir.name_np,
        _reservoirEn: reservoir.name_en,
        _key: `${reservoir.name_np}|${zone.dma ?? ''}|${zone.label ?? ''}|${(zone.areas_np || []).join(',')}|${zone.time_from}`,
      })
    }
  }
  return out
})

const fuse = computed(
  () =>
    new Fuse(branchZones.value, {
      keys: [
        { name: 'search_terms', weight: 0.7 },
        { name: '_reservoir', weight: 0.15 },
        { name: '_reservoirEn', weight: 0.15 },
      ],
      threshold: 0.34,
      ignoreLocation: true,
      minMatchCharLength: 2,
    })
)

const filtered = computed(() => {
  let zones = branchZones.value
  const q = query.value.trim()
  if (q) zones = fuse.value.search(q).map((r) => r.item)
  const d = dayFilter.value
  if (d) zones = zones.filter((z) => (z.days || []).includes(d))
  return zones
})

const grouped = computed(() => {
  const map = new Map()
  for (const z of filtered.value) {
    if (!map.has(z._reservoir)) {
      map.set(z._reservoir, { name: z._reservoir, nameEn: z._reservoirEn, zones: [] })
    }
    map.get(z._reservoir).zones.push(z)
  }
  return [...map.values()]
})

const totalShown = computed(() => filtered.value.length)

const BENIGN = new Set(['period_inferred', 'dma_missing'])
const notableFlags = (z) => (z.review_flags || []).filter((f) => !BENIGN.has(f))

const today = computed(() => {
  const n = new NepaliDate(new Date())
  return { year: n.getYear(), month: n.getMonth(), day: n.getDate() }
})

const todayLabel = computed(
  () => `${BS_MONTHS[today.value.month]} ${today.value.day}, ${today.value.year}`
)

const useToday = () => {
  dayFilter.value = today.value.day
}

const fmtDays = (days) => (days && days.length ? days.join(' · ') : '—')

const fmtTime = (z) => {
  if (!z.time_from) return '—'
  return `${z.time_from} – ${z.time_to || '?'}`
}

const isToday = (z) => dayFilter.value && (z.days || []).includes(dayFilter.value)
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-12">
    <header class="mb-10">
      <p class="font-mono text-xs uppercase tracking-[0.2em] text-warm-muted mb-3">
        KUKL · Water Distribution
      </p>
      <h1 class="font-display text-4xl font-bold text-ink mb-3">Where's my water?</h1>
      <p class="text-warm-muted max-w-2xl">
        Look up a locality to see which days and hours water is delivered by each
        reservoir. Data is extracted from KUKL's monthly branch schedules.
      </p>
    </header>

    <div v-if="loading" class="py-24 text-center text-warm-muted font-mono text-sm">
      loading schedule…
    </div>

    <div
      v-else-if="error"
      class="border-2 border-coral/60 bg-coral/5 rounded-lg p-6 text-ink"
    >
      <p class="font-display font-bold mb-1">Couldn't load the schedule</p>
      <p class="text-sm text-warm-muted font-mono">{{ error }}</p>
    </div>

    <template v-else>
      <!-- Branch selector -->
      <div class="flex flex-wrap gap-2 mb-6">
        <button
          v-for="b in branches"
          :key="b.branch"
          type="button"
          class="px-3 py-1.5 rounded-full border-2 font-mono text-xs uppercase tracking-wide transition-colors"
          :class="
            b.branch === activeBranch
              ? 'border-coral bg-coral text-cream'
              : 'border-warm-border text-warm-muted hover:border-coral hover:text-ink'
          "
          @click="activeBranch = b.branch"
        >
          {{ b.branch }}
        </button>
      </div>

      <!-- Controls -->
      <div class="flex flex-col sm:flex-row gap-3 mb-8">
        <div class="relative flex-1">
          <input
            v-model="query"
            type="search"
            placeholder="Search a place — Baneshwor, कुमारी क्लब, Balkhu…"
            class="w-full border-2 border-warm-border rounded-lg px-4 py-3 bg-warm-surface text-ink placeholder:text-warm-muted/70 focus:border-coral focus:outline-none"
          />
        </div>
        <div class="flex items-center gap-2 border-2 border-warm-border rounded-lg px-3 bg-warm-surface">
          <label class="font-mono text-xs uppercase tracking-wide text-warm-muted" for="day">
            Day
          </label>
          <input
            id="day"
            v-model.number="dayFilter"
            type="number"
            min="1"
            max="32"
            placeholder="—"
            class="w-16 bg-transparent text-ink py-3 focus:outline-none font-mono"
          />
          <button
            v-if="dayFilter"
            type="button"
            class="text-warm-muted hover:text-coral text-lg leading-none"
            aria-label="Clear day"
            @click="dayFilter = null"
          >
            ×
          </button>
        </div>
        <button
          type="button"
          class="px-4 py-3 rounded-lg border-2 font-mono text-xs uppercase tracking-wide transition-colors whitespace-nowrap"
          :class="
            dayFilter === today.day
              ? 'border-mint bg-mint text-ink'
              : 'border-warm-border text-warm-muted hover:border-mint hover:text-ink'
          "
          @click="useToday"
        >
          Today · {{ todayLabel }}
        </button>
      </div>

      <p class="font-mono text-xs uppercase tracking-wide text-warm-muted mb-6">
        {{ branch?.branch_np || branch?.branch }} · {{ branch?.month_bs || branch?.month_key }} ·
        {{ totalShown }} {{ totalShown === 1 ? 'zone' : 'zones' }}
      </p>

      <div v-if="!totalShown" class="py-16 text-center text-warm-muted">
        <p class="font-display text-xl text-ink mb-1">No matching locality</p>
        <p class="text-sm">Try a shorter or differently-spelled name.</p>
      </div>

      <div v-else class="space-y-10">
        <section v-for="group in grouped" :key="group.name">
          <h2 class="font-display text-xl font-bold text-ink flex items-baseline gap-3 mb-4">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-sky translate-y-[-2px]" />
            {{ group.name }}
            <span v-if="group.nameEn" class="font-mono text-xs text-warm-muted font-normal">
              {{ group.nameEn }}
            </span>
          </h2>

          <ul class="space-y-3">
            <li
              v-for="z in group.zones"
              :key="z._key"
              class="rounded-lg border-2 bg-warm-surface px-4 py-3 transition-colors"
              :class="isToday(z) ? 'border-mint' : 'border-warm-border'"
            >
              <div class="flex flex-wrap items-start gap-x-6 gap-y-2">
                <div class="min-w-[8rem]">
                  <p class="font-mono text-lg text-ink tabular-nums">
                    {{ fmtTime(z) }}
                  </p>
                  <p v-if="z.label || z.dma" class="font-mono text-[11px] text-warm-muted">
                    <span v-if="z.label">#{{ z.label }}</span>
                    <span v-if="z.dma"> · DMA {{ z.dma }}</span>
                  </p>
                </div>

                <div class="flex-1 min-w-[12rem]">
                  <div class="flex flex-wrap gap-1.5 mb-2">
                    <span
                      v-for="d in z.days"
                      :key="d"
                      class="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-1.5 rounded-md font-mono text-xs tabular-nums"
                      :class="
                        d === dayFilter
                          ? 'bg-mint text-ink'
                          : 'bg-cream text-warm-muted border border-warm-border'
                      "
                    >
                      {{ d }}
                    </span>
                    <span v-if="!z.days?.length" class="text-warm-muted text-sm">no days listed</span>
                  </div>
                  <p class="text-ink text-sm leading-relaxed">
                    <template v-for="(a, i) in z.areas_np" :key="a + i">
                      {{ a }}<span v-if="i < z.areas_np.length - 1" class="text-warm-muted">, </span>
                    </template>
                    <span v-if="!z.areas_np?.length" class="text-warm-muted">—</span>
                  </p>
                  <p v-if="z.contacts?.length" class="font-mono text-[11px] text-warm-muted mt-1">
                    ☎ {{ z.contacts.join(' · ') }}
                  </p>
                </div>

                <span
                  v-if="notableFlags(z).length"
                  class="font-mono text-[10px] uppercase tracking-wide text-coral border border-coral/40 rounded px-1.5 py-0.5 self-start"
                  :title="notableFlags(z).join(', ')"
                >
                  verify
                </span>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <p class="mt-12 font-mono text-[11px] text-warm-muted">
        Source:
        <a :href="'https://kukl.org.np/downloads/water-distribution-schedule'" class="text-coral hover:underline">
          kukl.org.np
        </a>
        · schedules may change; confirm with your branch office.
      </p>
    </template>
  </div>
</template>
