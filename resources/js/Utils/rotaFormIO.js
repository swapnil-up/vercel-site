export function downloadJson(form) {
  const data = JSON.stringify(form, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const label = form.type === 'general' ? 'GM' : form.type === 'board' ? 'BM' : 'ZM'
  a.download = `rota-minutes-${label}${form.meeting_number}-${form.date || 'nodate'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
