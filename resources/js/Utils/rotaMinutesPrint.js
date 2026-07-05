export function prepareFormData(form, showAttendance) {
  return {
    ...form,
    attendance: !showAttendance
      ? form.attendance.map(a => ({ ...a, present: false }))
      : form.attendance,
  }
}

export function printHtml(html, { onComplete } = {}) {
  const printWin = window.open('', '_blank')
  if (!printWin) return false
  printWin.document.write(html)
  printWin.document.close()
  printWin.focus()
  printWin.onafterprint = () => {
    printWin.close()
    onComplete?.()
  }
  setTimeout(() => printWin.print(), 500)
  return true
}
