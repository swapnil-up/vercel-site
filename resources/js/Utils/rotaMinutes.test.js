import { describe, it, expect } from 'vitest'
import { validateRotaForm, getFieldLabels } from './rotaMinutesValidation.js'
import { buildPrintHtml, formatDate, formatTime, escapeHtml } from './rotaMinutesPrintHtml.js'

const validForm = {
  type: 'general',
  meeting_number: 42,
  date: '2026-06-14',
  time_from: '18:00',
  time_to: '19:30',
  venue: 'Main Hall',
  minute_taker: 'Secretary',
  year: '2026/27',
  club_name: 'Rotaract Club of Test',
  club_number: '12345',
  rid: '3292',
  president: 'Rtr. President',
  member_prefix: 'Rtr.',
  footer_note: 'Approved.',
  sig_left_name: 'Pres',
  sig_left_title: 'President',
  sig_right_name: 'Sec',
  sig_right_title: 'Secretary',
  attendance: [{ name: 'Member A', designation: 'GM', present: true }],
  happy_sad: ['Great meeting'],
  agenda: [{ title: 'Review', body: 'Reviewed minutes' }],
  recurring_items: [],
  summary_proposed: 1,
  summary_rotarians: 0,
  summary_visiting_rotaractors: 0,
  summary_visiting_interactors: 0,
  summary_guests: 0,
}

/* ─── Validation Tests ─── */

describe('validateRotaForm', () => {
  it('passes a valid general meeting form', () => {
    const result = validateRotaForm(validForm)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('passes a valid board meeting form', () => {
    const r = validateRotaForm({ ...validForm, type: 'board' })
    expect(r.valid).toBe(true)
  })

  it('passes a valid zonal meeting form (fewer required fields)', () => {
    const zonal = {
      ...validForm,
      type: 'zonal',
      club_number: '',
      footer_note: '',
      sig_left_name: '',
      sig_left_title: '',
      sig_right_name: '',
      sig_right_title: '',
      summary_proposed: -1,
    }
    const r = validateRotaForm(zonal)
    expect(r.valid).toBe(true)
    expect(r.errors).toEqual({})
  })

  it('rejects missing type', () => {
    const r = validateRotaForm({ ...validForm, type: '' })
    expect(r.valid).toBe(false)
    expect(r.errors.type).toBeTruthy()
  })

  it('rejects invalid meeting_number', () => {
    const r = validateRotaForm({ ...validForm, meeting_number: '' })
    expect(r.valid).toBe(false)
    expect(r.errors.meeting_number).toBeTruthy()
  })

  it('rejects non-integer meeting_number', () => {
    const r = validateRotaForm({ ...validForm, meeting_number: 'abc' })
    expect(r.valid).toBe(false)
    expect(r.errors.meeting_number).toBeTruthy()
  })

  it('rejects missing date', () => {
    const r = validateRotaForm({ ...validForm, date: '' })
    expect(r.valid).toBe(false)
    expect(r.errors.date).toBeTruthy()
  })

  it('rejects missing venue', () => {
    const r = validateRotaForm({ ...validForm, venue: '' })
    expect(r.valid).toBe(false)
    expect(r.errors.venue).toBeTruthy()
  })

  it('rejects missing minute_taker', () => {
    const r = validateRotaForm({ ...validForm, minute_taker: '' })
    expect(r.valid).toBe(false)
    expect(r.errors.minute_taker).toBeTruthy()
  })

  it('rejects missing club_name', () => {
    const r = validateRotaForm({ ...validForm, club_name: '' })
    expect(r.valid).toBe(false)
    expect(r.errors.club_name).toBeTruthy()
  })

  it('rejects missing club_number for non-zonal', () => {
    const r = validateRotaForm({ ...validForm, club_number: '' })
    expect(r.valid).toBe(false)
    expect(r.errors.club_number).toBeTruthy()
  })

  it('rejects negative summary numbers for non-zonal', () => {
    const r = validateRotaForm({ ...validForm, summary_proposed: -1 })
    expect(r.valid).toBe(false)
    expect(r.errors.summary_proposed).toBeTruthy()
  })

  it('requires at least one present member when showAttendance is true', () => {
    const r = validateRotaForm(
      { ...validForm, attendance: [{ name: 'Member', designation: 'GM', present: false }] },
      { showAttendance: true },
    )
    expect(r.valid).toBe(false)
    expect(r.errors.attendance).toBeTruthy()
  })

  it('skips attendance check when showAttendance is false', () => {
    const r = validateRotaForm(
      { ...validForm, attendance: [{ name: 'Member', designation: 'GM', present: false }] },
      { showAttendance: false },
    )
    expect(r.valid).toBe(true)
  })

  it('returns field labels', () => {
    const labels = getFieldLabels()
    expect(labels.type).toBe('Meeting Type')
    expect(labels.meeting_number).toBe('Meeting Number')
  })
})

/* ─── Print HTML Tests ─── */

describe('buildPrintHtml', () => {
  const baseForm = {
    type: 'general',
    meeting_number: 5,
    date: '2026-07-01',
    time_from: '10:00',
    time_to: '11:30',
    venue: 'Online',
    minute_taker: 'Rtr. Secretary',
    year: '2026/27',
    club_name: 'Test Club',
    club_number: '99999',
    rid: '3292',
    president: 'Rtr. President',
    member_prefix: 'Rtr.',
    footer_note: 'Meeting minutes approved.',
    sig_left_name: 'Rtr. President',
    sig_left_title: 'President',
    sig_right_name: 'Rtr. Secretary',
    sig_right_title: 'Secretary',
    attendance: [
      { name: 'Member A', designation: 'President', present: true },
      { name: 'Member B', designation: 'Secretary', present: true },
      { name: 'Member C', designation: 'GM', present: false },
    ],
    happy_sad: ['Rtr. A shared good news.', 'Rtr. B shared sad news.'],
    agenda: [
      { title: 'Review Minutes', body: 'Reviewed previous minutes.' },
      { title: 'New Business', body: 'Discussed upcoming event.' },
    ],
    recurring_items: ['Standard reminder about dues.'],
    summary_proposed: 2,
    summary_rotarians: 1,
    summary_visiting_rotaractors: 0,
    summary_visiting_interactors: 0,
    summary_guests: 3,
    letterhead_data: '',
    sig_left_data: '',
    sig_right_data: '',
    stamp_data: '',
  }

  it('generates HTML for a general meeting', () => {
    const html = buildPrintHtml(baseForm)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('GM Meeting no. 5')
    expect(html).toContain('Meeting Attendance:')
    expect(html).toContain('Happy &amp; Sad News Sharing')
    expect(html).toContain('Meeting summary:')
    expect(html).toContain('Total Present:')
    expect(html).toContain('Rtr. Member A')
    expect(html).toContain('Rtr. Member B')
    expect(html).not.toContain('Rtr. Member C')
    expect(html).toContain('Review Minutes')
    expect(html).toContain('Standard reminder about dues.')
    expect(html).toContain('Test Club')
    expect(html).toContain('3292')
  })

  it('generates HTML for a board meeting (no happy/sad, no attendance)', () => {
    const html = buildPrintHtml({ ...baseForm, type: 'board' })
    expect(html).toContain('BM Meeting no. 5')
    expect(html).not.toContain('Meeting Attendance:')
    expect(html).not.toContain('Happy &amp; Sad News Sharing')
    expect(html).toContain('Meeting summary:')
  })

  it('generates HTML for a zonal meeting (attendance + happy/sad, no summary/signatures)', () => {
    const html = buildPrintHtml({ ...baseForm, type: 'zonal' })
    expect(html).toContain('Zonal Meeting no. 5')
    expect(html).toContain('Meeting Attendance:')
    expect(html).not.toContain('Meeting summary:')
    expect(html).not.toContain('class="signatures"')
    expect(html).toContain('Happy &amp; Sad News Sharing')
    expect(html).toContain('Agendas:')
  })

  it('skips attendance if no one is present', () => {
    const noAttend = {
      ...baseForm,
      attendance: [
        { name: 'Member A', designation: 'President', present: false },
      ],
    }
    const html = buildPrintHtml(noAttend)
    expect(html).not.toContain('Meeting Attendance:')
  })

  it('includes letterhead when provided', () => {
    const html = buildPrintHtml({ ...baseForm, letterhead_data: 'data:image/jpeg;base64,abc' })
    expect(html).toContain('src="data:image/jpeg;base64,abc"')
  })

  it('includes signature images when provided', () => {
    const html = buildPrintHtml({
      ...baseForm,
      sig_left_data: 'data:image/jpeg;base64,left',
      sig_right_data: 'data:image/jpeg;base64,right',
      stamp_data: 'data:image/jpeg;base64,stamp',
    })
    expect(html).toContain('src="data:image/jpeg;base64,left"')
    expect(html).toContain('src="data:image/jpeg;base64,right"')
    expect(html).toContain('src="data:image/jpeg;base64,stamp"')
  })

  it('renders agenda with nl2br for body text', () => {
    const html = buildPrintHtml({
      ...baseForm,
      agenda: [{ title: 'Notes', body: 'Line one\nLine two' }],
    })
    expect(html).toContain('Line one<br/>Line two')
  })

  it('renders happy/sad with nl2br', () => {
    const html = buildPrintHtml({
      ...baseForm,
      happy_sad: ['Multi\nline'],
    })
    expect(html).toContain('Multi<br/>line')
  })

  it('renders "No agenda items." when no agenda', () => {
    const html = buildPrintHtml({
      ...baseForm,
      agenda: [],
      recurring_items: [],
    })
    expect(html).toContain('No agenda items.')
  })
})

describe('formatDate', () => {
  it('formats YYYY-MM-DD to ordinal date string', () => {
    expect(formatDate('2026-07-01')).toBe('1st July, 2026')
    expect(formatDate('2026-07-02')).toBe('2nd July, 2026')
    expect(formatDate('2026-07-03')).toBe('3rd July, 2026')
    expect(formatDate('2026-07-04')).toBe('4th July, 2026')
    expect(formatDate('2026-07-11')).toBe('11th July, 2026')
    expect(formatDate('2026-07-21')).toBe('21st July, 2026')
    expect(formatDate('2026-12-25')).toBe('25th December, 2026')
  })

  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('')
  })

  it('returns input as-is for invalid format', () => {
    expect(formatDate('invalid')).toBe('invalid')
  })
})

describe('formatTime', () => {
  it('converts 24h to 12h with AM/PM', () => {
    expect(formatTime('10:00')).toBe('10:00 A.M')
    expect(formatTime('12:00')).toBe('12:00 P.M')
    expect(formatTime('13:30')).toBe('1:30 P.M')
    expect(formatTime('00:15')).toBe('12:15 A.M')
  })

  it('returns empty for empty input', () => {
    expect(formatTime('')).toBe('')
  })
})

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    )
  })

  it('returns empty for empty input', () => {
    expect(escapeHtml('')).toBe('')
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })
})
