import { describe, expect, it } from 'vitest'
import {
  CARD_BLOBBY_COOLDOWN_MS,
  CARD_BLOBBY_MOODS,
  answerCardBlobby,
  createCardBlobbySession,
  expireCardBlobbySession,
} from './cardBlobbySession.js'

const answer = (session, kind = 'good', cardId = 0, now = 1000) =>
  answerCardBlobby(session, { kind, cardId, now })

describe('card blobby session', () => {
  it('starts neutral with no combo', () => {
    expect(createCardBlobbySession()).toEqual({
      mood: 'content',
      combo: 0,
      lastCardId: null,
      lastAnswerAt: 0,
    })
  })

  it('turns happy on a reveal and increments the combo', () => {
    const result = answer(createCardBlobbySession(), 'flip', 0)

    expect(result.session.mood).toBe(CARD_BLOBBY_MOODS.HAPPY)
    expect(result.session.combo).toBe(1)
    expect(result.session.lastCardId).toBe(0)
    expect(result.action).toBe('love')
    expect(result.message).toBe('')
  })

  it('counts a card once across flip and grade', () => {
    const first = answer(createCardBlobbySession(), 'flip', 0).session
    const second = answer(first, 'good', 0, 1500)

    expect(second.session.combo).toBe(1)
    expect(second.session.mood).toBe(CARD_BLOBBY_MOODS.HAPPY)
  })

  it('escalates to excited after three quick cards', () => {
    let session = createCardBlobbySession()

    session = answer(session, 'flip', 0, 1000).session
    session = answer(session, 'flip', 1, 2000).session
    const third = answer(session, 'flip', 2, 3000)

    expect(third.session.combo).toBe(3)
    expect(third.session.mood).toBe(CARD_BLOBBY_MOODS.EXCITED)
    expect(third.message).toBe('Combo ×3 — on a roll!')
    expect(third.action).toBe('love')
  })

  it('shows a combo hint from two cards', () => {
    const first = answer(createCardBlobbySession(), 'flip', 0, 1000).session
    const second = answer(first, 'flip', 1, 2000)

    expect(second.message).toBe('Combo ×2 — keep going.')
  })

  it('resets the combo on a miss and stays neutral', () => {
    const first = answer(createCardBlobbySession(), 'flip', 0, 1000).session
    const miss = answer(first, 'again', 1, 2000)

    expect(miss.session.combo).toBe(0)
    expect(miss.session.mood).toBe(CARD_BLOBBY_MOODS.NEUTRAL)
    expect(miss.action).toBe('idle')
    expect(miss.message).toBe('No stress — next one is yours.')
  })

  it('drops the combo when the cooldown has passed', () => {
    const first = answer(createCardBlobbySession(), 'flip', 0, 1000).session
    const later = answer(first, 'flip', 1, 1000 + CARD_BLOBBY_COOLDOWN_MS + 1)

    expect(later.session.combo).toBe(1)
    expect(later.session.mood).toBe(CARD_BLOBBY_MOODS.HAPPY)
  })

  it('expires back to neutral', () => {
    const excited = answer(
      answer(answer(createCardBlobbySession(), 'flip', 0).session, 'flip', 1).session,
      'flip',
      2
    ).session

    expect(expireCardBlobbySession(excited)).toEqual({
      mood: 'content',
      combo: 0,
      lastCardId: null,
      lastAnswerAt: 0,
    })
  })
})
