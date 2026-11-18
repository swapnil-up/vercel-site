export const CRAM_RATINGS = {
  AGAIN: 'again',
  GOOD: 'good',
}

export const CRAM_STAGES = {
  NEW: 'new',
  LEARNING: 'learning',
  GOOD: 'good',
  GRADUATED: 'graduated',
}

export const AGAIN_DELAY_MS = 60 * 1000
export const GOOD_DELAY_MS = 10 * 60 * 1000

export const createCramState = (cardCount, now = Date.now()) => ({
  version: 1,
  startedAt: now,
  updatedAt: now,
  cards: Array.from({ length: Math.max(Number(cardCount) || 0, 0) }, (_, id) => ({
    id,
    stage: CRAM_STAGES.NEW,
    dueAt: now,
  })),
})

export const normalizeCramState = (state, cardCount, now = Date.now()) => {
  const count = Math.max(Number(cardCount) || 0, 0)

  if (!state || !Array.isArray(state.cards) || state.cards.length !== count) {
    return createCramState(count, now)
  }

  const cards = state.cards.map((card, id) => {
    const stage = Object.values(CRAM_STAGES).includes(card?.stage)
      ? card.stage
      : CRAM_STAGES.NEW
    const rawDueAt = Number(card?.dueAt)
    const dueAt =
      stage === CRAM_STAGES.GRADUATED
        ? null
        : Number.isFinite(rawDueAt)
          ? rawDueAt
          : now

    return { id, stage, dueAt }
  })

  const startedAt = Number.isFinite(Number(state.startedAt))
    ? Number(state.startedAt)
    : now

  return {
    version: 1,
    startedAt,
    updatedAt: Number.isFinite(Number(state.updatedAt)) ? Number(state.updatedAt) : now,
    cards,
  }
}

export const gradeCard = (state, cardId, rating, now = Date.now()) => {
  if (!state || !Array.isArray(state.cards)) return state

  const id = Number(cardId)
  const current = state.cards.find((card) => card.id === id)

  if (!current || current.stage === CRAM_STAGES.GRADUATED) return state

  let nextStage = current.stage
  let dueAt = current.dueAt

  if (rating === CRAM_RATINGS.AGAIN) {
    nextStage = CRAM_STAGES.LEARNING
    dueAt = now + AGAIN_DELAY_MS
  } else if (rating === CRAM_RATINGS.GOOD) {
    if (current.stage === CRAM_STAGES.GOOD) {
      nextStage = CRAM_STAGES.GRADUATED
      dueAt = null
    } else {
      nextStage = CRAM_STAGES.GOOD
      dueAt = now + GOOD_DELAY_MS
    }
  } else {
    return state
  }

  return {
    ...state,
    updatedAt: now,
    cards: state.cards.map((card) =>
      card.id === id ? { ...card, stage: nextStage, dueAt } : card
    ),
  }
}

export const getDueCardIds = (state, now = Date.now(), tieOrder = []) => {
  if (!state || !Array.isArray(state.cards)) return []

  const orderPosition = new Map(
    tieOrder.map((id, index) => [Number(id), index])
  )

  return state.cards
    .filter(
      (card) =>
        card.stage !== CRAM_STAGES.GRADUATED &&
        Number.isFinite(Number(card.dueAt)) &&
        Number(card.dueAt) <= now
    )
    .sort((first, second) => {
      if (first.dueAt !== second.dueAt) return first.dueAt - second.dueAt
      const firstPosition = orderPosition.get(first.id) ?? first.id
      const secondPosition = orderPosition.get(second.id) ?? second.id
      return firstPosition - secondPosition
    })
    .map((card) => card.id)
}

export const getNextDueAt = (state) => {
  if (!state || !Array.isArray(state.cards)) return null

  const dueTimes = state.cards
    .filter(
      (card) =>
        card.stage !== CRAM_STAGES.GRADUATED && Number.isFinite(Number(card.dueAt))
    )
    .map((card) => Number(card.dueAt))

  return dueTimes.length ? Math.min(...dueTimes) : null
}

export const getCramCounts = (state, now = Date.now()) => {
  if (!state || !Array.isArray(state.cards)) {
    return {
      total: 0,
      left: 0,
      pending: 0,
      new: 0,
      learning: 0,
      good: 0,
      graduated: 0,
      due: 0,
    }
  }

  const counts = {
    total: state.cards.length,
    left: 0,
    pending: 0,
    new: 0,
    learning: 0,
    good: 0,
    graduated: 0,
    due: 0,
  }

  for (const card of state.cards) {
    if (card.stage === CRAM_STAGES.NEW) counts.new += 1
    else if (card.stage === CRAM_STAGES.LEARNING) counts.learning += 1
    else if (card.stage === CRAM_STAGES.GOOD) counts.good += 1
    else if (card.stage === CRAM_STAGES.GRADUATED) counts.graduated += 1

    const isDueReview =
      card.stage !== CRAM_STAGES.NEW &&
      card.stage !== CRAM_STAGES.GRADUATED &&
      Number.isFinite(Number(card.dueAt)) &&
      Number(card.dueAt) <= now

    if (isDueReview) counts.due += 1
  }

  counts.left = counts.total - counts.graduated
  counts.pending = counts.left

  return counts
}

export const getCramCardGroups = (state, cards = [], now = Date.now()) => {
  const stageOrder = [
    CRAM_STAGES.NEW,
    CRAM_STAGES.LEARNING,
    CRAM_STAGES.GOOD,
    CRAM_STAGES.GRADUATED,
  ]
  const cardStates = Array.isArray(state?.cards) ? state.cards : []
  const content = Array.isArray(cards) ? cards : []

  return stageOrder.map((stage) => {
    const groupCards = cardStates
      .filter((card) => card.stage === stage)
      .map((card) => ({
        id: card.id,
        stage: card.stage,
        dueAt: card.dueAt,
        question: String(
          content[card.id]?.question ?? `Card ${Number(card.id) + 1}`
        ),
        isDue:
          stage !== CRAM_STAGES.NEW &&
          stage !== CRAM_STAGES.GRADUATED &&
          Number.isFinite(Number(card.dueAt)) &&
          Number(card.dueAt) <= now,
      }))
      .sort((first, second) => {
        if (
          stage === CRAM_STAGES.LEARNING ||
          stage === CRAM_STAGES.GOOD
        ) {
          const dueDifference = Number(first.dueAt) - Number(second.dueAt)
          if (dueDifference) return dueDifference
        }

        return first.id - second.id
      })

    return {
      stage,
      count: groupCards.length,
      cards: groupCards,
    }
  })
}

export const isCramComplete = (state) => {
  const counts = getCramCounts(state)
  return counts.total > 0 && counts.pending === 0
}
