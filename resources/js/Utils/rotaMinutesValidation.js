const fieldLabels = {
  type: 'Meeting Type',
  meeting_number: 'Meeting Number',
  date: 'Date',
  time_from: 'Time From',
  time_to: 'Time To',
  venue: 'Venue',
  minute_taker: 'Minute Taker',
  year: 'Rota Year',
  club_name: 'Club Name',
  club_number: 'Club Number',
  rid: 'R.I. District',
  president: 'President',
  member_prefix: 'Member Prefix',
  footer_note: 'Footer Note',
  sig_left_name: 'Left Signature Name',
  sig_left_title: 'Left Signature Title',
  sig_right_name: 'Right Signature Name',
  sig_right_title: 'Right Signature Title',
  attendance: 'Attendance',
  happy_sad: 'Happy & Sad News',
  agenda: 'Agenda Items',
  recurring_items: 'Recurring Items',
  summary_proposed: 'Proposed Members',
  summary_rotarians: 'Rotarians',
  summary_visiting_rotaractors: 'Visiting Rotaractors',
  summary_visiting_interactors: 'Visiting Interactors',
  summary_guests: 'Summary – Guests',
}

export function getFieldLabels() {
  return fieldLabels
}

export function validateRotaForm(f, options = {}) {
  const { showAttendance = true } = options
  const errs = {}

  if (!f.type) errs.type = 'Select meeting type'
  if (!f.meeting_number || f.meeting_number < 1 || !Number.isInteger(Number(f.meeting_number)))
    errs.meeting_number = 'Enter a valid meeting number'
  if (!f.date) errs.date = 'Select a date'
  if (!f.time_from) errs.time_from = 'Enter start time'
  if (!f.time_to) errs.time_to = 'Enter end time'
  if (!f.venue?.trim()) errs.venue = 'Enter venue'
  if (!f.minute_taker?.trim()) errs.minute_taker = 'Enter minute taker'
  if (!f.year?.trim()) errs.year = 'Enter rota year'
  if (!f.club_name?.trim()) errs.club_name = 'Enter club name'
  if (f.type !== 'zonal' && !f.club_number?.trim()) errs.club_number = 'Enter club number'
  if (!f.rid?.trim()) errs.rid = 'Enter R.I. District'
  if (!f.president?.trim()) errs.president = 'Enter president name'
  if (!f.member_prefix?.trim()) errs.member_prefix = 'Enter member prefix'
  if (f.type !== 'zonal' && !f.footer_note?.trim()) errs.footer_note = 'Enter footer note'

  if (f.type !== 'zonal') {
    if (!f.sig_left_name?.trim()) errs.sig_left_name = 'Enter left signature name'
    if (!f.sig_left_title?.trim()) errs.sig_left_title = 'Enter left signature title'
    if (!f.sig_right_name?.trim()) errs.sig_right_name = 'Enter right signature name'
    if (!f.sig_right_title?.trim()) errs.sig_right_title = 'Enter right signature title'
  }

  if (showAttendance) {
    const present = (f.attendance || []).filter(a => a.present && a.name?.trim())
    if (present.length === 0) errs.attendance = 'At least one member must be present and marked present'
  }

  if (f.type !== 'zonal') {
    if (f.summary_proposed < 0) errs.summary_proposed = 'Cannot be negative'
    if (f.summary_rotarians < 0) errs.summary_rotarians = 'Cannot be negative'
    if (f.summary_visiting_rotaractors < 0) errs.summary_visiting_rotaractors = 'Cannot be negative'
    if (f.summary_visiting_interactors < 0) errs.summary_visiting_interactors = 'Cannot be negative'
    if (f.summary_guests < 0) errs.summary_guests = 'Cannot be negative'
  }

  return { valid: Object.keys(errs).length === 0, errors: errs }
}
