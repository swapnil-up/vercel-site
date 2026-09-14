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
  if (!printWin) {
    // Fallback: print in current window
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:9999'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument
    doc.open()
    doc.write(html)
    doc.close()
    setTimeout(() => {
      iframe.contentWindow.print()
      setTimeout(() => { iframe.remove(); onComplete?.() }, 1000)
    }, 500)
    return true
  }
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
