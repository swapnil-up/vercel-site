<script setup>
import { computed, ref } from 'vue'
import { Link } from '@inertiajs/vue3'

const props = defineProps({
  book: Object,
})

const statusLabels = {
  finished: 'Finished',
  reading: 'Reading',
  want: 'Want to read',
  abandoned: 'Set aside',
}

const statusStyles = {
  finished: 'bg-mint/15 text-ink border-mint/40',
  reading: 'bg-mustard/20 text-ink border-mustard/50',
  want: 'bg-sky/10 text-ink border-sky/30',
  abandoned: 'bg-warm-muted/10 text-warm-muted border-warm-border',
}

const stats = computed(() => {
  const raw = props.book?.stats || {}
  const items = [
    { label: 'Tracked time', value: raw.total_read_time_label },
    { label: 'Estimated time', value: raw.estimated_read_time_label },
    { label: 'Progress', value: raw.progress !== null && raw.progress !== undefined ? `${raw.progress}%` : null },
    { label: 'Reading days', value: raw.reading_days },
    { label: 'Sessions', value: raw.sessions },
    { label: 'Reading pace', value: paceLabel.value },
    { label: 'Language', value: raw.language },
    { label: 'Series', value: raw.series },
  ]

  return items.filter(item => item.value !== null && item.value !== undefined && item.value !== '')
})

const statsRaw = computed(() => props.book?.stats || {})

// Per-day rows from koreader:import (page ranges, sessions). Books imported
// before that only have daily seconds, so fall back to a bars-only view.
const dayRows = computed(() => statsRaw.value.days || [])

const bars = computed(() => {
  const days = statsRaw.value.daily || []

  if (!days.length) {
    return []
  }

  const max = Math.max(...days.map(day => day.seconds), 1)

  return days.map(day => ({
    ...day,
    height: Math.max(8, Math.round((day.seconds / max) * 100)),
    label: formatDay(day.date),
    duration: durationLabel(day.seconds),
  }))
})

const summary = computed(() => {
  const raw = statsRaw.value
  const rows = dayRows.value

  if (!rows.length && !bars.value.length) {
    return ''
  }

  const parts = []

  if (rows.length > 1) {
    parts.push(`Read over ${rows.length} days, ${formatDay(rows[0].date)} to ${formatDay(rows[rows.length - 1].date)}`)
  } else if (rows.length === 1) {
    parts.push(`Read on ${formatDay(rows[0].date)}`)
  }

  if (raw.total_read_time_label) {
    parts.push(`${raw.total_read_time_label} of reading`)
  }

  if (raw.progress !== null && raw.progress !== undefined) {
    parts.push(`${raw.progress}% of the book`)
  }

  return parts.join(' · ')
})

// Reading pace as a percentage of the book per hour — percentages are the
// only language this timeline speaks, KOReader's page numbers are not.
const paceLabel = computed(() => {
  const value = statsRaw.value.percent_per_hour

  if (!value) {
    return null
  }

  return `${Number.isInteger(value) ? value : value.toFixed(1)}% per hour`
})

const highlights = computed(() => {
  const raw = statsRaw.value
  const items = []

  if (raw.streak && raw.streak > 1) {
    items.push(`${raw.streak} day streak`)
  }

  if (raw.longest_gap) {
    items.push(`Longest break ${raw.longest_gap} day${raw.longest_gap > 1 ? 's' : ''}`)
  }

  if (raw.best_day) {
    items.push(`Best day ${formatDay(raw.best_day.date)} · ${durationLabel(raw.best_day.seconds)}`)
  }

  if (raw.longest_session_label) {
    items.push(`Longest session ${raw.longest_session_label}`)
  }

  if (paceLabel.value) {
    items.push(`Averaged ${paceLabel.value}`)
  }

  return items
})

const CHART = { width: 640, height: 214, left: 44, right: 14, top: 18, bottom: 32 }

const curve = computed(() => {
  const rows = dayRows.value
  const total = statsRaw.value.total_pages || 0

  if (!rows.length || total <= 0) {
    return null
  }

  const { width, height, left, right, top, bottom } = CHART
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const bottomY = top + plotHeight

  const parse = (date) => {
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const start = parse(rows[0].date).getTime()
  const end = parse(rows[rows.length - 1].date).getTime()
  const span = Math.max(1, Math.round((end - start) / 86400000))

  const xAt = index => left + (index / span) * plotWidth
  const yAt = page => top + plotHeight - (Math.min(page, total) / total) * plotHeight

  // One entry per calendar day, holding the furthest page reached so far, so
  // days without reading stay flat instead of sloping upwards.
  const reached = new Map()
  let running = rows[0].page_from || 0
  const dates = []

  for (let index = 0; index <= span; index++) {
    const cursor = new Date(start + index * 86400000)
    const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    const row = rows.find(item => item.date === date)

    if (row && row.page_to) {
      running = Math.max(running, row.page_to)
    }

    dates.push(date)
    reached.set(date, running)
  }

  const initial = rows[0].page_from || 0
  let path = `M ${left} ${yAt(initial)}`

  dates.forEach((date, index) => {
    const x = xAt(index)
    path += ` H ${x} V ${yAt(reached.get(date))}`
  })

  const area = `${path} L ${xAt(span)} ${bottomY} L ${left} ${bottomY} Z`

  const lastIndex = dates.lastIndexOf(rows[rows.length - 1].date)
  const labels = []

  if (span <= 7) {
    dates.forEach((date, index) => labels.push({ index, text: formatDay(date) }))
  } else {
    labels.push({ index: 0, text: formatDay(dates[0]) })
    labels.push({ index: Math.round(span / 2), text: formatDay(dates[Math.round(span / 2)]) })
    labels.push({ index: span, text: formatDay(dates[span]) })
  }

  return {
    path,
    area,
    width,
    height,
    plotWidth,
    left,
    xAt,
    yAt,
    initial,
    final: reached.get(dates[span]),
    lastIndex,
    dates,
    grid: [0, 25, 50, 75, 100].map(percent => ({
      percent,
      y: yAt((percent / 100) * total),
      page: Math.round((percent / 100) * total),
    })),
    labels,
    stepWidth: plotWidth / span,
  }
})

const BAR_CHART = { width: 640, height: 96, left: 44, right: 14, top: 8, bottom: 16 }

const barChart = computed(() => {
  if (!bars.value.length) {
    return null
  }

  const { width, height, left, right, top, bottom } = BAR_CHART
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const rows = dayRows.value

  const parse = (date) => {
    const [year, month, date2] = date.split('-').map(Number)
    return new Date(year, month - 1, date2).getTime()
  }

  const startMs = rows.length > 1 ? parse(rows[0].date) : null
  const span = startMs === null
    ? 1
    : Math.max(1, Math.round((parse(rows[rows.length - 1].date) - startMs) / 86400000))

  const max = Math.max(...bars.value.map(day => day.seconds), 1)
  const barWidth = Math.max(6, Math.min(30, (plotWidth / (span + 1)) * 0.55))
  const fallbackStep = plotWidth / bars.value.length

  return {
    width,
    height,
    bars: bars.value.map((day, position) => {
      const index = startMs === null ? null : Math.round((parse(day.date) - startMs) / 86400000)
      const x = index === null
        ? left + (position + 0.5) * fallbackStep
        : left + (index / span) * plotWidth

      return {
        ...day,
        x,
        barWidth,
        barHeight: Math.max(4, (day.seconds / max) * (plotHeight - 4)),
        bottom: top + plotHeight,
      }
    }),
  }
})

const hovered = ref(null)

function showTip(index) {
  const date = curve.value?.dates[index]
  const row = dayRows.value.find(item => item.date === date)

  if (!row) {
    hovered.value = null

    return
  }

  hovered.value = {
    index,
    date,
    left: Math.min(88, Math.max(12, (curve.value.xAt(index) / curve.value.width) * 100)),
    ...row,
  }
}

function hideTip() {
  hovered.value = null
}

const maxDaySeconds = computed(() => Math.max(...dayRows.value.map(row => row.seconds), 1))

function intensity(row) {
  return Math.max(4, Math.round((row.seconds / maxDaySeconds.value) * 100))
}

function formatDay(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function durationLabel(seconds) {
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  return `${minutes}m`
}

const coverStyle = computed(() => {
  const source = `${props.book?.title || ''} ${props.book?.author || ''}`
  let hash = 0

  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash)
  }

  const hue = Math.abs(hash) % 360

  return {
    background: `linear-gradient(145deg, hsl(${hue} 45% 30%), hsl(${(hue + 45) % 360} 55% 16%))`,
  }
})

const initials = computed(() => (props.book?.title || '?')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(word => word[0])
  .join('')
  .toUpperCase())
</script>

<template>
  <div class="bg-cream min-h-screen">
    <article class="max-w-5xl mx-auto px-6 py-12">
      <Link href="/books" class="inline-flex items-center gap-2 text-warm-muted hover:text-coral transition-colors group mb-10">
        <span class="group-hover:-translate-x-1 transition-transform">←</span>
        Back to books
      </Link>

      <div class="grid gap-10 md:grid-cols-[220px_1fr] md:items-start">
        <div class="mx-auto w-40 md:w-full md:sticky md:top-24">
          <div
            v-if="book.hidden"
            class="w-full aspect-[2/3] rounded-sm border border-dashed border-warm-border bg-warm-surface shadow-[6px_6px_0_0_var(--color-warm-border)] flex flex-col items-center justify-center gap-3 text-warm-muted"
            aria-label="Cover withheld"
          >
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.774 3.162 10.066 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243" />
            </svg>
            <span class="text-[0.65rem] font-bold uppercase tracking-wider">Withheld</span>
          </div>
          <img
            v-else-if="book.cover_url"
            :src="book.cover_url"
            :alt="`Cover of ${book.title}`"
            class="w-full aspect-[2/3] object-cover rounded-sm border border-warm-border shadow-[6px_6px_0_0_var(--color-warm-border)]"
          />
          <div
            v-else
            class="w-full aspect-[2/3] rounded-sm border border-black/10 shadow-[6px_6px_0_0_var(--color-warm-border)] flex items-end p-4"
            :style="coverStyle"
          >
            <span class="font-display text-4xl font-bold text-white/80">{{ initials }}</span>
          </div>
        </div>

        <div>
          <header class="mb-8">
            <div class="flex flex-wrap items-center gap-3 mb-3">
              <span
                class="text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                :class="statusStyles[book.status] || statusStyles.finished"
              >
                {{ statusLabels[book.status] || book.status }}
              </span>
              <span v-if="book.finished_on" class="text-sm text-warm-muted">Finished {{ book.finished_on }}</span>
              <span v-else-if="book.started_on" class="text-sm text-warm-muted">Started {{ book.started_on }}</span>
            </div>

            <h1 class="font-display text-4xl md:text-5xl font-bold text-ink leading-tight tracking-tighter mb-2">
              {{ book.title }}
            </h1>

            <p v-if="book.author" class="text-xl text-warm-muted">{{ book.author }}</p>

            <p v-if="book.hidden" class="text-sm text-warm-muted leading-relaxed mt-2">
              Title, cover, author and notes are withheld on this one. The reading stats are not.
            </p>

            <div class="flex flex-wrap gap-2 mt-5">
              <span
                v-for="tag in book.tags"
                :key="tag"
                class="text-xs px-2.5 py-1 bg-coral/10 text-coral rounded-full"
              >
                {{ tag }}
              </span>
            </div>
          </header>

          <div v-if="book.recommended_by" class="mb-8 p-4 bg-sky/10 border border-sky/20 rounded-sm">
            <p class="text-[0.65rem] font-bold uppercase tracking-wider text-sky mb-1">Where it came from</p>
            <p class="text-ink leading-relaxed">{{ book.recommended_by }}</p>
          </div>

          <div v-if="book.started_on && book.finished_on" class="mb-8 flex items-center gap-3 text-sm text-warm-muted">
            <span>{{ book.started_on }}</span>
            <span class="flex-1 max-w-24 h-px bg-warm-border"></span>
            <span>{{ book.finished_on }}</span>
          </div>

          <div v-if="stats.length" class="mb-10 p-5 bg-warm-surface border border-warm-border rounded-sm">
            <h2 class="font-display text-sm font-bold uppercase tracking-wider text-warm-muted mb-4">Reading stats</h2>
            <dl class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div v-for="item in stats" :key="item.label">
                <dt class="text-[0.65rem] uppercase tracking-wider text-warm-muted mb-0.5">{{ item.label }}</dt>
                <dd class="font-display text-lg font-bold text-ink">{{ item.value }}</dd>
              </div>
            </dl>
          </div>

          <div v-if="bars.length" class="mb-10 p-5 bg-warm-surface border border-warm-border rounded-sm">
            <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-4">
              <h2 class="font-display text-sm font-bold uppercase tracking-wider text-warm-muted">Reading timeline</h2>
              <p v-if="summary" class="text-xs text-warm-muted">{{ summary }}</p>
            </div>

            <div v-if="highlights.length" class="flex flex-wrap gap-1.5 mb-5">
              <span
                v-for="item in highlights"
                :key="item"
                class="text-[0.65rem] px-2 py-0.5 bg-coral/10 text-coral rounded-full"
              >
                {{ item }}
              </span>
            </div>

            <div v-if="curve" class="relative mb-1" @mouseleave="hideTip">
              <svg
                :viewBox="`0 0 ${curve.width} ${curve.height}`"
                class="w-full h-auto"
                role="img"
                :aria-label="`Progress through the book. ${summary}`"
              >
                <g>
                  <line
                    v-for="line in curve.grid"
                    :key="`grid-${line.percent}`"
                    :x1="curve.left"
                    :x2="curve.width - CHART.right"
                    :y1="line.y"
                    :y2="line.y"
                    class="stroke-warm-border"
                    stroke-dasharray="2 4"
                  />
                  <text
                    v-for="line in curve.grid"
                    :key="`label-${line.percent}`"
                    :x="curve.left - 8"
                    :y="line.y + 3"
                    text-anchor="end"
                    class="fill-warm-muted"
                    style="font-size: 9px"
                  >{{ line.percent }}%</text>
                </g>

                <path :d="curve.area" class="fill-coral/10" />
                <path :d="curve.path" class="fill-none stroke-coral" stroke-width="2" stroke-linejoin="round" />

                <circle :cx="curve.left" :cy="curve.yAt(curve.initial)" r="4" class="fill-white stroke-coral" stroke-width="2" />
                <circle :cx="curve.xAt(curve.lastIndex)" :cy="curve.yAt(curve.final)" r="5" class="fill-coral stroke-white" stroke-width="2" />
                <text
                  :x="curve.xAt(curve.lastIndex)"
                  :y="curve.yAt(curve.final) - 10"
                  text-anchor="end"
                  class="fill-ink"
                  style="font-size: 10px; font-weight: 700"
                >{{ book.status === 'finished' ? 'Finished' : 'Now' }}</text>

                <line
                  v-if="hovered"
                  :x1="curve.xAt(hovered.index)"
                  :x2="curve.xAt(hovered.index)"
                  :y1="CHART.top"
                  :y2="curve.height - CHART.bottom"
                  class="stroke-coral/50"
                  stroke-dasharray="3 3"
                />

                <rect
                  v-for="index in curve.dates.length"
                  :key="`hit-${index}`"
                  :x="curve.xAt(index - 1) - curve.stepWidth / 2"
                  :y="CHART.top"
                  :width="curve.stepWidth"
                  :height="curve.height - CHART.top - CHART.bottom"
                  fill="transparent"
                  @mouseenter="showTip(index - 1)"
                />

                <text
                  v-for="label in curve.labels"
                  :key="`x-${label.index}`"
                  :x="curve.xAt(label.index)"
                  :y="curve.height - 10"
                  :text-anchor="label.index === 0 ? 'start' : label.index === curve.dates.length - 1 ? 'end' : 'middle'"
                  class="fill-warm-muted"
                  style="font-size: 10px"
                >{{ label.text }}</text>
              </svg>

              <div
                v-if="hovered"
                class="absolute top-0 -translate-x-1/2 whitespace-nowrap pointer-events-none rounded-sm border border-warm-border bg-white px-2.5 py-1.5 shadow-[3px_3px_0_0_var(--color-warm-border)]"
                :style="{ left: `${hovered.left}%` }"
              >
                <p class="font-display text-xs font-bold text-ink">
                  {{ formatDay(hovered.date) }} · {{ durationLabel(hovered.seconds) }}
                </p>
                <p v-if="hovered.percent !== null && hovered.percent !== undefined" class="text-[0.65rem] text-warm-muted">
                  {{ hovered.percent_from ?? 0 }}% → {{ hovered.percent }}% of the book
                </p>
              </div>
            </div>

            <svg
              v-if="barChart"
              :viewBox="`0 0 ${barChart.width} ${barChart.height}`"
              class="w-full h-auto"
              aria-hidden="true"
            >
              <rect
                v-for="bar in barChart.bars"
                :key="bar.date"
                :x="bar.x - bar.barWidth / 2"
                :y="bar.bottom - bar.barHeight"
                :width="bar.barWidth"
                :height="bar.barHeight"
                rx="2"
                class="fill-coral/70"
              >
                <title>{{ bar.label }}: {{ bar.duration }}</title>
              </rect>
            </svg>

            <ul v-if="dayRows.length" class="mt-4">
              <li
                class="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-warm-muted"
                aria-hidden="true"
              >
                <span class="w-16 shrink-0">Day</span>
                <span class="w-16 shrink-0">Time</span>
                <span class="flex-1"></span>
                <span class="w-28 shrink-0 text-right">Progress</span>
              </li>
              <li
                v-for="row in dayRows"
                :key="row.date"
                class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-warm-border py-2"
              >
                <span class="w-16 shrink-0 text-[0.65rem] font-bold uppercase tracking-wider text-warm-muted">{{ formatDay(row.date) }}</span>
                <span class="w-16 shrink-0 text-sm text-ink">{{ durationLabel(row.seconds) }}</span>
                <div class="order-last sm:order-none flex-1 min-w-[5rem] h-1.5 bg-warm-border/50 rounded-full overflow-hidden">
                  <div class="h-full bg-coral rounded-full" :style="{ width: `${intensity(row)}%` }"></div>
                </div>
                <span class="w-28 shrink-0 text-right text-xs text-warm-muted">
                  <template v-if="row.percent !== null && row.percent !== undefined">{{ row.percent_from ?? 0 }}% → {{ row.percent }}%</template>
                  <template v-else>—</template>
                </span>
              </li>
            </ul>
          </div>

          <details class="group mb-10 p-5 bg-warm-surface border border-warm-border rounded-sm">
            <summary class="cursor-pointer font-display text-sm font-bold uppercase tracking-wider text-warm-muted">
              What the stats mean
            </summary>
            <dl class="grid gap-3 mt-4 text-sm">
              <div>
                <dt class="font-bold text-ink">Tracked time</dt>
                <dd class="text-warm-muted leading-relaxed">Active page time recorded by KOReader. It caps each page at 2 minutes, so long page reads are undercounted.</dd>
              </div>
              <div>
                <dt class="font-bold text-ink">Estimated time</dt>
                <dd class="text-warm-muted leading-relaxed">Tracked time plus the excess from pages held between 2 and 30 minutes. Gaps over 30 minutes count as breaks, not reading.</dd>
              </div>
              <div>
                <dt class="font-bold text-ink">Sessions</dt>
                <dd class="text-warm-muted leading-relaxed">Reading stretches separated by 30 or more minutes without a page turn.</dd>
              </div>
              <div>
                <dt class="font-bold text-ink">Reading days</dt>
                <dd class="text-warm-muted leading-relaxed">Distinct Nepal-time days with reading activity.</dd>
              </div>
              <div>
                <dt class="font-bold text-ink">Progress</dt>
                <dd class="text-warm-muted leading-relaxed">How far into the book you got — the furthest point reached, out of 100%.</dd>
              </div>
              <div>
                <dt class="font-bold text-ink">The curve</dt>
                <dd class="text-warm-muted leading-relaxed">How far into the book you had read by each calendar day. Days without reading stay flat, so stalls show up as long horizontal stretches instead of hidden slopes.</dd>
              </div>
              <div>
                <dt class="font-bold text-ink">Progress each day</dt>
                <dd class="text-warm-muted leading-relaxed">Where the day started and where it finished, as a percentage of the book. KOReader's own page numbers shift with font size and screen, so percentages are what actually compare.</dd>
              </div>
              <div>
                <dt class="font-bold text-ink">Streak &amp; breaks</dt>
                <dd class="text-warm-muted leading-relaxed">Longest run of consecutive reading days, and the longest stretch in between with none.</dd>
              </div>
              <div>
                <dt class="font-bold text-ink">Best day</dt>
                <dd class="text-warm-muted leading-relaxed">The day with the most active reading time. Longest session is the single uninterrupted stretch of page turns.</dd>
              </div>
              <div>
                <dt class="font-bold text-ink">Reading pace</dt>
                <dd class="text-warm-muted leading-relaxed">Share of the book covered per hour of tracked reading — how fast the percentage moved, not how many pages flew by.</dd>
              </div>
            </dl>
          </details>

          <div v-if="book.thoughts_html" class="article-content max-w-none" v-html="book.thoughts_html" />
          <p v-else-if="book.hidden" class="text-warm-muted italic">Notes for this one are kept private.</p>
          <p v-else class="text-warm-muted italic">No notes on this one yet.</p>
        </div>
      </div>
    </article>
  </div>
</template>
