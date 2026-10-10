export const toCents = (amount) => Math.round((parseFloat(amount) || 0) * 100)

export const computeTotalCents = (items) =>
  items.reduce((sum, item) => sum + toCents(item.cost), 0)

export const normalizeData = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid data format.' }
  }
  if (!Array.isArray(raw.people) || !Array.isArray(raw.items)) {
    return { ok: false, error: 'File must include "people" and "items" arrays.' }
  }

  const notes = []
  const oldFormat = raw.people.length > 0 && typeof raw.people[0] === 'string'

  let peopleOut
  let itemsOut

  if (oldFormat) {
    peopleOut = raw.people.map((name, i) => ({ id: i + 1, name: String(name ?? '') }))
    itemsOut = raw.items.map((it, i) => {
      if (!it || typeof it !== 'object') return null
      const oldPaidBy = Number(it.paidBy)
      const sharedBooleans = Array.isArray(it.sharedBy) ? it.sharedBy : []
      return {
        id: Number.isFinite(Number(it.id)) ? Number(it.id) : i + 1,
        description: String(it.description ?? ''),
        cost: it.cost === undefined || it.cost === null ? '' : String(it.cost),
        paidBy: oldPaidBy >= 0 && oldPaidBy < peopleOut.length
          ? peopleOut[oldPaidBy].id
          : (peopleOut[0]?.id ?? null),
        sharedBy: sharedBooleans
          .map((on, idx) => (on && peopleOut[idx] ? peopleOut[idx].id : null))
          .filter(id => id !== null)
      }
    }).filter(Boolean)
    notes.push('Upgraded from legacy format.')
  } else {
    const idMap = new Map()
    const usedIds = new Set()
    peopleOut = raw.people.map((p, i) => {
      const rawId = Number(p?.id)
      let id = Number.isFinite(rawId) && !usedIds.has(rawId) ? rawId : null
      if (id === null) {
        id = i + 1
        while (usedIds.has(id)) id++
      }
      usedIds.add(id)
      if (Number.isFinite(rawId) && !idMap.has(rawId)) idMap.set(rawId, id)
      return { id, name: String(p?.name ?? '') }
    })

    let dropped = 0
    itemsOut = raw.items.map((it, i) => {
      if (!it || typeof it !== 'object') return null
      const paidRaw = Number(it.paidBy)
      let paidBy = idMap.has(paidRaw) ? idMap.get(paidRaw) : paidRaw
      if (!peopleOut.some(p => p.id === paidBy)) {
        dropped++
        paidBy = peopleOut[0]?.id ?? null
      }

      const sharedRaw = Array.isArray(it.sharedBy) ? it.sharedBy : []
      const boolStyle = sharedRaw.length > 0 && sharedRaw.every(v => typeof v === 'boolean')
      let sharedBy
      if (boolStyle) {
        sharedBy = sharedRaw
          .map((on, idx) => (on && peopleOut[idx] ? peopleOut[idx].id : null))
          .filter(id => id !== null)
        dropped += sharedRaw.filter(Boolean).length - sharedBy.length
      } else {
        sharedBy = [...new Set(
          sharedRaw
            .map(Number)
            .map(id => (idMap.has(id) ? idMap.get(id) : id))
            .filter(id => peopleOut.some(p => p.id === id))
        )]
        dropped += sharedRaw.length - sharedBy.length
      }

      return {
        id: Number.isFinite(Number(it.id)) ? Number(it.id) : i + 1,
        description: String(it.description ?? ''),
        cost: it.cost === undefined || it.cost === null ? '' : String(it.cost),
        paidBy,
        sharedBy
      }
    }).filter(Boolean)

    if (dropped > 0) notes.push(`Removed ${dropped} invalid reference${dropped > 1 ? 's' : ''}.`)
  }

  const usedItemIds = new Set()
  itemsOut.forEach((it, i) => {
    let id = Number.isFinite(Number(it.id)) ? Number(it.id) : i + 1
    while (usedItemIds.has(id)) id++
    it.id = id
    usedItemIds.add(id)
  })

  return {
    ok: true,
    people: peopleOut,
    items: itemsOut,
    currency: String(raw.currency || 'Rs.'),
    notes
  }
}

export const computeBalances = (people, items) => {
  const map = {}
  people.forEach(p => { map[p.id] = 0 })

  items.forEach(item => {
    const costCents = toCents(item.cost)
    const sharers = item.sharedBy.filter(id => map[id] !== undefined)
    if (costCents <= 0 || sharers.length === 0) return

    if (map[item.paidBy] !== undefined) map[item.paidBy] += costCents

    const base = Math.floor(costCents / sharers.length)
    let remainder = costCents - base * sharers.length
    sharers.forEach(id => {
      const share = base + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder--
      map[id] -= share
    })
  })

  return map
}

export const computeSettlements = (balances) => {
  const creditors = []
  const debtors = []

  Object.entries(balances).forEach(([id, cents]) => {
    if (cents > 0) creditors.push({ id: Number(id), cents })
    else if (cents < 0) debtors.push({ id: Number(id), cents: -cents })
  })

  creditors.sort((a, b) => b.cents - a.cents)
  debtors.sort((a, b) => b.cents - a.cents)

  const list = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].cents, debtors[di].cents)

    list.push({ fromId: debtors[di].id, toId: creditors[ci].id, cents: amount })

    creditors[ci].cents -= amount
    debtors[di].cents -= amount

    if (creditors[ci].cents === 0) ci++
    if (debtors[di].cents === 0) di++
  }

  return list
}
