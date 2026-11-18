import { describe, expect, it } from 'vitest'
import {
  BLOBBY_REVIEW_RATINGS,
  BLOBBY_STATE_VERSION,
  adjustBlobbyStats,
  applyBlobbyBonus,
  applyBlobbyDecay,
  applyBlobbyReview,
  createDefaultBlobbyState,
  getBlobbyIdleMinutes,
  getBlobbyMood,
  hydrateBlobbyState,
  markBlobbyEngagement,
  normalizeBlobbyState,
  parseBlobbyState,
  serializeBlobbyState,
} from './blobbyPet.js'

describe('normalizeBlobbyState', () => {
  it('creates a safe default state', () => {
    const state = normalizeBlobbyState(null, 1_000)

    expect(state).toMatchObject({
      version: BLOBBY_STATE_VERSION,
      name: 'Blobby',
      hunger: 80,
      boredom: 20,
      love: 70,
      lastSeen: 1_000,
      lastEngagementAt: 1_000,
    })
  })

  it('preserves current-version values and clamps them', () => {
    const state = normalizeBlobbyState(
      {
        version: BLOBBY_STATE_VERSION,
        hunger: 140,
        boredom: -20,
        love: 500,
        age: 4.8,
      },
      1_000
    )

    expect(state.hunger).toBe(100)
    expect(state.boredom).toBe(0)
    expect(state.love).toBe(100)
    expect(state.age).toBe(4)
  })

  it('migrates legacy boredom from the old displayed meaning', () => {
    const state = normalizeBlobbyState(
      { version: 1, hunger: 60, boredom: 60, love: 60 },
      1_000
    )

    expect(state.boredom).toBe(40)
  })

  it('uses the new default when legacy boredom is missing', () => {
    const state = normalizeBlobbyState(
      { version: 1, hunger: 60, love: 60 },
      1_000
    )

    expect(state.boredom).toBe(20)
  })
})

describe('decay and hydration', () => {
  it('applies bounded decay over elapsed minutes', () => {
    const state = applyBlobbyDecay(
      createDefaultBlobbyState(0),
      20,
      20 * 60_000
    )

    expect(state.hunger).toBe(60)
    expect(state.boredom).toBe(40)
    expect(state.love).toBe(50)
    expect(state.age).toBe(20)
  })

  it('applies offline decay when hydrating saved state', () => {
    const saved = {
      ...createDefaultBlobbyState(0),
      lastSeen: 0,
      lastEngagementAt: 0,
    }
    const hydrated = hydrateBlobbyState(saved, 10 * 60_000)

    expect(hydrated.hunger).toBe(60)
    expect(hydrated.boredom).toBe(30)
    expect(hydrated.love).toBe(60)
    expect(hydrated.age).toBe(10)
  })
})

describe('review results', () => {
  it('applies bounded stat adjustments and records engagement', () => {
    const state = adjustBlobbyStats(
      { ...createDefaultBlobbyState(0), hunger: 95, boredom: 5, love: 98 },
      { hunger: 20, boredom: -10, love: 5 },
      5_000
    )

    expect(state.hunger).toBe(100)
    expect(state.boredom).toBe(0)
    expect(state.love).toBe(100)
    expect(state.lastEngagementAt).toBe(5_000)
    expect(state.lastSeen).toBe(5_000)
  })

  it('rewards a correct answer and advances the streak', () => {
    const state = applyBlobbyReview(
      { ...createDefaultBlobbyState(0), boredom: 40 },
      BLOBBY_REVIEW_RATINGS.GOOD,
      5_000
    )

    expect(state.boredom).toBe(32)
    expect(state.love).toBe(72)
    expect(state.reviewStreak).toBe(1)
    expect(state.bestReviewStreak).toBe(1)
    expect(state.lastEngagementAt).toBe(5_000)
  })

  it('keeps a missed answer neutral apart from streak and engagement', () => {
    const original = {
      ...createDefaultBlobbyState(0),
      boredom: 40,
      love: 70,
      reviewStreak: 3,
      bestReviewStreak: 3,
    }
    const state = applyBlobbyReview(
      original,
      BLOBBY_REVIEW_RATINGS.AGAIN,
      5_000
    )

    expect(state.boredom).toBe(40)
    expect(state.love).toBe(70)
    expect(state.reviewStreak).toBe(0)
    expect(state.bestReviewStreak).toBe(3)
    expect(state.lastEngagementAt).toBe(5_000)
  })

  it('applies a bounded completion bonus', () => {
    const state = applyBlobbyBonus(
      { ...createDefaultBlobbyState(0), boredom: 90, love: 90 },
      { boredom: 12, love: 5 },
      5_000
    )

    expect(state.boredom).toBe(78)
    expect(state.love).toBe(95)
    expect(state.lastEngagementAt).toBe(5_000)
  })
})

describe('mood', () => {
  it('moves from content to curious, bored, and dejected while idle', () => {
    const state = createDefaultBlobbyState(0)

    expect(getBlobbyMood(state, { now: 0 })).toBe('content')
    expect(
      getBlobbyMood(state, { now: 2 * 60_000 })
    ).toBe('curious')
    expect(getBlobbyMood(state, { now: 5 * 60_000 })).toBe('bored')
    expect(getBlobbyMood(state, { now: 10 * 60_000 })).toBe('dejected')
  })

  it('lets engagement reset the idle timer', () => {
    const engaged = markBlobbyEngagement(createDefaultBlobbyState(0), 5_000)

    expect(getBlobbyIdleMinutes(engaged, 5_000)).toBe(0)
    expect(getBlobbyMood(engaged, { now: 5_000 })).toBe('content')
  })

  it('keeps urgent hunger and love needs ahead of idle mood', () => {
    expect(
      getBlobbyMood(
        { ...createDefaultBlobbyState(0), hunger: 10 },
        { now: 20 * 60_000 }
      )
    ).toBe('sick')
    expect(
      getBlobbyMood(
        { ...createDefaultBlobbyState(0), love: 10 },
        { now: 20 * 60_000 }
      )
    ).toBe('crying')
  })
})

describe('serialization', () => {
  it('parses valid saved state', () => {
    const state = createDefaultBlobbyState(1_000)
    const parsed = parseBlobbyState(serializeBlobbyState(state, 1_000), 1_000)

    expect(parsed.name).toBe('Blobby')
    expect(parsed.version).toBe(BLOBBY_STATE_VERSION)
  })

  it('rejects malformed saved state', () => {
    expect(parseBlobbyState('{broken', 1_000)).toBeNull()
    expect(parseBlobbyState('', 1_000)).toBeNull()
  })
})
