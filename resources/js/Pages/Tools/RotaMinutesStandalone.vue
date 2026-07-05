<script setup>
import { ref } from 'vue'
import { useRotaForm } from '../../Composables/useRotaForm.js'
import { buildPrintHtml } from '../../Utils/rotaMinutesPrintHtml.js'
import { prepareFormData, printHtml } from '../../Utils/rotaMinutesPrint.js'
import { downloadJson } from '../../Utils/rotaFormIO.js'
import PreviewModal from '../../Components/PreviewModal.vue'

const SAVE_KEY = 'rota-minutes-standalone-form'

const props = defineProps({
  config: { type: Object, default: () => ({}) },
  defaults: { type: Object, default: () => ({}) },
})

const {
  form,
  error,
  fieldErrors,
  imageWarnings,
  importExportMode,
  attendancePresent,
  totalPresent,
  recurringPool,
  recurringSelected,
  hasError,
  fieldError,
  validate,
  loadDefaults,
  resetForm,
  toggleAttendanceAll,
  addMember,
  removeMember,
  addHappySad,
  removeHappySad,
  addAgenda,
  removeAgenda,
  toggleRecurring,
  handleImageUpload,
  clearImage,
  importForm,
} = useRotaForm(props.config, props.defaults, SAVE_KEY)

const currentStep = ref(0)
const steps = ['Meeting', 'Club & People', 'Agenda', 'Summary & Sign', 'Generate']

function nextStep() {
  if (currentStep.value < steps.length - 1) currentStep.value++
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function prevStep() {
  if (currentStep.value > 0) currentStep.value--
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goToStep(i) {
  if (i >= 0 && i < steps.length) currentStep.value = i
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const generating = ref(false)
const showRecurring = ref(false)
const showAttendance = ref(true)
const previewHtml = ref(null)
const previewLoading = ref(false)

function generateFromForm() {
  if (!validate(showAttendance.value)) return
  generating.value = true
  error.value = ''
  const formData = prepareFormData(form.value, showAttendance.value)
  const ok = printHtml(buildPrintHtml(formData), {
    onComplete: () => { generating.value = false },
  })
  if (!ok) {
    error.value = 'Popup blocked. Please allow popups for this site to use PDF generation.'
    generating.value = false
  }
}

function generatePreview() {
  if (!validate(showAttendance.value)) return
  previewLoading.value = true
  error.value = ''
  const formData = prepareFormData(form.value, showAttendance.value)
  previewHtml.value = buildPrintHtml(formData)
  previewLoading.value = false
}

function closePreview() {
  previewHtml.value = null
}

function handleImportFile(e) {
  const file = e.target.files?.[0]
  if (file) importForm(file)
}

function printFromPreview() {
  if (!previewHtml.value) return
  generating.value = true
  const ok = printHtml(previewHtml.value, {
    onComplete: () => { generating.value = false },
  })
  if (!ok) {
    error.value = 'Popup blocked. Please allow popups for this site to use PDF generation.'
    generating.value = false
  }
  previewHtml.value = null
}
</script>

<template>
  <div class="max-w-6xl mx-auto p-4 sm:p-6 bg-cream min-h-screen">
    <div class="mb-6">
      <h1 class="font-display text-2xl sm:text-3xl font-bold text-ink mb-2">Rota Minutes <span class="text-xs sm:text-sm text-warm-muted font-normal">(Standalone)</span></h1>
      <p class="text-sm sm:text-base text-warm-muted">Generate meeting minutes PDFs entirely in your browser. No server-side processing.</p>
    </div>

    <div class="space-y-6">

      <div v-if="error" class="bg-coral/10 border-2 border-coral text-coral p-4 rounded-sm text-sm font-medium flex items-start gap-3">
        <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
        <span>{{ error }}</span>
      </div>

      <div class="flex gap-2 flex-wrap">
        <button @click="downloadJson(form)" class="px-4 py-2 min-h-[44px] bg-mint text-ink rounded-sm hover:bg-mint/80 transition-colors text-sm flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          <span class="hidden xs:inline">Export</span> JSON
        </button>
        <button @click="importExportMode = 'import'" class="px-4 py-2 min-h-[44px] bg-sky text-white rounded-sm hover:bg-sky/80 transition-colors text-sm flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          <span class="hidden xs:inline">Import</span> JSON
        </button>
        <button @click="loadDefaults" class="px-4 py-2 min-h-[44px] bg-mint text-ink rounded-sm hover:bg-mint/80 transition-colors text-sm flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span class="hidden xs:inline">Load</span> Defaults
        </button>
        <button @click="resetForm" class="px-4 py-2 min-h-[44px] bg-coral text-white rounded-sm hover:bg-coral/80 transition-colors text-sm">Reset</button>
      </div>

      <div v-if="importExportMode === 'import'" class="fixed inset-0 bg-ink/50 flex items-center justify-center z-50">
        <div class="bg-warm-surface p-6 rounded-sm max-w-md w-full mx-4 shadow-2xl">
          <h3 class="font-display text-lg font-bold text-ink mb-4">Import Form Data</h3>
          <p class="text-sm text-warm-muted mb-4">Select a JSON file previously exported from Rota Minutes.</p>
          <input type="file" accept=".json" @change="handleImportFile" class="w-full mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:bg-coral file:text-white hover:file:bg-coral/80 file:cursor-pointer" />
          <div class="flex justify-end">
            <button @click="importExportMode = null" class="px-4 py-2 bg-warm-surface border border-warm-border rounded-sm hover:bg-cream">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Step indicator: mobile compact -->
      <div class="md:hidden mb-6 select-none">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm font-bold text-ink font-display shrink-0">Step {{ currentStep + 1 }}/{{ steps.length }}</span>
            <div class="flex gap-1">
              <button v-for="(_, i) in steps" :key="i" @click="goToStep(i)"
                class="w-2.5 h-2.5 rounded-full transition-all duration-200"
                :class="i === currentStep ? 'bg-coral scale-125' : i < currentStep ? 'bg-mint' : 'bg-warm-border'"
              ></button>
            </div>
          </div>
          <span class="text-xs text-warm-muted shrink-0 ml-2">{{ Math.round((currentStep + 1) / steps.length * 100) }}%</span>
        </div>
        <div class="w-full bg-warm-border rounded-full h-2 overflow-hidden">
          <div class="bg-coral h-2 rounded-full transition-all duration-500 ease-out" :style="{ width: ((currentStep + 1) / steps.length * 100) + '%' }"></div>
        </div>
        <div class="flex justify-between mt-2">
          <button v-if="currentStep > 0" @click="prevStep" class="text-xs text-warm-muted hover:text-ink transition-colors flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            {{ steps[currentStep - 1] }}
          </button>
          <span v-else></span>
          <button v-if="currentStep < steps.length - 1" @click="nextStep" class="text-xs text-warm-muted hover:text-ink transition-colors flex items-center gap-1">
            {{ steps[currentStep + 1] }}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>

      <!-- Step indicator: desktop full -->
      <div class="hidden md:flex items-center justify-between mb-8 gap-1 select-none">
        <div v-for="(step, i) in steps" :key="i" class="flex items-center gap-1 min-w-0 flex-1">
          <button @click="goToStep(i)" class="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
              :class="i === currentStep ? 'bg-coral text-white shadow-md scale-110' : i < currentStep ? 'bg-mint text-ink' : 'bg-warm-border text-warm-muted'">
              <svg v-if="i < currentStep" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span class="text-xs whitespace-nowrap transition-colors duration-200 hidden lg:inline" :class="i === currentStep ? 'text-ink font-semibold' : i < currentStep ? 'text-ink/60' : 'text-warm-muted'">{{ step }}</span>
          </button>
          <div v-if="i < steps.length - 1" class="h-px flex-1 mx-1 transition-colors duration-200" :class="i < currentStep ? 'bg-mint' : 'bg-warm-border'"></div>
        </div>
      </div>

      <div v-show="currentStep === 0">
        <div class="bg-warm-surface border border-warm-border p-6 rounded-sm">
          <h2 class="font-display text-lg font-bold text-ink mb-4">Meeting Info</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Type</label>
              <select v-model="form.type" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('type') ? 'border-coral' : 'border-warm-border'">
                <option value="general">General Meeting</option>
                <option value="board">Board Meeting</option>
                <option value="zonal">Zonal Meeting</option>
              </select>
              <p v-if="fieldError('type')" class="mt-1 text-xs text-coral">{{ fieldError('type') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Meeting #</label>
              <input v-model.number="form.meeting_number" type="number" min="1" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('meeting_number') ? 'border-coral' : 'border-warm-border'" />
              <p v-if="fieldError('meeting_number')" class="mt-1 text-xs text-coral">{{ fieldError('meeting_number') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Date</label>
              <input v-model="form.date" type="date" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('date') ? 'border-coral' : 'border-warm-border'" />
              <p v-if="fieldError('date')" class="mt-1 text-xs text-coral">{{ fieldError('date') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Time From</label>
              <input v-model="form.time_from" type="time" step="60" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('time_from') ? 'border-coral' : 'border-warm-border'" />
              <p v-if="fieldError('time_from')" class="mt-1 text-xs text-coral">{{ fieldError('time_from') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Time To</label>
              <input v-model="form.time_to" type="time" step="60" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('time_to') ? 'border-coral' : 'border-warm-border'" />
              <p v-if="fieldError('time_to')" class="mt-1 text-xs text-coral">{{ fieldError('time_to') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Venue</label>
              <input v-model="form.venue" type="text" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('venue') ? 'border-coral' : 'border-warm-border'" />
              <p v-if="fieldError('venue')" class="mt-1 text-xs text-coral">{{ fieldError('venue') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Minute Taker</label>
              <input v-model="form.minute_taker" type="text" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('minute_taker') ? 'border-coral' : 'border-warm-border'" />
              <p v-if="fieldError('minute_taker')" class="mt-1 text-xs text-coral">{{ fieldError('minute_taker') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Rota Year</label>
              <input v-model="form.year" type="text" placeholder="e.g. 2025-26" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('year') ? 'border-coral' : 'border-warm-border'" />
              <p v-if="fieldError('year')" class="mt-1 text-xs text-coral">{{ fieldError('year') }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-show="currentStep === 1">
        <div class="bg-warm-surface border border-warm-border p-6 rounded-sm">
          <details :open="['club_name','club_number','rid','president','member_prefix','footer_note'].some(f => hasError(f))">
            <summary class="font-display text-lg font-bold text-ink mb-2 cursor-pointer select-none">Club Info</summary>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label class="block text-sm font-medium text-warm-muted mb-1">Club Name</label>
                <input v-model="form.club_name" type="text" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('club_name') ? 'border-coral' : 'border-warm-border'" />
                <p v-if="fieldError('club_name')" class="mt-1 text-xs text-coral">{{ fieldError('club_name') }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-warm-muted mb-1">Club Number</label>
                <input v-model="form.club_number" type="text" placeholder="Rotary club number" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('club_number') ? 'border-coral' : 'border-warm-border'" />
                <p v-if="fieldError('club_number')" class="mt-1 text-xs text-coral">{{ fieldError('club_number') }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-warm-muted mb-1">R.I. District</label>
                <input v-model="form.rid" type="text" placeholder="e.g. 3292" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('rid') ? 'border-coral' : 'border-warm-border'" />
                <p class="text-xs text-warm-muted mt-0.5">Rotary International district number</p>
                <p v-if="fieldError('rid')" class="mt-1 text-xs text-coral">{{ fieldError('rid') }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-warm-muted mb-1">President</label>
                <input v-model="form.president" type="text" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('president') ? 'border-coral' : 'border-warm-border'" />
                <p v-if="fieldError('president')" class="mt-1 text-xs text-coral">{{ fieldError('president') }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-warm-muted mb-1">Member Prefix</label>
                <input v-model="form.member_prefix" type="text" placeholder="Rtr." class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('member_prefix') ? 'border-coral' : 'border-warm-border'" />
                <p class="text-xs text-warm-muted mt-0.5">Title before member names, e.g. Rtr., PP, Rtn.</p>
                <p v-if="fieldError('member_prefix')" class="mt-1 text-xs text-coral">{{ fieldError('member_prefix') }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-warm-muted mb-1">Footer Note</label>
                <input v-model="form.footer_note" type="text" placeholder="e.g. Meeting minutes approved on ..." class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('footer_note') ? 'border-coral' : 'border-warm-border'" />
                <p class="text-xs text-warm-muted mt-0.5">Small text at the bottom of every page</p>
                <p v-if="fieldError('footer_note')" class="mt-1 text-xs text-coral">{{ fieldError('footer_note') }}</p>
              </div>
            </div>
          </details>
        </div>

        <div class="bg-warm-surface border border-warm-border p-6 rounded-sm mt-6">
          <div class="flex items-center gap-3 mb-4">
            <h2 class="font-display text-lg font-bold text-ink">Attendance</h2>
            <label class="flex items-center gap-2 text-sm text-warm-muted cursor-pointer select-none ml-auto">
              <input type="checkbox" v-model="showAttendance" class="rounded border-warm-border text-coral focus:ring-coral" />
              Include attendance tracking
            </label>
          </div>
          <div v-if="showAttendance" :class="hasError('attendance') ? 'border-coral' : ''">
            <p v-if="fieldError('attendance')" class="mb-3 text-xs text-coral">{{ fieldError('attendance') }}</p>
            <div class="flex gap-2 mb-3 items-center flex-wrap">
              <button @click="toggleAttendanceAll(true)" class="px-3 py-2 min-h-[38px] bg-mint text-ink text-xs rounded-sm hover:bg-mint/80 transition-colors">All Present</button>
              <button @click="toggleAttendanceAll(false)" class="px-3 py-2 min-h-[38px] bg-ink text-white text-xs rounded-sm hover:bg-coral transition-colors">All Absent</button>
              <span class="text-sm text-warm-muted ml-auto">{{ attendancePresent.length }} present</span>
            </div>
            <div class="border border-warm-border rounded-sm overflow-hidden">
              <div v-for="(m, i) in form.attendance" :key="i" class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 border-b border-warm-border last:border-b-0 hover:bg-cream/50 min-h-[44px]" :class="m.present ? '' : 'opacity-50'">
                <input type="checkbox" v-model="m.present" class="rounded border-warm-border text-coral focus:ring-coral shrink-0 w-4 h-4 sm:w-auto sm:h-auto" />
                <input v-model="m.name" type="text" placeholder="Member name" class="flex-1 min-w-0 px-2 py-1.5 sm:py-1 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral text-sm" :class="hasError('attendance.' + i + '.name') ? 'border-coral' : 'border-warm-border'" @click.stop />
                <input v-model="m.designation" type="text" placeholder="Designation" class="w-24 sm:w-36 shrink-0 px-2 py-1.5 sm:py-1 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral text-xs hidden sm:block" :class="hasError('attendance.' + i + '.designation') ? 'border-coral' : 'border-warm-border'" @click.stop />
                <button @click="removeMember(i)" class="shrink-0 px-2.5 py-1.5 sm:py-1 text-coral hover:bg-coral/10 rounded-sm transition-colors text-sm min-h-[36px] flex items-center" :disabled="form.attendance.length <= 1">&times;</button>
              </div>
            </div>
            <button @click="addMember" class="mt-3 px-4 py-2.5 min-h-[44px] bg-sky text-white text-sm rounded-sm hover:bg-sky/80 transition-colors">+ Add Member</button>
          </div>
          <p v-else class="text-sm text-warm-muted">Attendance tracking is disabled. Member list and summary counts will not appear in the output.</p>
        </div>
      </div>

      <div v-show="currentStep === 2">
        <div class="bg-warm-surface border border-warm-border p-6 rounded-sm" :class="hasError('happy_sad') ? 'border-coral' : ''">
          <h2 class="font-display text-lg font-bold text-ink mb-4">Happy &amp; Sad News</h2>
          <p v-if="fieldError('happy_sad')" class="mb-3 text-xs text-coral">{{ fieldError('happy_sad') }}</p>
          <div class="space-y-2">
            <div v-for="(_, i) in form.happy_sad" :key="i" class="flex gap-2">
              <input v-model="form.happy_sad[i]" type="text" placeholder="e.g. Rtr. Aanya shared that she adopted a rescue puppy..." class="flex-1 px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral text-sm" />
              <button @click="removeHappySad(i)" class="px-3 py-2 text-coral hover:bg-coral/10 rounded-sm transition-colors text-sm">&times;</button>
            </div>
          </div>
          <button @click="addHappySad" class="mt-3 px-4 py-2.5 min-h-[44px] bg-sky text-white text-sm rounded-sm hover:bg-sky/80 transition-colors">+ Add Item</button>
        </div>

        <div class="bg-warm-surface border border-warm-border p-6 rounded-sm mt-6" :class="hasError('agenda') ? 'border-coral' : ''">
          <h2 class="font-display text-lg font-bold text-ink mb-4">Agenda</h2>
          <p v-if="fieldError('agenda')" class="mb-3 text-xs text-coral">{{ fieldError('agenda') }}</p>
          <div class="space-y-4">
            <div v-for="(item, i) in form.agenda" :key="i" class="border border-warm-border rounded-sm p-4" :class="hasError('agenda.' + i + '.title') || hasError('agenda.' + i + '.body') ? 'border-coral' : ''">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-warm-muted font-mono">#{{ i + 1 }}</span>
                <button @click="removeAgenda(i)" class="text-xs text-coral hover:bg-coral/10 px-2 py-1 rounded-sm">&times;</button>
              </div>
              <input v-model="item.title" type="text" placeholder="Agenda title" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral mb-2 text-sm" :class="hasError('agenda.' + i + '.title') ? 'border-coral' : 'border-warm-border'" />
              <textarea v-model="item.body" rows="3" placeholder="Agenda details..." class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral text-sm" :class="hasError('agenda.' + i + '.body') ? 'border-coral' : 'border-warm-border'"></textarea>
            </div>
          </div>
          <button @click="addAgenda" class="mt-3 px-4 py-2.5 min-h-[44px] bg-sky text-white text-sm rounded-sm hover:bg-sky/80 transition-colors">+ Add Item</button>
        </div>

        <div class="bg-warm-surface border border-warm-border p-6 rounded-sm mt-6" :class="hasError('recurring_items') ? 'border-coral' : ''">
          <h2 class="font-display text-lg font-bold text-ink mb-4">
            Recurring Items
            <button @click="showRecurring = !showRecurring" class="ml-2 px-3 py-1.5 min-h-[36px] text-xs rounded-sm transition-colors" :class="showRecurring ? 'bg-coral text-white' : 'bg-sky text-white hover:bg-sky/80'">
              {{ showRecurring ? 'Close' : `Edit (${recurringSelected} selected)` }}
            </button>
          </h2>
          <p v-if="fieldError('recurring_items')" class="mb-3 text-xs text-coral">{{ fieldError('recurring_items') }}</p>
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
      </div>

      <div v-show="currentStep === 3">
        <div v-if="showAttendance && form.type !== 'zonal'" class="bg-warm-surface border border-warm-border p-6 rounded-sm">
          <h2 class="font-display text-lg font-bold text-ink mb-4">Summary</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Proposed Members</label>
              <input v-model.number="form.summary_proposed" type="number" min="0" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('summary_proposed') ? 'border-coral' : 'border-warm-border'" />
              <p class="text-xs text-warm-muted mt-0.5">New members proposed at this meeting</p>
              <p v-if="fieldError('summary_proposed')" class="mt-1 text-xs text-coral">{{ fieldError('summary_proposed') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Rotarians</label>
              <input v-model.number="form.summary_rotarians" type="number" min="0" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('summary_rotarians') ? 'border-coral' : 'border-warm-border'" />
              <p class="text-xs text-warm-muted mt-0.5">Chartered Rotary members present</p>
              <p v-if="fieldError('summary_rotarians')" class="mt-1 text-xs text-coral">{{ fieldError('summary_rotarians') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Visiting Rotaractors</label>
              <input v-model.number="form.summary_visiting_rotaractors" type="number" min="0" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('summary_visiting_rotaractors') ? 'border-coral' : 'border-warm-border'" />
              <p class="text-xs text-warm-muted mt-0.5">Rotaractors visiting from other clubs</p>
              <p v-if="fieldError('summary_visiting_rotaractors')" class="mt-1 text-xs text-coral">{{ fieldError('summary_visiting_rotaractors') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Visiting Interactors</label>
              <input v-model.number="form.summary_visiting_interactors" type="number" min="0" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('summary_visiting_interactors') ? 'border-coral' : 'border-warm-border'" />
              <p class="text-xs text-warm-muted mt-0.5">Interactors visiting from other clubs</p>
              <p v-if="fieldError('summary_visiting_interactors')" class="mt-1 text-xs text-coral">{{ fieldError('summary_visiting_interactors') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Guests</label>
              <input v-model.number="form.summary_guests" type="number" min="0" placeholder="e.g. 2" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('summary_guests') ? 'border-coral' : 'border-warm-border'" />
              <p class="text-xs text-warm-muted mt-0.5">Non-member visitors not in other categories</p>
              <p v-if="fieldError('summary_guests')" class="mt-1 text-xs text-coral">{{ fieldError('summary_guests') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-muted mb-1">Total</label>
              <div class="w-full px-3 py-2 border border-warm-border rounded-sm bg-cream text-ink font-bold text-lg">{{ totalPresent }}</div>
            </div>
          </div>
        </div>

        <div v-if="form.type !== 'zonal'" class="bg-warm-surface border border-warm-border p-6 rounded-sm mt-6">
          <details :open="['sig_left_name','sig_left_title','sig_right_name','sig_right_title'].some(f => hasError(f))">
            <summary class="font-display text-lg font-bold text-ink mb-2 cursor-pointer select-none">Signatures</summary>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <h3 class="text-sm font-bold text-ink mb-3">Left (President)</h3>
                <div class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-warm-muted mb-1">Name</label>
                    <input v-model="form.sig_left_name" type="text" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('sig_left_name') ? 'border-coral' : 'border-warm-border'" />
                    <p v-if="fieldError('sig_left_name')" class="mt-1 text-xs text-coral">{{ fieldError('sig_left_name') }}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-warm-muted mb-1">Title</label>
                    <input v-model="form.sig_left_title" type="text" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('sig_left_title') ? 'border-coral' : 'border-warm-border'" />
                    <p v-if="fieldError('sig_left_title')" class="mt-1 text-xs text-coral">{{ fieldError('sig_left_title') }}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 class="text-sm font-bold text-ink mb-3">Right (Secretary)</h3>
                <div class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-warm-muted mb-1">Name</label>
                    <input v-model="form.sig_right_name" type="text" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('sig_right_name') ? 'border-coral' : 'border-warm-border'" />
                    <p v-if="fieldError('sig_right_name')" class="mt-1 text-xs text-coral">{{ fieldError('sig_right_name') }}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-warm-muted mb-1">Title</label>
                    <input v-model="form.sig_right_title" type="text" class="w-full px-3 py-2 border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral" :class="hasError('sig_right_title') ? 'border-coral' : 'border-warm-border'" />
                    <p v-if="fieldError('sig_right_title')" class="mt-1 text-xs text-coral">{{ fieldError('sig_right_title') }}</p>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>

        <div class="bg-warm-surface border border-warm-border p-6 rounded-sm mt-6">
          <details :open="['letterhead_data','sig_left_data','sig_right_data','stamp_data'].some(f => hasError(f))">
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
      </div>

      <div v-show="currentStep === 4">
        <div v-if="error" class="bg-coral/10 border-2 border-coral text-coral p-4 rounded-sm text-sm font-medium flex items-start gap-3">
          <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
          <span>{{ error }}</span>
        </div>

        <div class="bg-warm-surface border border-warm-border p-6 rounded-sm text-center">
          <div class="mb-6">
            <div class="w-16 h-16 bg-mint/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <h2 class="font-display text-2xl font-bold text-ink mb-2">Ready to Generate</h2>
            <p class="text-warm-muted">Review your data and generate the PDF. The document will open in a new tab for you to save via the browser's print dialog.</p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 text-left">
            <div class="bg-cream rounded-sm p-3 min-w-0">
              <p class="text-xs text-warm-muted">Meeting</p>
              <p class="text-sm font-medium text-ink truncate">{{ form.type === 'general' ? 'General' : form.type === 'board' ? 'Board' : 'Zonal' }} #{{ form.meeting_number }}</p>
            </div>
            <div class="bg-cream rounded-sm p-3 min-w-0">
              <p class="text-xs text-warm-muted">Date</p>
              <p class="text-sm font-medium text-ink truncate">{{ form.date || '—' }}</p>
            </div>
            <div class="bg-cream rounded-sm p-3 min-w-0">
              <p class="text-xs text-warm-muted">Club</p>
              <p class="text-sm font-medium text-ink truncate">{{ form.club_name || '—' }}</p>
            </div>
            <div v-if="showAttendance" class="bg-cream rounded-sm p-3 min-w-0">
              <p class="text-xs text-warm-muted">Attendance</p>
              <p class="text-sm font-medium text-ink truncate">{{ attendancePresent.length }} present</p>
            </div>
            <div class="bg-cream rounded-sm p-3 min-w-0">
              <p class="text-xs text-warm-muted">Agenda Items</p>
              <p class="text-sm font-medium text-ink truncate">{{ form.agenda.length }}</p>
            </div>
            <div class="bg-cream rounded-sm p-3 min-w-0">
              <p class="text-xs text-warm-muted">Recurring</p>
              <p class="text-sm font-medium text-ink truncate">{{ form.recurring_items.length }} selected</p>
            </div>
            <div v-if="showAttendance && form.type !== 'zonal'" class="bg-cream rounded-sm p-3 min-w-0">
              <p class="text-xs text-warm-muted">Total Present</p>
              <p class="text-sm font-medium text-ink truncate">{{ totalPresent }}</p>
            </div>
            <div class="bg-cream rounded-sm p-3 min-w-0">
              <p class="text-xs text-warm-muted">Letterhead</p>
              <p class="text-sm font-medium text-ink truncate">{{ form.letterhead_data ? 'Yes' : 'No' }}</p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3">
            <button
              @click="generatePreview"
              :disabled="previewLoading"
              class="sm:flex-1 px-6 py-3 min-h-[48px] bg-sky text-white rounded-sm hover:bg-sky/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              {{ previewLoading ? 'Rendering…' : 'Preview' }}
            </button>
            <button
              @click="generateFromForm"
              :disabled="generating"
              class="sm:flex-1 px-6 py-3 min-h-[48px] bg-coral text-white rounded-sm hover:bg-coral/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 text-lg"
            >
              <svg v-if="generating" class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ generating ? 'Preparing…' : 'Generate PDF' }}
            </button>
          </div>
          <p class="mt-3 text-sm text-warm-muted">Preview shows the document on-screen. Generate PDF opens it in a new tab for saving.</p>
        </div>
      </div>

      <!-- Preview Modal -->
      <PreviewModal
        v-if="previewHtml"
        :html="previewHtml"
        @close="closePreview"
        @print="printFromPreview"
      />

      <div class="flex items-center justify-between gap-3 pt-4 border-t border-warm-border">
        <button v-if="currentStep > 0" @click="prevStep" class="px-5 py-3 min-h-[48px] border border-warm-border text-ink rounded-sm hover:bg-cream transition-colors text-sm flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          Back
        </button>
        <div v-else></div>
        <button
          v-if="currentStep < steps.length - 1"
          @click="nextStep"
          class="px-5 py-3 min-h-[48px] bg-coral text-white rounded-sm hover:bg-coral/80 transition-colors text-sm flex items-center gap-1.5"
        >
          Next
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>
