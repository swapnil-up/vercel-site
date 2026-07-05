import { ref, computed, watch, onMounted } from 'vue'
import { checkImageSize, readImageAsJpeg, convertImageToJpeg } from '../Utils/rotaMinutesImages.js'
import { validateRotaForm, getFieldLabels } from '../Utils/rotaMinutesValidation.js'

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

export function useRotaForm(config, defaults, saveKey) {
  const form = ref(emptyForm())
  const error = ref('')
  const fieldErrors = ref({})
  const imageWarnings = ref({})
  const importExportMode = ref(null)

  const fieldLabels = getFieldLabels()

  const attendancePresent = computed(() =>
    form.value.attendance.filter(a => a.present),
  )

  const totalPresent = computed(() =>
    attendancePresent.value.length
      + (form.value.summary_proposed ?? 0)
      + (form.value.summary_rotarians ?? 0)
      + (form.value.summary_visiting_rotaractors ?? 0)
      + (form.value.summary_visiting_interactors ?? 0)
      + (form.value.summary_guests ?? 0),
  )

  const recurringPool = computed(() => {
    const groups = []
    for (const [key, items] of Object.entries(config.recurring_items ?? {})) {
      groups.push({ label: key, items })
    }
    return groups
  })

  const recurringSelected = computed(() => form.value.recurring_items.length)

  function hasError(field) {
    return Object.keys(fieldErrors.value).some(
      k => k === field || k.startsWith(field + '.'),
    )
  }

  function fieldError(field) {
    const keys = Object.keys(fieldErrors.value).filter(
      k => k === field || k.startsWith(field + '.'),
    )
    return keys.map(k => fieldErrors.value[k]).join('; ')
  }

  function clearErrors() {
    error.value = ''
    fieldErrors.value = {}
  }

  function prefilledForm() {
    const d = defaults || {}
    const c = config || {}
    return {
      ...emptyForm(),
      type: d.type || 'general',
      meeting_number: d.meeting_number || 1,
      date: d.date || '',
      time_from: d.time_from || '',
      time_to: d.time_to || '',
      venue: d.venue || c.venue || '',
      minute_taker: d.minute_taker || Object.values(c.minute_takers ?? {}).join(', ') || '',
      year: d.year || c.year || '',
      club_name: d.club_name || c.club_name || '',
      club_number: d.club_number || c.club_number || '',
      rid: d.rid || c.rid || '',
      president: d.president || c.president || '',
      member_prefix: d.member_prefix || c.member_prefix || '',
      footer_note: d.footer_note || c.footer_note || '',
      sig_left_name: d.sig_left_name || c.signatures?.left?.name || '',
      sig_left_title: d.sig_left_title || c.signatures?.left?.title || '',
      sig_right_name: d.sig_right_name || c.signatures?.right?.name || '',
      sig_right_title: d.sig_right_title || c.signatures?.right?.title || '',
      happy_sad: d.happy_sad || [''],
      agenda: d.agenda || [{ title: '', body: '' }],
      recurring_items: d.recurring_items || [],
      attendance: d.attendance || buildAttendanceList(c),
      letterhead_data: d.letterhead_data || '',
      sig_left_data: d.sig_left_data || '',
      sig_right_data: d.sig_right_data || '',
      stamp_data: d.stamp_data || '',
      summary_proposed: d.summary_proposed || 0,
      summary_rotarians: d.summary_rotarians || 0,
      summary_visiting_rotaractors: d.summary_visiting_rotaractors || 0,
      summary_visiting_interactors: d.summary_visiting_interactors || 0,
      summary_guests: d.summary_guests || 0,
    }
  }

  function loadDefaults() {
    form.value = prefilledForm()
    saveToSession()
    clearErrors()
  }

  function resetForm() {
    form.value = emptyForm()
    sessionStorage.removeItem(saveKey)
    clearErrors()
  }

  function saveToSession() {
    sessionStorage.setItem(saveKey, JSON.stringify(form.value))
  }

  function validate(showAttendance = true) {
    const result = validateRotaForm(form.value, { showAttendance })
    if (!result.valid) {
      fieldErrors.value = result.errors
      const names = Object.keys(result.errors).map(fld => fieldLabels[fld] || fld)
      error.value = 'Please fix these fields: ' + [...new Set(names)].join(', ')
    }
    return result.valid
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

  async function handleImageUpload(field, file) {
    if (!file) {
      form.value[field] = ''
      imageWarnings.value[field] = ''
      return
    }
    imageWarnings.value[field] = checkImageSize(file)
    try {
      form.value[field] = await readImageAsJpeg(file)
    } catch {
      imageWarnings.value[field] = 'Failed to read image.'
    }
  }

  function clearImage(field) {
    form.value[field] = ''
    imageWarnings.value[field] = ''
  }

  function exportForm() {
    const data = JSON.stringify(form.value, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const label = form.value.type === 'general' ? 'GM' : form.value.type === 'board' ? 'BM' : 'ZM'
    a.download = `rota-minutes-${label}${form.value.meeting_number}-${form.value.date || 'nodate'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function importForm(file) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data.letterhead_data || data.sig_left_data || data.sig_right_data || data.stamp_data) {
        data.letterhead_data = await convertImageToJpeg(data.letterhead_data)
        data.sig_left_data = await convertImageToJpeg(data.sig_left_data)
        data.sig_right_data = await convertImageToJpeg(data.sig_right_data)
        data.stamp_data = await convertImageToJpeg(data.stamp_data)
      }
      form.value = data
      saveToSession()
      importExportMode.value = null
      clearErrors()
    } catch {
      error.value = 'Failed to parse JSON file.'
    }
  }

  watch(
    form,
    () => {
      saveToSession()
      if (error.value || Object.keys(fieldErrors.value).length) {
        clearErrors()
      }
    },
    { deep: true },
  )

  onMounted(() => {
    const saved = sessionStorage.getItem(saveKey)
    if (saved) {
      try {
        form.value = JSON.parse(saved)
        return
      } catch { /* ignore */ }
    }
    form.value = prefilledForm()
  })

  return {
    form,
    error,
    fieldErrors,
    imageWarnings,
    importExportMode,
    attendancePresent,
    totalPresent,
    recurringPool,
    recurringSelected,
    fieldLabels,
    hasError,
    fieldError,
    clearErrors,
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
    exportForm,
    importForm,
  }
}
