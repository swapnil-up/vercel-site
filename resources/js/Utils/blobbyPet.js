export const BLOBBY_STORAGE_KEY = 'site_blobbyPet'
export const BLOBBY_STATE_VERSION = 2

export const BLOBBY_REVIEW_RATINGS = {
  AGAIN: 'again',
  GOOD: 'good',
}

export const BLOBBY_IDLE_THRESHOLDS = {
  CURIOUS: 2,
  BORED: 5,
  DEJECTED: 10,
}

export const BLOBBY_DECAY = {
  HUNGER_PER_MINUTE: 1,
  BOREDOM_PER_MINUTE: 1,
  LOVE_PER_MINUTE: 1,
}

export const BLOBBY_REWARDS = {
  GOOD_BOREDOM: 8,
  GOOD_LOVE: 2,
}

export const DEFAULT_BLOBBY_STATE = Object.freeze({
  version: BLOBBY_STATE_VERSION,
  name: 'Blobby',
  hunger: 80,
  boredom: 20,
  love: 70,
  age: 0,
  lastSeen: 0,
  lastEngagementAt: 0,
  reviewStreak: 0,
  bestReviewStreak: 0,
})

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number(value) || 0))

const finiteNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const normalizeTimestamp = (value, fallback) => {
  const timestamp = finiteNumber(value, fallback)
  return Math.max(0, timestamp)
}

export const createDefaultBlobbyState = (now = Date.now()) => ({
  ...DEFAULT_BLOBBY_STATE,
  lastSeen: now,
  lastEngagementAt: now,
})

export const normalizeBlobbyState = (rawState, now = Date.now()) => {
  if (!rawState || typeof rawState !== 'object') {
    return createDefaultBlobbyState(now)
  }

  const isCurrentVersion = Number(rawState.version) >= BLOBBY_STATE_VERSION
  const hasBoredomValue = rawState.boredom !== undefined && rawState.boredom !== null
  const rawBoredom = clamp(
    rawState.boredom ?? DEFAULT_BLOBBY_STATE.boredom,
    0,
    100
  )
  const lastSeen = normalizeTimestamp(rawState.lastSeen, now)
  const lastEngagementAt = normalizeTimestamp(
    rawState.lastEngagementAt,
    lastSeen || now
  )

  return {
    version: BLOBBY_STATE_VERSION,
    name:
      typeof rawState.name === 'string' && rawState.name.trim()
        ? rawState.name.trim()
        : DEFAULT_BLOBBY_STATE.name,
    hunger: clamp(
      rawState.hunger ?? DEFAULT_BLOBBY_STATE.hunger,
      0,
      100
    ),
    // Version 1 displayed high values as happy even though most mutations
    // treated the field as actual boredom. Invert it once so the visual
    // meaning a visitor already saw is preserved during migration.
    boredom: isCurrentVersion
      ? rawBoredom
      : hasBoredomValue
        ? clamp(100 - rawBoredom, 0, 100)
        : DEFAULT_BLOBBY_STATE.boredom,
    love: clamp(rawState.love ?? DEFAULT_BLOBBY_STATE.love, 0, 100),
    age: Math.max(0, Math.floor(finiteNumber(rawState.age, 0))),
    lastSeen,
    lastEngagementAt,
    reviewStreak: Math.max(
      0,
      Math.floor(finiteNumber(rawState.reviewStreak, 0))
    ),
    bestReviewStreak: Math.max(
      0,
      Math.floor(finiteNumber(rawState.bestReviewStreak, 0))
    ),
  }
}

export const applyBlobbyDecay = (
  state,
  minutes = 1,
  now = Date.now(),
  options = {}
) => {
  const elapsedMinutes = Math.max(0, Math.floor(finiteNumber(minutes, 0)))
  if (!elapsedMinutes) {
    return { ...state, lastSeen: now }
  }

  const hungerPerMinute = finiteNumber(
    options.hungerPerMinute,
    BLOBBY_DECAY.HUNGER_PER_MINUTE
  )

  return {
    ...state,
    hunger: clamp(
      state.hunger - elapsedMinutes * hungerPerMinute,
      0,
      100
    ),
    boredom: clamp(
      state.boredom + elapsedMinutes * BLOBBY_DECAY.BOREDOM_PER_MINUTE,
      0,
      100
    ),
    love: clamp(
      state.love - elapsedMinutes * BLOBBY_DECAY.LOVE_PER_MINUTE,
      0,
      100
    ),
    age: state.age + elapsedMinutes,
    lastSeen: now,
  }
}

export const hydrateBlobbyState = (rawState, now = Date.now()) => {
  const normalized = normalizeBlobbyState(rawState, now)
  const elapsedMinutes = Math.max(
    0,
    Math.floor((now - normalized.lastSeen) / 60_000)
  )

  if (!elapsedMinutes) {
    return { ...normalized, lastSeen: now }
  }

  return applyBlobbyDecay(normalized, elapsedMinutes, now, {
    hungerPerMinute: 2,
  })
}

export const markBlobbyEngagement = (state, now = Date.now()) => ({
  ...state,
  lastEngagementAt: now,
  lastSeen: now,
})

export const applyBlobbyReview = (
  state,
  rating,
  now = Date.now()
) => {
  const engaged = markBlobbyEngagement(state, now)

  if (rating === BLOBBY_REVIEW_RATINGS.GOOD) {
    const reviewStreak = engaged.reviewStreak + 1
    return {
      ...engaged,
      boredom: clamp(engaged.boredom - BLOBBY_REWARDS.GOOD_BOREDOM, 0, 100),
      love: clamp(engaged.love + BLOBBY_REWARDS.GOOD_LOVE, 0, 100),
      reviewStreak,
      bestReviewStreak: Math.max(engaged.bestReviewStreak, reviewStreak),
    }
  }

  if (rating === BLOBBY_REVIEW_RATINGS.AGAIN) {
    return {
      ...engaged,
      reviewStreak: 0,
    }
  }

  return engaged
}

export const applyBlobbyBonus = (
  state,
  { boredom = 0, love = 0 } = {},
  now = Date.now()
) => ({
  ...markBlobbyEngagement(state, now),
  boredom: clamp(state.boredom - boredom, 0, 100),
  love: clamp(state.love + love, 0, 100),
})

export const adjustBlobbyStats = (
  state,
  { hunger = 0, boredom = 0, love = 0 } = {},
  now = Date.now()
) => ({
  ...markBlobbyEngagement(state, now),
  hunger: clamp(state.hunger + hunger, 0, 100),
  boredom: clamp(state.boredom + boredom, 0, 100),
  love: clamp(state.love + love, 0, 100),
})

export const getBlobbyIdleMinutes = (state, now = Date.now()) => {
  const lastEngagementAt = finiteNumber(
    state?.lastEngagementAt,
    finiteNumber(state?.lastSeen, now)
  )
  return Math.max(0, (now - lastEngagementAt) / 60_000)
}

export const getBlobbyMood = (
  state,
  { now = Date.now(), sleeping = false } = {}
) => {
  if (sleeping) return 'sleepy'
  if (state.hunger < 20) return 'sick'
  if (state.hunger < 40) return 'hungry'
  if (state.love < 20) return 'crying'
  if (state.love < 40) return 'lonely'

  const idleMinutes = getBlobbyIdleMinutes(state, now)
  if (idleMinutes >= BLOBBY_IDLE_THRESHOLDS.DEJECTED) return 'dejected'
  if (idleMinutes >= BLOBBY_IDLE_THRESHOLDS.BORED) return 'bored'
  if (idleMinutes >= BLOBBY_IDLE_THRESHOLDS.CURIOUS) return 'curious'

  if (state.boredom >= 75) return 'dejected'
  if (state.boredom >= 45) return 'bored'
  if (state.boredom >= 25) return 'curious'
  if (state.reviewStreak >= 5) return 'excited'
  if (state.love >= 80 && state.boredom <= 20) return 'happy'

  return 'content'
}

export const parseBlobbyState = (rawValue, now = Date.now()) => {
  if (typeof rawValue !== 'string' || !rawValue.trim()) return null

  try {
    const parsed = JSON.parse(rawValue)
    if (!parsed || typeof parsed !== 'object') return null
    return hydrateBlobbyState(parsed, now)
  } catch {
    return null
  }
}

export const serializeBlobbyState = (state, now = Date.now()) =>
  JSON.stringify({
    ...state,
    version: BLOBBY_STATE_VERSION,
    lastSeen: now,
  })
