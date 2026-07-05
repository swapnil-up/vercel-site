export function emptyForm() {
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

export function buildAttendanceList(config) {
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

export function prefilledForm(config, defaults) {
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
