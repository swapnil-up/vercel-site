import { describe, it, expect } from 'vitest'
import {
  toCents,
  computeTotalCents,
  normalizeData,
  computeBalances,
  computeSettlements
} from './billSplitter.js'

/* ─── toCents / computeTotalCents ─── */

describe('toCents', () => {
  it('converts decimal amounts to integer cents', () => {
    expect(toCents('1200.00')).toBe(120000)
    expect(toCents('0.01')).toBe(1)
    expect(toCents(49.99)).toBe(4999)
  })

  it('treats invalid input as zero', () => {
    expect(toCents('')).toBe(0)
    expect(toCents('abc')).toBe(0)
    expect(toCents(undefined)).toBe(0)
    expect(toCents(null)).toBe(0)
  })
})

describe('computeTotalCents', () => {
  it('sums item costs in cents', () => {
    const items = [{ cost: '1200.00' }, { cost: '400' }, { cost: '900.55' }]
    expect(computeTotalCents(items)).toBe(250055)
  })

  it('ignores invalid costs', () => {
    expect(computeTotalCents([{ cost: '' }, { cost: 'oops' }, { cost: '10' }])).toBe(1000)
  })
})

/* ─── normalizeData ─── */

describe('normalizeData', () => {
  it('rejects non-objects', () => {
    expect(normalizeData(null).ok).toBe(false)
    expect(normalizeData('nope').ok).toBe(false)
    expect(normalizeData(42).ok).toBe(false)
  })

  it('rejects missing people/items arrays', () => {
    const result = normalizeData({ people: [] })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/people.*items/)
  })

  it('migrates legacy string people with index-based items', () => {
    const legacy = {
      people: ['Alice', 'Bob', 'Charlie'],
      items: [
        { id: 1, description: 'Dinner', cost: '1200.00', paidBy: 0, sharedBy: [true, true, true] },
        { id: 2, description: 'Taxi', cost: '400', paidBy: 1, sharedBy: [true, true, false] }
      ],
      currency: 'Rs.'
    }

    const result = normalizeData(legacy)
    expect(result.ok).toBe(true)
    expect(result.people).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' }
    ])
    expect(result.items[0]).toMatchObject({ paidBy: 1, sharedBy: [1, 2, 3] })
    expect(result.items[1]).toMatchObject({ paidBy: 2, sharedBy: [1, 2] })
    expect(result.notes).toContain('Upgraded from legacy format.')
  })

  it('handles legacy blank names and out-of-range paidBy', () => {
    const legacy = {
      people: ['Alice', '', 'Charlie'],
      items: [
        { description: 'X', cost: '10', paidBy: 7, sharedBy: [true, false, true] }
      ]
    }

    const result = normalizeData(legacy)
    expect(result.ok).toBe(true)
    expect(result.people[1]).toEqual({ id: 2, name: '' })
    expect(result.items[0].paidBy).toBe(1)
    expect(result.items[0].sharedBy).toEqual([1, 3])
  })

  it('preserves object-format person ids and references', () => {
    const modern = {
      version: 2,
      people: [
        { id: 5, name: 'Alice' },
        { id: 9, name: 'Bob' }
      ],
      items: [
        { id: 1, description: 'Dinner', cost: '100', paidBy: 9, sharedBy: [5, 9] }
      ]
    }

    const result = normalizeData(modern)
    expect(result.ok).toBe(true)
    expect(result.people.map(p => p.id)).toEqual([5, 9])
    expect(result.items[0]).toMatchObject({ paidBy: 9, sharedBy: [5, 9] })
  })

  it('remaps duplicate person ids and follows references', () => {
    const dup = {
      people: [
        { id: 1, name: 'Alice' },
        { id: 1, name: 'Bob' }
      ],
      items: [
        { id: 1, description: 'X', cost: '10', paidBy: 1, sharedBy: [1] }
      ]
    }

    const result = normalizeData(dup)
    expect(result.ok).toBe(true)
    expect(result.people.map(p => p.id)).toEqual([1, 2])
    expect(result.items[0].paidBy).toBe(1)
    expect(result.items[0].sharedBy).toEqual([1])
  })

  it('drops invalid paidBy/sharedBy refs with a note', () => {
    const badRefs = {
      people: [{ id: 1, name: 'Alice' }],
      items: [
        { id: 1, description: 'X', cost: '10', paidBy: 99, sharedBy: [1, 99] }
      ]
    }

    const result = normalizeData(badRefs)
    expect(result.ok).toBe(true)
    expect(result.items[0].paidBy).toBe(1)
    expect(result.items[0].sharedBy).toEqual([1])
    expect(result.notes.some(n => /invalid reference/.test(n))).toBe(true)
  })

  it('dedupes colliding item ids', () => {
    const colliding = {
      people: [{ id: 1, name: 'A' }],
      items: [
        { id: 1, description: 'X', cost: '1', paidBy: 1, sharedBy: [1] },
        { id: 1, description: 'Y', cost: '2', paidBy: 1, sharedBy: [1] }
      ]
    }

    const result = normalizeData(colliding)
    expect(result.items.map(i => i.id)).toEqual([1, 2])
  })

  it('handles empty people and items', () => {
    const result = normalizeData({ people: [], items: [] })
    expect(result.ok).toBe(true)
    expect(result.people).toEqual([])
    expect(result.items).toEqual([])
  })

  it('defaults currency and preserves costs as strings', () => {
    const result = normalizeData({
      people: [{ id: 1, name: 'A' }],
      items: [{ id: 1, description: 'X', cost: 10.5, paidBy: 1, sharedBy: [1] }]
    })
    expect(result.currency).toBe('Rs.')
    expect(result.items[0].cost).toBe('10.5')
  })

  it('skips null/garbage item entries', () => {
    const result = normalizeData({
      people: [{ id: 1, name: 'A' }],
      items: [null, { id: 1, description: 'X', cost: '5', paidBy: 1, sharedBy: [1] }, 'nope']
    })
    expect(result.items).toHaveLength(1)
    expect(result.items[0].description).toBe('X')
  })
})

/* ─── computeBalances ─── */

describe('computeBalances', () => {
  const alice = { id: 1, name: 'Alice' }
  const bob = { id: 2, name: 'Bob' }
  const charlie = { id: 3, name: 'Charlie' }

  it('credits payer and debits sharers equally', () => {
    const balances = computeBalances(
      [alice, bob, charlie],
      [{ cost: '1200', paidBy: 1, sharedBy: [1, 2, 3] }]
    )
    expect(balances[1]).toBe(120000 - 40000)
    expect(balances[2]).toBe(-40000)
    expect(balances[3]).toBe(-40000)
  })

  it('handles payer who is not a sharer', () => {
    const balances = computeBalances(
      [alice, bob],
      [{ cost: '100', paidBy: 1, sharedBy: [2] }]
    )
    expect(balances[1]).toBe(10000)
    expect(balances[2]).toBe(-10000)
  })

  it('splits uneven amounts in exact cents with no drift', () => {
    const balances = computeBalances(
      [alice, bob, charlie],
      [{ cost: '100', paidBy: 1, sharedBy: [1, 2, 3] }]
    )
    const total = balances[1] + balances[2] + balances[3]
    expect(total).toBe(0)
    expect(balances[1]).toBe(10000 - 3334)
    expect(balances[2]).toBe(-3333)
    expect(balances[3]).toBe(-3333)
  })

  it('assigns remainder cents to the first sharers', () => {
    const balances = computeBalances(
      [alice, bob, charlie],
      [{ cost: '10.01', paidBy: 3, sharedBy: [1, 2, 3] }]
    )
    expect(balances[1]).toBe(-334)
    expect(balances[2]).toBe(-334)
    expect(balances[3]).toBe(1001 - 333)
    expect(balances[1] + balances[2] + balances[3]).toBe(0)
  })

  it('always produces zero-sum balances', () => {
    const balances = computeBalances(
      [alice, bob, charlie],
      [
        { cost: '99.99', paidBy: 1, sharedBy: [1, 2] },
        { cost: '0.01', paidBy: 2, sharedBy: [1, 2, 3] },
        { cost: '33.33', paidBy: 3, sharedBy: [1, 3] }
      ]
    )
    const total = Object.values(balances).reduce((a, b) => a + b, 0)
    expect(total).toBe(0)
  })

  it('skips zero, negative, and invalid costs', () => {
    const balances = computeBalances(
      [alice, bob],
      [
        { cost: '0', paidBy: 1, sharedBy: [1, 2] },
        { cost: '', paidBy: 1, sharedBy: [1, 2] },
        { cost: '-50', paidBy: 1, sharedBy: [1, 2] }
      ]
    )
    expect(balances[1]).toBe(0)
    expect(balances[2]).toBe(0)
  })

  it('skips items with no sharers', () => {
    const balances = computeBalances(
      [alice, bob],
      [{ cost: '100', paidBy: 1, sharedBy: [] }]
    )
    expect(balances[1]).toBe(0)
    expect(balances[2]).toBe(0)
  })

  it('ignores unknown sharer ids', () => {
    const balances = computeBalances(
      [alice],
      [{ cost: '50', paidBy: 1, sharedBy: [1, 99] }]
    )
    expect(balances[1]).toBe(5000 - 5000)
  })

  it('accumulates across multiple items', () => {
    const balances = computeBalances(
      [alice, bob],
      [
        { cost: '100', paidBy: 1, sharedBy: [1, 2] },
        { cost: '200', paidBy: 2, sharedBy: [1, 2] }
      ]
    )
    expect(balances[1]).toBe(10000 - 5000 - 10000)
    expect(balances[2]).toBe(20000 - 5000 - 10000)
  })
})

/* ─── computeSettlements ─── */

describe('computeSettlements', () => {
  it('returns empty for all-zero balances', () => {
    expect(computeSettlements({ 1: 0, 2: 0 })).toEqual([])
    expect(computeSettlements({})).toEqual([])
  })

  it('produces a single transfer for one debtor and one creditor', () => {
    expect(computeSettlements({ 1: 5000, 2: -5000 })).toEqual([
      { fromId: 2, toId: 1, cents: 5000 }
    ])
  })

  it('merges greedily across multiple creditors and debtors', () => {
    const list = computeSettlements({ 1: 6000, 2: -3000, 3: -3000 })
    expect(list).toHaveLength(2)
    const total = list.reduce((s, t) => s + t.cents, 0)
    expect(total).toBe(6000)
    expect(list.every(t => t.fromId !== t.toId)).toBe(true)
  })

  it('splits one large creditor across many debtors', () => {
    const list = computeSettlements({ 1: 10000, 2: -4000, 3: -6000 })
    expect(list).toEqual([
      { fromId: 3, toId: 1, cents: 6000 },
      { fromId: 2, toId: 1, cents: 4000 }
    ])
  })

  it('includes 1-cent balances', () => {
    const list = computeSettlements({ 1: 1, 2: -1 })
    expect(list).toEqual([{ fromId: 2, toId: 1, cents: 1 }])
  })

  it('settles to zero across a complex split', () => {
    const people = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const items = [
      { cost: '99.99', paidBy: 1, sharedBy: [1, 2, 3] },
      { cost: '0.03', paidBy: 2, sharedBy: [1, 2, 3] }
    ]
    const balances = computeBalances(people, items)
    const list = computeSettlements(balances)

    const net = { 1: balances[1], 2: balances[2], 3: balances[3] }
    list.forEach(t => {
      net[t.fromId] += t.cents
      net[t.toId] -= t.cents
    })
    expect(Object.values(net).every(v => v === 0)).toBe(true)
  })
})
