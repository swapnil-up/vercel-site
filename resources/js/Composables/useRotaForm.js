import { ref, computed, watch, onMounted } from 'vue'
import { checkImageSize, readImageAsJpeg, convertImageToJpeg } from '../Utils/rotaMinutesImages.js'
import { validateRotaForm, getFieldLabels } from '../Utils/rotaMinutesValidation.js'
import { emptyForm, buildAttendanceList, prefilledForm } from '../Utils/rotaFormData.js'

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

  function loadDefaults() {
    form.value = prefilledForm(config, defaults)
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
    form.value = prefilledForm(config, defaults)
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
    importForm,
  }
}
