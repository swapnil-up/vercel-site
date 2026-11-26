export const CARD_BLOBBY_COOLDOWN_MS = 4_000

export const CARD_BLOBBY_MOODS = {
  NEUTRAL: 'content',
  HAPPY: 'happy',
  EXCITED: 'excited',
}

export const createCardBlobbySession = () => ({
  mood: CARD_BLOBBY_MOODS.NEUTRAL,
  combo: 0,
  lastCardId: null,
  lastAnswerAt: 0,
})

export const expireCardBlobbySession = (session) => ({
  ...(session ?? createCardBlobbySession()),
  mood: CARD_BLOBBY_MOODS.NEUTRAL,
  combo: 0,
  lastCardId: null,
  lastAnswerAt: 0,
})

const getComboMessage = (combo) => {
  if (combo === 2) return 'Combo ×2 — keep going.'
  if (combo === 3) return 'Combo ×3 — on a roll!'
  if (combo > 3) return `Combo ×${combo} — unstoppable.`
  return ''
}

/**
 * One answer or reveal. Flip and good grades build the combo; a miss
 * resets it. Counting a single card once keeps flip + grade from
 * double-stamping the same card.
 */
export const answerCardBlobby = (
  session,
  { kind = 'good', cardId = null, now = Date.now(), cooldownMs = CARD_BLOBBY_COOLDOWN_MS } = {}
) => {
  const current = session ?? createCardBlobbySession()
  const isMiss = kind === 'again'
  const withinWindow =
    current.combo > 0 && now - current.lastAnswerAt <= cooldownMs
  const sameCard = cardId !== null && cardId === current.lastCardId

  let combo = withinWindow ? current.combo : 0

  if (isMiss) {
    combo = 0
  } else if (!sameCard) {
    combo += 1
  }

  const mood = isMiss
    ? CARD_BLOBBY_MOODS.NEUTRAL
    : combo >= 3
      ? CARD_BLOBBY_MOODS.EXCITED
      : CARD_BLOBBY_MOODS.HAPPY

  return {
    session: {
      mood,
      combo,
      lastCardId: cardId,
      lastAnswerAt: now,
    },
    action: isMiss ? 'idle' : 'love',
    message: isMiss ? 'No stress — next one is yours.' : getComboMessage(combo),
  }
}
