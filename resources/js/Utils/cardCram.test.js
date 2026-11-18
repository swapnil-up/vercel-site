import { describe, expect, it } from 'vitest'
import {
  AGAIN_DELAY_MS,
  CRAM_RATINGS,
  CRAM_STAGES,
  GOOD_DELAY_MS,
  createCramState,
  getCramCardGroups,
  getCramCounts,
  getDueCardIds,
  getNextDueAt,
  gradeCard,
  isCramComplete,
  normalizeCramState,
} from './cardCram.js'

describe('createCramState', () => {
  it('creates every card as immediately due', () => {
    const state = createCramState(2, 1_000)

    expect(state.cards).toEqual([
      { id: 0, stage: CRAM_STAGES.NEW, dueAt: 1_000 },
      { id: 1, stage: CRAM_STAGES.NEW, dueAt: 1_000 },
    ])
  })
})

describe('gradeCard', () => {
  it('schedules an Again card for one minute later', () => {
    const state = createCramState(1, 0)
    const graded = gradeCard(state, 0, CRAM_RATINGS.AGAIN, 5_000)

    expect(graded.cards[0]).toEqual({
      id: 0,
      stage: CRAM_STAGES.LEARNING,
      dueAt: 5_000 + AGAIN_DELAY_MS,
    })
  })

  it('schedules a Good card for ten minutes later', () => {
    const state = createCramState(1, 0)
    const graded = gradeCard(state, 0, CRAM_RATINGS.GOOD, 5_000)

    expect(graded.cards[0]).toEqual({
      id: 0,
      stage: CRAM_STAGES.GOOD,
      dueAt: 5_000 + GOOD_DELAY_MS,
    })
  })

  it('graduates a card after its second Good', () => {
    const state = createCramState(1, 0)
    const firstGood = gradeCard(state, 0, CRAM_RATINGS.GOOD, 5_000)
    const secondGood = gradeCard(firstGood, 0, CRAM_RATINGS.GOOD, 10_000)

    expect(secondGood.cards[0]).toEqual({
      id: 0,
      stage: CRAM_STAGES.GRADUATED,
      dueAt: null,
    })
  })

  it('resets a Good card to the one-minute learning step after Again', () => {
    const state = createCramState(1, 0)
    const firstGood = gradeCard(state, 0, CRAM_RATINGS.GOOD, 5_000)
    const repeated = gradeCard(firstGood, 0, CRAM_RATINGS.AGAIN, 10_000)

    expect(repeated.cards[0].stage).toBe(CRAM_STAGES.LEARNING)
    expect(repeated.cards[0].dueAt).toBe(10_000 + AGAIN_DELAY_MS)
  })
})

describe('due queue', () => {
  it('returns only due cards in due-time order', () => {
    const state = createCramState(3, 0)
    state.cards[0].dueAt = 100
    state.cards[1].dueAt = 50
    state.cards[2].dueAt = 200

    expect(getDueCardIds(state, 150)).toEqual([1, 0])
  })

  it('uses deck order to break equal due-time ties', () => {
    const state = createCramState(3, 0)

    expect(getDueCardIds(state, 100, [2, 0, 1])).toEqual([2, 0, 1])
  })

  it('reports the next pending due time', () => {
    const state = createCramState(2, 0)
    state.cards[0].dueAt = 500
    state.cards[1].dueAt = 900

    expect(getNextDueAt(state)).toBe(500)
  })
})

describe('normalization and completion', () => {
  it('replaces a state whose card count no longer matches', () => {
    const normalized = normalizeCramState(createCramState(2, 0), 3, 1_000)

    expect(normalized.cards).toHaveLength(3)
    expect(normalized.cards.every((card) => card.dueAt === 1_000)).toBe(true)
  })

  it('counts every scheduler state and due review', () => {
    const state = createCramState(4, 0)
    state.cards[0].stage = CRAM_STAGES.NEW
    state.cards[1].stage = CRAM_STAGES.LEARNING
    state.cards[1].dueAt = 50
    state.cards[2].stage = CRAM_STAGES.GOOD
    state.cards[2].dueAt = 500
    state.cards[3].stage = CRAM_STAGES.GRADUATED
    state.cards[3].dueAt = null

    expect(getCramCounts(state, 100)).toEqual({
      total: 4,
      left: 3,
      pending: 3,
      new: 1,
      learning: 1,
      good: 1,
      graduated: 1,
      due: 1,
    })
  })

  it('counts graduated and pending cards', () => {
    const state = createCramState(2, 0)
    const graduated = gradeCard(state, 0, CRAM_RATINGS.GOOD, 0)
    const finished = gradeCard(graduated, 0, CRAM_RATINGS.GOOD, 1)

    expect(getCramCounts(finished)).toEqual({
      total: 2,
      left: 1,
      pending: 1,
      new: 1,
      learning: 0,
      good: 0,
      graduated: 1,
      due: 0,
    })
    expect(isCramComplete(finished)).toBe(false)
  })
})

describe('card state groups', () => {
  it('groups every card by scheduler state and identifies due reviews', () => {
    const state = createCramState(3, 0)
    state.cards[0].stage = CRAM_STAGES.NEW
    state.cards[1].stage = CRAM_STAGES.LEARNING
    state.cards[1].dueAt = 50
    state.cards[2].stage = CRAM_STAGES.GOOD
    state.cards[2].dueAt = 500

    const groups = getCramCardGroups(
      state,
      [
        { question: 'First question' },
        { question: 'Second question' },
        { question: 'Third question' },
      ],
      100
    )

    expect(groups.map((group) => [group.stage, group.count])).toEqual([
      [CRAM_STAGES.NEW, 1],
      [CRAM_STAGES.LEARNING, 1],
      [CRAM_STAGES.GOOD, 1],
      [CRAM_STAGES.GRADUATED, 0],
    ])
    expect(groups[1].cards[0]).toEqual({
      id: 1,
      stage: CRAM_STAGES.LEARNING,
      dueAt: 50,
      question: 'Second question',
      isDue: true,
    })
    expect(groups[2].cards[0].isDue).toBe(false)
  })
})
