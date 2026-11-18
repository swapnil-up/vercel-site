import { describe, expect, it } from 'vitest'
import {
  createIdentityOrder,
  createShuffledOrder,
  isValidOrder,
  normalizeDeckState,
  parseCardDeck,
  parsePipeFields,
} from './cardViewer.js'

describe('parsePipeFields', () => {
  it('splits pipe-delimited fields', () => {
    expect(parsePipeFields('question | answer | extra')).toEqual([
      'question ',
      ' answer ',
      ' extra',
    ])
  })

  it('keeps escaped pipes inside a field', () => {
    expect(parsePipeFields('Rust | ownership \\| borrowing | context')).toEqual([
      'Rust ',
      ' ownership | borrowing ',
      ' context',
    ])
  })
})

describe('parseCardDeck', () => {
  it('parses question, answer, and extra fields', () => {
    expect(
      parseCardDeck('What is a monad? | A composable context | Functional programming')
    ).toEqual([
      {
        question: 'What is a monad?',
        answer: 'A composable context',
        extra: 'Functional programming',
      },
    ])
  })

  it('skips blank and malformed rows', () => {
    expect(
      parseCardDeck('\nvalid | answer\nmissing-answer\n\nsecond | answer')
    ).toEqual([
      { question: 'valid', answer: 'answer', extra: '' },
      { question: 'second', answer: 'answer', extra: '' },
    ])
  })

  it('strips a UTF-8 byte-order mark from the first question', () => {
    expect(parseCardDeck('\uFEFFfirst | answer')).toEqual([
      { question: 'first', answer: 'answer', extra: '' },
    ])
  })

  it('joins additional pipe fields into the extra context', () => {
    expect(parseCardDeck('question | answer | one | two')).toEqual([
      { question: 'question', answer: 'answer', extra: 'one | two' },
    ])
  })

  it('returns an empty deck for non-string input', () => {
    expect(parseCardDeck(null)).toEqual([])
  })
})

describe('deck order', () => {
  it('creates an identity order', () => {
    expect(createIdentityOrder(4)).toEqual([0, 1, 2, 3])
  })

  it('creates a deterministic permutation with a supplied random source', () => {
    expect(createShuffledOrder(4, () => 0)).toEqual([1, 2, 3, 0])
  })

  it('rejects duplicate or out-of-range indices', () => {
    expect(isValidOrder([0, 1, 2], 3)).toBe(true)
    expect(isValidOrder([0, 1, 1], 3)).toBe(false)
    expect(isValidOrder([0, 1, 3], 3)).toBe(false)
  })
})

describe('normalizeDeckState', () => {
  it('restores a valid shuffled position', () => {
    expect(
      normalizeDeckState({ pos: 2, order: [2, 0, 1], shuffled: true }, 3)
    ).toEqual({
      order: [2, 0, 1],
      position: 2,
      shuffled: true,
    })
  })

  it('falls back to a safe identity order for invalid state', () => {
    expect(
      normalizeDeckState({ pos: 99, order: [0, 0, 8], shuffled: true }, 3)
    ).toEqual({
      order: [0, 1, 2],
      position: 2,
      shuffled: false,
    })
  })

  it('clamps a negative saved position', () => {
    expect(normalizeDeckState({ pos: -4 }, 3).position).toBe(0)
  })
})
