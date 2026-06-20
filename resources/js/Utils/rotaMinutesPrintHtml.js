export function escapeHtml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  const day = d.getDate()
  const suffix = day >= 11 && day <= 13 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10] || 'th'
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${day}${suffix} ${months[d.getMonth()]}, ${d.getFullYear()}`
}

export function formatTime(val) {
  if (!val) return ''
  const parts = val.split(':')
  if (parts.length < 2) return val
  const h = parseInt(parts[0], 10)
  const m = parts[1]
  const ampm = h >= 12 ? 'P.M' : 'A.M'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function isBoard(form) {
  return form.type === 'board'
}

function meetingTypeLabel(form) {
  return isBoard(form) ? 'BM' : 'GM'
}

export function buildPrintHtml(form) {
  const prefix = form.member_prefix
  const clubName = form.club_name
  const dateStr = formatDate(form.date)
  const timeFrom = formatTime(form.time_from)
  const timeTo = formatTime(form.time_to)
  const isBm = isBoard(form)
  const mtgLabel = meetingTypeLabel(form)

  const letterheadHtml = form.letterhead_data
    ? `<img src="${form.letterhead_data}" style="width: 100%; display: block;" alt="Letterhead"/>`
    : ''

  let attRows = ''
  let idx = 1
  for (const m of form.attendance) {
    if (m.present && m.name?.trim()) {
      attRows += `<tr><td>${idx}.</td><td>${prefix} ${m.name}</td><td>${m.designation}</td></tr>`
      idx++
    }
  }
  const attTable = attRows
    ? `<table class="attendance-table"><tr><th>S.N.</th><th>Name</th><th>Designation</th></tr>${attRows}</table>`
    : '<p>No attendance recorded.</p>'

  let happyHtml = ''
  for (const item of form.happy_sad) {
    if (item?.trim()) {
      happyHtml += `<p class="body-text">&bull; ${escapeHtml(item)}</p>`
    }
  }
  happyHtml = happyHtml || '<p class="body-text">No happy &amp; sad news shared.</p>'

  let agendaHtml = ''
  for (let i = 0; i < form.agenda.length; i++) {
    const num = i + 1
    const item = form.agenda[i]
    agendaHtml += `<p class="agenda-title">${num}. ${escapeHtml(item.title)}</p>`
    agendaHtml += `<p class="agenda-body">${escapeHtml(item.body)}</p>`
  }
  for (const item of form.recurring_items) {
    if (item?.trim()) {
      agendaHtml += `<p class="agenda-body">- ${escapeHtml(item)}</p>`
    }
  }
  agendaHtml = agendaHtml || '<p class="body-text">No agenda items.</p>'

  const presentCount = form.attendance.filter(a => a.present && a.name?.trim()).length
  const total = presentCount
    + (parseInt(form.summary_proposed) || 0)
    + (parseInt(form.summary_rotarians) || 0)
    + (parseInt(form.summary_visiting_rotaractors) || 0)
    + (parseInt(form.summary_visiting_interactors) || 0)
    + (parseInt(form.summary_guests) || 0)

  const sigLeftImg = form.sig_left_data ? `<img src="${form.sig_left_data}" style="width:1.50in;"/>` : ''
  const sigRightImg = form.sig_right_data ? `<img src="${form.sig_right_data}" style="width:1.46in;"/>` : ''
  const stampImg = form.stamp_data ? `<img src="${form.stamp_data}" style="width:1.24in;"/>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @page {
    size: 8.26in 11.68in;
    margin: 0.35in;
  }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 14pt;
    line-height: 1.0;
    margin: 0;
    padding: 0;
  }
  img { display: block; }
  .meeting-number {
    text-align: center;
    font-weight: bold;
    font-size: 14pt;
    margin-top: 0.2in;
    margin-bottom: 0;
  }
  .meta-line { margin: 0.09in 0 0 0; font-size: 14pt; line-height: 1.0; }
  .body-text { font-size: 14pt; line-height: 1.425; margin: 0; }
  .body-text + .body-text { margin-top: 3pt; }
  .body-text.small-gap { margin-top: 0.042in; }
  .section-header { font-weight: bold; font-size: 12pt; margin: 0; line-height: 1.0; }
  .section-header.attendance { margin-top: 0.2in; }
  .section-header.happy-sad { margin-top: 0.2in; }
  .section-header.agendas { margin-top: 0.2in; }
  .section-header.summary { margin-top: 0.3in; }
  .attendance-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12pt;
    font-family: 'Times New Roman', Times, serif;
    margin-top: 0.1in;
  }
  .attendance-table th { font-weight: bold; border: 1px solid black; padding: 4pt 6pt; text-align: left; }
  .attendance-table td { border: 1px solid black; padding: 4pt 6pt; }
  .agenda-title { font-size: 14pt; font-weight: bold; line-height: 1.425; margin: 0.4em 0 0 0; }
  .agenda-body { font-size: 14pt; line-height: 1.425; margin: 0 0 0.3em 0; }
  .summary-line { font-size: 14pt; margin: 0; line-height: 1.4; }
  .signatures { margin-top: 0.5in; page-break-inside: avoid; }
  .sig-table { width: 100%; border: none; border-collapse: collapse; }
  .sig-table td { border: none; padding: 0; vertical-align: top; }
  .sig-table img { display: block; }
  .sig-left { width: 50%; text-align: left; font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.4375; }
  .sig-right { width: 50%; text-align: left; font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.4375; }
  .footer-note { font-size: 10pt; text-align: center; margin-top: 0.15in; }
</style>
</head>
<body>

<table style="width:100%;border-collapse:collapse;">
${letterheadHtml ? `<thead><tr><td style="border:none;padding:0;">${letterheadHtml}</td></tr></thead>` : ''}
<tbody><tr><td style="border:none;padding:0;">

<p class="meeting-number">${mtgLabel} Meeting no. ${form.meeting_number}</p>

<p class="meta-line">Rota year: ${escapeHtml(form.year)}</p>
<p class="meta-line">Meeting Venue: ${escapeHtml(form.venue)}</p>
<p class="meta-line">Meeting Date: ${dateStr}</p>
<p class="meta-line">Meeting From: ${timeFrom}</p>
<p class="meta-line">Meeting To: ${timeTo}</p>

<p class="body-text" style="margin-top:0.1in;">&bull; President ${escapeHtml(form.president)} presided over the ${isBm ? 'Board' : 'General'} Meeting of ${escapeHtml(clubName)}, of R.I. District ${escapeHtml(form.rid)}.</p>
<p class="body-text small-gap">&bull; Minutes taken by ${escapeHtml(form.minute_taker)}.</p>

${isBm ? '' : `<p class="section-header attendance">Meeting Attendance:</p>`}
${isBm ? '' : attTable}

${isBm ? '' : `<p class="section-header happy-sad">Happy &amp; Sad News Sharing (Sunshine Fund):</p>`}
${isBm ? '' : happyHtml}

<p class="section-header agendas">Agendas:</p>
${agendaHtml}

<p class="section-header summary">Meeting summary:</p>
<p class="summary-line">&bull; Meeting From: ${timeFrom}</p>
<p class="summary-line">&bull; Meeting To: ${timeTo}</p>
<p class="summary-line">&bull; Proposed Members: ${form.summary_proposed}</p>
<p class="summary-line">&bull; Rotarians: ${form.summary_rotarians}</p>
<p class="summary-line">&bull; Visiting Rotaractors: ${form.summary_visiting_rotaractors}</p>
<p class="summary-line">&bull; Visiting Interactors: ${form.summary_visiting_interactors}</p>
<p class="summary-line">&bull; Guests: ${form.summary_guests}</p>
<p class="summary-line">&bull; Total Present: ${total}</p>

<div class="signatures">
  <table class="sig-table">
    <tr>
      <td class="sig-left">${sigLeftImg}</td>
      <td class="sig-right">${sigRightImg}</td>
    </tr>
    <tr>
      <td class="sig-left">_________________________</td>
      <td class="sig-right">_________________________</td>
    </tr>
    <tr>
      <td class="sig-left">${escapeHtml(form.sig_left_name)}</td>
      <td class="sig-right">${escapeHtml(form.sig_right_name)}</td>
    </tr>
    <tr>
      <td class="sig-left">${escapeHtml(form.sig_left_title)}</td>
      <td class="sig-right">${escapeHtml(form.sig_right_title)}</td>
    </tr>
    <tr>
      <td class="sig-left">${escapeHtml(clubName)}</td>
      <td class="sig-right">${escapeHtml(clubName)}</td>
    </tr>
    <tr>
      <td class="sig-left">${escapeHtml(form.year)}</td>
      <td class="sig-right">${escapeHtml(form.year)}</td>
    </tr>
  </table>
  <p style="margin-top:0.3in;">
    ${stampImg}
  </p>
</div>

</td></tr></tbody>
<tfoot><tr><td style="border:none;padding:0;">

<p class="footer-note">${escapeHtml(form.footer_note)}</p>

</td></tr></tfoot>
</table>

</body>
</html>`
}
