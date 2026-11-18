export const parsePipeFields = (line) => {
  const fields = []
  let current = ''

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '\\' && line[index + 1] === '|') {
      current += '|'
      index += 1
    } else if (character === '|') {
      fields.push(current)
      current = ''
    } else {
      current += character
    }
  }

  fields.push(current)
  return fields
}

export const parseCardDeck = (text) => {
  if (typeof text !== 'string') return []

  const cards = []
  const source = text.replace(/^\uFEFF/, '')

  for (const rawLine of source.split(/\r?\n/)) {
    if (!rawLine.trim()) continue

    const fields = parsePipeFields(rawLine)
    if (fields.length < 2 || !fields[0].trim()) continue

    cards.push({
      question: fields[0].trim(),
      answer: fields[1].trim(),
      extra: fields.slice(2).join('|').trim(),
    })
  }

  return cards
}

export const createIdentityOrder = (cardCount) =>
  Array.from({ length: cardCount }, (_, index) => index)

export const createShuffledOrder = (cardCount, random = Math.random) => {
  const order = createIdentityOrder(cardCount)

  for (let index = order.length - 1; index > 0; index -= 1) {
    const randomValue = Math.min(Math.max(random(), 0), 0.999999999)
    const swapIndex = Math.floor(randomValue * (index + 1))
    const currentCard = order[index]
    order[index] = order[swapIndex]
    order[swapIndex] = currentCard
  }

  return order
}

export const isValidOrder = (order, cardCount) =>
  Array.isArray(order) &&
  order.length === cardCount &&
  new Set(order).size === cardCount &&
  order.every(
    (index) => Number.isInteger(index) && index >= 0 && index < cardCount
  )

export const normalizeDeckState = (state, cardCount) => {
  const savedOrder = state?.order
  const validOrder = isValidOrder(savedOrder, cardCount)
  const rawPosition = state?.pos

  return {
    order: validOrder ? [...savedOrder] : createIdentityOrder(cardCount),
    position: Number.isInteger(rawPosition)
      ? Math.min(Math.max(rawPosition, 0), Math.max(cardCount - 1, 0))
      : 0,
    shuffled: Boolean(state?.shuffled) && validOrder,
  }
}
