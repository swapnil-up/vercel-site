<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const MAX_IMAGE_SIZE = 2 * 1024 * 1024

const props = defineProps({
  config: { type: Object, default: () => ({}) },
  defaults: { type: Object, default: () => ({}) },
})

const SAVE_KEY = 'rota-minutes-form'
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')

const generating = ref(false)
const pdfGenerated = ref(false)
const pdfFilename = ref('')
const error = ref('')
const errors = ref({})
const importExportMode = ref(null)
const showRecurring = ref(false)
const showConfig = ref(false)

function emptyForm() {
  return {
    type: 'general',
    meeting_number: '',
    date: '',
    time_from: '',
    time_to: '',
    venue: '',
    minute_taker: '',
    year: '',
    club_name: '',
    club_number: '',
    rid: '',
    president: '',
    member_prefix: '',
    footer_note: '',
    sig_left_name: '',
    sig_left_title: '',
    sig_right_name: '',
    sig_right_title: '',
    attendance: [],
    happy_sad: [''],
    agenda: [{ title: '', body: '' }],
    recurring_items: [],
    summary_proposed: 0,
    summary_rotarians: 0,
    summary_visiting_rotaractors: 0,
    summary_visiting_interactors: 0,
    summary_guests: 0,
    letterhead_data: '',
    sig_left_data: '',
    sig_right_data: '',
    stamp_data: '',
  }
}

function buildAttendanceList(config) {
  const list = []
  for (const m of config.bod ?? []) {
    list.push({ name: m.name, designation: m.position, present: true })
  }
  for (const n of config.general_members ?? []) {
    list.push({ name: n, designation: 'General Member', present: true })
  }
  if (config.members_from_date) {
    for (const n of config.members_from_date.members ?? []) {
      list.push({ name: n, designation: 'General Member', present: true })
    }
  }
  return list
}

function prefilledForm() {
  const d = props.defaults
  return {
    ...emptyForm(),
    meeting_number: d.meeting_number || 1,
    date: d.date || '',
    venue: d.venue || props.config.venue || '',
    minute_taker: d.minute_taker || Object.values(props.config.minute_takers ?? {}).join(', ') || '',
    year: d.year || props.config.year || '',
    club_name: d.club_name || props.config.club_name || '',
    club_number: d.club_number || props.config.club_number || '',
    rid: d.rid || props.config.rid || '',
    president: d.president || props.config.president || '',
    member_prefix: d.member_prefix || props.config.member_prefix || '',
    footer_note: d.footer_note || props.config.footer_note || '',
    sig_left_name: d.sig_left_name || props.config.signatures?.left?.name || '',
    sig_left_title: d.sig_left_title || props.config.signatures?.left?.title || '',
    sig_right_name: d.sig_right_name || props.config.signatures?.right?.name || '',
    sig_right_title: d.sig_right_title || props.config.signatures?.right?.title || '',
    attendance: d.attendance || buildAttendanceList(props.config),
    time_from: d.time_from || '',
    time_to: d.time_to || '',
    happy_sad: d.happy_sad || [''],
    agenda: d.agenda || [{ title: '', body: '' }],
    recurring_items: d.recurring_items || [],
    summary_proposed: d.summary_proposed || 0,
    summary_rotarians: d.summary_rotarians || 0,
    summary_visiting_rotaractors: d.summary_visiting_rotaractors || 0,
    summary_visiting_interactors: d.summary_visiting_interactors || 0,
    summary_guests: d.summary_guests || 0,
    letterhead_data: d.letterhead_data || '',
    sig_left_data: d.sig_left_data || '',
    sig_right_data: d.sig_right_data || '',
    stamp_data: d.stamp_data || '',
  }
}

const form = ref(emptyForm())

const attendancePresent = computed(() => form.value.attendance.filter(a => a.present))
const totalPresent = computed(() => attendancePresent.value.length
  + (form.value.summary_proposed ?? 0)
  + (form.value.summary_rotarians ?? 0)
  + (form.value.summary_visiting_rotaractors ?? 0)
  + (form.value.summary_visiting_interactors ?? 0)
  + (form.value.summary_guests ?? 0),
)

const recurringPool = computed(() => {
  const groups = []
  for (const [key, items] of Object.entries(props.config.recurring_items ?? {})) {
    groups.push({ label: key, items })
  }
  return groups
})

const recurringSelected = computed(() => form.value.recurring_items.length)

watch(form, (val) => {
  sessionStorage.setItem(SAVE_KEY, JSON.stringify(val))
  errors.value = {}
}, { deep: true })

onMounted(() => {
  const saved = sessionStorage.getItem(SAVE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      form.value = parsed
      return
    } catch { /* ignore */ }
  }
  form.value = prefilledForm()
})

function resetForm() {
  form.value = emptyForm()
  sessionStorage.removeItem(SAVE_KEY)
}

function loadDefaults() {
  form.value = prefilledForm()
  sessionStorage.setItem(SAVE_KEY, JSON.stringify(form.value))
}

function toggleAttendanceAll(val) {
  form.value.attendance.forEach(a => { a.present = val })
}

function addMember() {
  form.value.attendance.push({ name: '', designation: 'General Member', present: true })
}

function removeMember(i) {
  if (form.value.attendance.length > 1) form.value.attendance.splice(i, 1)
}

function addHappySad() {
  form.value.happy_sad.push('')
}

function removeHappySad(i) {
  if (form.value.happy_sad.length > 1) form.value.happy_sad.splice(i, 1)
}

function addAgenda() {
  form.value.agenda.push({ title: '', body: '' })
}

function removeAgenda(i) {
  if (form.value.agenda.length > 1) form.value.agenda.splice(i, 1)
}

function toggleRecurring(item) {
  const idx = form.value.recurring_items.indexOf(item)
  if (idx >= 0) {
    form.value.recurring_items.splice(idx, 1)
  } else {
    form.value.recurring_items.push(item)
  }
}

const imageWarnings = ref({})

function handleImageUpload(field, file) {
  if (!file) {
    form.value[field] = ''
    imageWarnings.value[field] = ''
    return
  }
  if (file.size > MAX_IMAGE_SIZE) {
    imageWarnings.value[field] = `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB (limit: 2MB). Consider resizing.`
  } else {
    imageWarnings.value[field] = ''
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      form.value[field] = canvas.toDataURL('image/jpeg', 0.92)
    }
    img.src = e.target?.result ?? ''
  }
  reader.readAsDataURL(file)
}

function clearImage(field) {
  form.value[field] = ''
  imageWarnings.value[field] = ''
}

function convertImageToJpeg(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image/png')) return dataUrl
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

async function convertFormImages(formData) {
  formData.letterhead_data = await convertImageToJpeg(formData.letterhead_data)
  formData.sig_left_data = await convertImageToJpeg(formData.sig_left_data)
  formData.sig_right_data = await convertImageToJpeg(formData.sig_right_data)
  formData.stamp_data = await convertImageToJpeg(formData.stamp_data)
}

function exportForm() {
  const data = JSON.stringify(form.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const label = form.value.type === 'general' ? 'GM' : 'BM'
  a.download = `rota-minutes-${label}${form.value.meeting_number}-${form.value.date || 'nodate'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function handleImportFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target?.result)
      if (data.letterhead_data || data.sig_left_data || data.sig_right_data || data.stamp_data) {
        await convertFormImages(data)
      }
      form.value = data
      sessionStorage.setItem(SAVE_KEY, JSON.stringify(data))
      importExportMode.value = null
    } catch {
      error.value = 'Failed to parse JSON file.'
    }
  }
  reader.readAsText(file)
}

function clearError(field) {
  if (errors.value[field]) {
    const next = { ...errors.value }
    delete next[field]
    errors.value = next
  }
}

function validate() {
  const e = {}
  if (!form.value.meeting_number || form.value.meeting_number < 1) e.meeting_number = 'Required'
  if (!form.value.date) e.date = 'Required'
  if (!form.value.time_from) e.time_from = 'Required'
  if (!form.value.time_to) e.time_to = 'Required'
  if (!form.value.venue?.trim()) e.venue = 'Required'
  if (!form.value.minute_taker?.trim()) e.minute_taker = 'Required'
  if (!form.value.year?.trim()) e.year = 'Required'
  if (!form.value.club_name?.trim()) e.club_name = 'Required'
  if (!form.value.club_number?.trim()) e.club_number = 'Required'
  if (!form.value.rid?.trim()) e.rid = 'Required'
  if (!form.value.president?.trim()) e.president = 'Required'
  if (!form.value.member_prefix?.trim()) e.member_prefix = 'Required'
  if (!form.value.footer_note?.trim()) e.footer_note = 'Required'
  if (!form.value.sig_left_name?.trim()) e.sig_left_name = 'Required'
  if (!form.value.sig_left_title?.trim()) e.sig_left_title = 'Required'
  if (!form.value.sig_right_name?.trim()) e.sig_right_name = 'Required'
  if (!form.value.sig_right_title?.trim()) e.sig_right_title = 'Required'
  const validMembers = form.value.attendance.filter(a => a.present && a.name.trim())
  if (validMembers.length === 0) e.attendance = 'At least one member must be present and named'
  const validAgenda = form.value.agenda.filter(a => a.title.trim())
  if (validAgenda.length === 0) e.agenda = 'At least one agenda item needs a title'
  errors.value = e
  return Object.keys(e).length === 0
}

function formatTime(val) {
  if (!val) return ''
  const parts = val.split(':')
  if (parts.length < 2) return val
  const h = parseInt(parts[0], 10)
  const m = parts[1]
  const ampm = h >= 12 ? 'P.M' : 'A.M'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

async function generateFromForm() {
  error.value = ''
  pdfGenerated.value = false
  if (!validate()) return

  generating.value = true

  await convertFormImages(form.value)

  const payload = {
    ...form.value,
    time_from: formatTime(form.value.time_from),
    time_to: formatTime(form.value.time_to),
    attendance: form.value.attendance.filter(a => a.present && a.name.trim() !== ''),
    happy_sad: form.value.happy_sad.filter(s => s.trim() !== ''),
    agenda: form.value.agenda.filter(a => a.title.trim() !== '' || a.body.trim() !== ''),
  }

  try {
    const resp = await fetch('/tools/rota-minutes/generate-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken ?? '',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(payload),
    })

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(text.substring(0, 200) || 'Server error')
    }

    const contentType = resp.headers.get('Content-Type') || ''
    if (!contentType.includes('pdf')) {
      const text = await resp.text()
      throw new Error('Server returned ' + contentType + ' instead of PDF. ' + text.substring(0, 200))
    }

    const blob = await resp.blob()
    const pfx = form.value.type === 'general' ? 'GM' : 'BM'
    const filename = `${pfx}_${form.value.meeting_number}.pdf`
    pdfFilename.value = filename

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    pdfGenerated.value = true
  } catch (e) {
    error.value = e.message
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto p-6 bg-cream min-h-screen">
    <div class="mb-6">
      <h1 class="font-display text-3xl font-bold text-ink mb-2">Meeting Minutes</h1>
      <p class="text-warm-muted">Fill in the details below, then generate a PDF or save your work to finish later.</p>
    </div>

    <div class="space-y-6">

      <div class="flex gap-2">
        <button @click="loadDefaults" class="px-4 py-2 bg-mint text-ink rounded-sm hover:bg-mint/80 transition-colors text-sm flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Fill with example data
        </button>
        <button @click="importExportMode = 'import'" class="px-4 py-2 bg-sky text-white rounded-sm hover:bg-sky/80 transition-colors text-sm flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Load saved data
        </button>
        <button @click="resetForm" class="px-4 py-2 bg-coral text-white rounded-sm hover:bg-coral/80 transition-colors text-sm">Clear all fields</button>
      </div>

      <div v-if="Object.keys(errors).length" class="bg-coral/10 border border-coral/50 text-coral p-4 rounded-sm text-sm font-medium">
        Please fill in all required fields (highlighted in red) before generating the PDF.
      </div>

      <div v-if="importExportMode === 'import'" class="fixed inset-0 bg-ink/50 flex items-center justify-center z-50">
        <div class="bg-warm-surface p-6 rounded-sm max-w-md w-full mx-4 shadow-2xl">
          <h3 class="font-display text-lg font-bold text-ink mb-4">Load saved data</h3>
          <p class="text-sm text-warm-muted mb-4">Select a file you saved earlier to pick up where you left off.</p>
          <input type="file" accept=".json" @change="handleImportFile" class="w-full mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:bg-coral file:text-white hover:file:bg-coral/80 file:cursor-pointer" />
          <div class="flex justify-end">
            <button @click="importExportMode = null" class="px-4 py-2 bg-warm-surface border border-warm-border rounded-sm hover:bg-cream">Cancel</button>
          </div>
        </div>
      </div>

      <div class="bg-warm-surface border border-warm-border p-6 rounded-sm">
        <h2 class="font-display text-lg font-bold text-ink mb-4">Meeting Info</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Type</label>
            <select v-model="form.type" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.type ? 'border-coral' : 'border-warm-border']">
              <option value="general">General Meeting</option>
              <option value="board">Board Meeting</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Meeting #</label>
            <input v-model.number="form.meeting_number" type="number" min="1" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.meeting_number ? 'border-coral' : 'border-warm-border']" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Date</label>
            <input v-model="form.date" type="date" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.date ? 'border-coral' : 'border-warm-border']" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Time From</label>
            <input v-model="form.time_from" type="time" step="60" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.time_from ? 'border-coral' : 'border-warm-border']" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Time To</label>
            <input v-model="form.time_to" type="time" step="60" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.time_to ? 'border-coral' : 'border-warm-border']" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Venue</label>
            <input v-model="form.venue" type="text" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.venue ? 'border-coral' : 'border-warm-border']" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Minute Taker</label>
            <input v-model="form.minute_taker" type="text" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.minute_taker ? 'border-coral' : 'border-warm-border']" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Rota Year</label>
            <input v-model="form.year" type="text" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.year ? 'border-coral' : 'border-warm-border']" />
          </div>
        </div>
      </div>

      <div class="bg-warm-surface border border-warm-border p-6 rounded-sm">
        <details>
          <summary class="font-display text-lg font-bold text-ink mb-2 cursor-pointer select-none">Club Info</summary>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Club Name</label>
              <input v-model="form.club_name" type="text" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.club_name ? 'border-coral' : 'border-warm-border']" />
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Club Number</label>
              <input v-model="form.club_number" type="text" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.club_number ? 'border-coral' : 'border-warm-border']" />
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">R.I. District</label>
              <input v-model="form.rid" type="text" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.rid ? 'border-coral' : 'border-warm-border']" />
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">President</label>
              <input v-model="form.president" type="text" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.president ? 'border-coral' : 'border-warm-border']" />
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Member Prefix</label>
              <input v-model="form.member_prefix" type="text" placeholder="Rtr." :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.member_prefix ? 'border-coral' : 'border-warm-border']" />
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Footer Note</label>
              <input v-model="form.footer_note" type="text" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.footer_note ? 'border-coral' : 'border-warm-border']" />
            </div>
          </div>
        </details>
      </div>

      <div class="bg-warm-surface border border-warm-border p-6 rounded-sm">
        <h2 class="font-display text-lg font-bold text-ink mb-4">Attendance</h2>
        <div class="flex gap-2 mb-3">
          <button @click="toggleAttendanceAll(true)" class="px-3 py-1.5 bg-mint text-ink text-xs rounded-sm hover:bg-mint/80 transition-colors">All Present</button>
          <button @click="toggleAttendanceAll(false)" class="px-3 py-1.5 bg-ink text-white text-xs rounded-sm hover:bg-coral transition-colors">All Absent</button>
          <span class="text-sm text-warm-muted ml-auto self-center">{{ attendancePresent.length }} present</span>
        </div>
        <div :class="{'border-coral': errors.attendance}" class="border border-warm-border rounded-sm">
          <div v-for="(m, i) in form.attendance" :key="i" class="flex items-center gap-2 px-3 py-2 border-b border-warm-border last:border-b-0 hover:bg-cream/50" :class="m.present ? '' : 'opacity-50'">
            <input type="checkbox" v-model="m.present" class="rounded border-warm-border text-coral focus:ring-coral shrink-0" />
            <input v-model="m.name" type="text" placeholder="Member name" class="flex-1 min-w-0 px-2 py-1 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky text-sm" @click.stop />
            <input v-model="m.designation" type="text" placeholder="Designation" class="w-36 shrink-0 px-2 py-1 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky text-xs hidden sm:block" @click.stop />
            <button @click="removeMember(i)" class="shrink-0 px-2 py-1 text-coral hover:bg-coral/10 rounded-sm transition-colors text-sm" :disabled="form.attendance.length <= 1">&times;</button>
          </div>
        </div>
        <button @click="addMember" class="mt-3 px-4 py-2 bg-sky text-white text-sm rounded-sm hover:bg-sky/80 transition-colors">+ Add Member</button>
      </div>

      <div class="bg-warm-surface border border-warm-border p-6 rounded-sm">
        <h2 class="font-display text-lg font-bold text-ink mb-4">Happy &amp; Sad News</h2>
        <div class="space-y-2">
          <div v-for="(_, i) in form.happy_sad" :key="i" class="flex gap-2">
            <input v-model="form.happy_sad[i]" type="text" placeholder="e.g. Rtr. Aanya shared that she adopted a rescue puppy..." class="flex-1 px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky text-sm" />
            <button @click="removeHappySad(i)" class="px-3 py-2 text-coral hover:bg-coral/10 rounded-sm transition-colors text-sm">&times;</button>
          </div>
        </div>
        <button @click="addHappySad" class="mt-3 px-4 py-2 bg-sky text-white text-sm rounded-sm hover:bg-sky/80 transition-colors">+ Add Item</button>
      </div>

      <div class="bg-warm-surface border border-warm-border p-6 rounded-sm">
        <h2 class="font-display text-lg font-bold text-ink mb-4">Agenda</h2>
        <div class="space-y-4">
          <div v-for="(item, i) in form.agenda" :key="i" :class="i === 0 ? {'border-coral': errors.agenda} : {}" class="border border-warm-border rounded-sm p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-warm-muted font-mono">#{{ i + 1 }}</span>
              <button @click="removeAgenda(i)" class="text-xs text-coral hover:bg-coral/10 px-2 py-1 rounded-sm">&times;</button>
            </div>
            <input v-model="item.title" type="text" placeholder="Agenda title" class="w-full px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky mb-2 text-sm" />
            <textarea v-model="item.body" rows="3" placeholder="Agenda details..." class="w-full px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky text-sm"></textarea>
          </div>
        </div>
        <button @click="addAgenda" class="mt-3 px-4 py-2 bg-sky text-white text-sm rounded-sm hover:bg-sky/80 transition-colors">+ Add Item</button>
      </div>

      <div class="bg-warm-surface border border-warm-border p-6 rounded-sm">
        <h2 class="font-display text-lg font-bold text-ink mb-4">
          Recurring Items
          <button @click="showRecurring = !showRecurring" class="ml-2 px-3 py-1 text-xs rounded-sm transition-colors" :class="showRecurring ? 'bg-coral text-white' : 'bg-sky text-white hover:bg-sky/80'">
            {{ showRecurring ? 'Close' : `Edit (${recurringSelected} selected)` }}
          </button>
        </h2>
        <p v-if="recurringPool.length === 0" class="text-sm text-warm-muted">No recurring items configured.</p>
        <div v-if="showRecurring" class="max-h-80 overflow-y-auto border border-warm-border rounded-sm p-3">
          <div v-for="group in recurringPool" :key="group.label" class="mb-3">
            <h3 class="text-xs font-bold text-warm-muted uppercase tracking-wider mb-2">{{ group.label }}</h3>
            <div class="space-y-1">
              <label v-for="item in group.items" :key="item" class="flex items-start gap-2 cursor-pointer hover:bg-cream/50 px-2 py-1.5 rounded-sm">
                <input type="checkbox" :checked="form.recurring_items.includes(item)" @change="toggleRecurring(item)" class="mt-0.5 rounded border-warm-border text-coral focus:ring-coral shrink-0" />
                <span class="text-sm text-ink">{{ item }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-warm-surface border border-warm-border p-6 rounded-sm">
        <h2 class="font-display text-lg font-bold text-ink mb-4">Summary</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Proposed</label>
            <input v-model.number="form.summary_proposed" type="number" min="0" class="w-full px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Rotarians</label>
            <input v-model.number="form.summary_rotarians" type="number" min="0" class="w-full px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Visiting Rot.</label>
            <input v-model.number="form.summary_visiting_rotaractors" type="number" min="0" class="w-full px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Visiting Int.</label>
            <input v-model.number="form.summary_visiting_interactors" type="number" min="0" class="w-full px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Guests</label>
            <input v-model.number="form.summary_guests" type="number" min="0" class="w-full px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-muted mb-1">Total</label>
            <div class="w-full px-3 py-2 border border-warm-border rounded-sm bg-cream text-ink font-bold text-lg">{{ totalPresent }}</div>
          </div>
        </div>
      </div>

      <div class="bg-warm-surface border border-warm-border p-6 rounded-sm">
        <details>
          <summary class="font-display text-lg font-bold text-ink mb-2 cursor-pointer select-none">Signatures</summary>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <h3 class="text-sm font-bold text-ink mb-3">Left (President)</h3>
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-warm-muted mb-1">Name</label>
                  <input v-model="form.sig_left_name" type="text" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.sig_left_name ? 'border-coral' : 'border-warm-border']" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-warm-muted mb-1">Title</label>
                  <input v-model="form.sig_left_title" type="text" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.sig_left_title ? 'border-coral' : 'border-warm-border']" />
                </div>
              </div>
            </div>
            <div>
              <h3 class="text-sm font-bold text-ink mb-3">Right (Secretary)</h3>
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-warm-muted mb-1">Name</label>
                  <input v-model="form.sig_right_name" type="text" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.sig_right_name ? 'border-coral' : 'border-warm-border']" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-warm-muted mb-1">Title</label>
                  <input v-model="form.sig_right_title" type="text" :class="['w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:outline-none focus:ring-2 focus:ring-sky focus:border-sky', errors.sig_right_title ? 'border-coral' : 'border-warm-border']" />
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>

      <div class="bg-warm-surface border border-warm-border p-6 rounded-sm">
        <details>
          <summary class="font-display text-lg font-bold text-ink mb-2 cursor-pointer select-none">Images</summary>
          <p class="text-sm text-warm-muted mb-4 mt-4">Upload letterhead, signatures, and stamp. These are embedded directly in the PDF and not stored server-side. PNG or JPEG, max 2MB each.</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="img in [
              { field: 'letterhead_data', label: 'Letterhead', desc: 'Full-width header image' },
              { field: 'sig_left_data', label: 'Left Signature', desc: 'President signature' },
              { field: 'sig_right_data', label: 'Right Signature', desc: 'Secretary signature' },
              { field: 'stamp_data', label: 'Stamp', desc: 'Club stamp' },
            ]" :key="img.field" class="border border-warm-border rounded-sm p-4">
              <h3 class="text-sm font-bold text-ink mb-1">{{ img.label }}</h3>
              <p class="text-xs text-warm-muted mb-3">{{ img.desc }}</p>
              <div v-if="form[img.field]" class="mb-3">
                <img :src="form[img.field]" class="max-h-20 max-w-full object-contain border border-warm-border rounded-sm" />
                <button @click="clearImage(img.field)" class="mt-1 text-xs text-coral hover:underline">Remove</button>
              </div>
              <input type="file" accept="image/png,image/jpeg,image/gif" @change="e => handleImageUpload(img.field, e.target.files?.[0])" class="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border-0 file:bg-sky file:text-white hover:file:bg-sky/80 file:cursor-pointer text-warm-muted" />
              <p v-if="imageWarnings[img.field]" class="mt-2 text-xs text-amber-600">{{ imageWarnings[img.field] }}</p>
            </div>
          </div>
        </details>
      </div>

      <div class="bg-warm-surface border border-warm-border p-6 rounded-sm">
        <button
          @click="generateFromForm"
          :disabled="generating"
          class="w-full px-6 py-3 bg-coral text-white rounded-sm hover:bg-coral/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 text-lg"
        >
          <svg v-if="generating" class="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ generating ? 'Generating…' : 'Generate PDF' }}
        </button>
        <p v-if="pdfGenerated" class="mt-3 text-sm text-mint text-center font-medium">✓ {{ pdfFilename }} downloaded.</p>
        <div class="mt-4 flex gap-2 justify-center">
          <button @click="exportForm" class="px-4 py-2 bg-mint text-ink rounded-sm hover:bg-mint/80 transition-colors text-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Save draft
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="mt-6 bg-coral/10 border border-coral/30 text-coral p-4 rounded-sm text-sm">{{ error }}</div>
  </div>
</template>
