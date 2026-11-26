import { describe, expect, it } from 'vitest'
import {
  createDeckFilename,
  createDefaultImportConfig,
  createDefaultMapping,
  createIdentityOrder,
  createShuffledOrder,
  detectSeparator,
  escapeDelimitedField,
  getColumnCount,
  isValidColumnMapping,
  isValidOrder,
  mapRowsToCards,
  normalizeColumnMapping,
  normalizeDeckState,
  parseAnkiMetadata,
  parseCardDeck,
  parseDelimitedRows,
  parseDeckWithConfig,
  parsePipeFields,
  reconcileOrder,
  sanitizeSavedCards,
  serializeCards,
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

describe('parseDelimitedRows', () => {
  it('parses quoted fields without splitting their delimiter', () => {
    expect(
      parseDelimitedRows('"What, exactly?" | "An answer, carefully" | context', '|')
    ).toEqual([
      ['What, exactly?', 'An answer, carefully', ' context'],
    ])
  })

  it('supports doubled quotes inside quoted fields', () => {
    expect(parseDelimitedRows('"Say ""hello""" | answer', '|')).toEqual([
      ['Say "hello"', ' answer'],
    ])
  })

  it('supports tabs, commas, and semicolons', () => {
    expect(parseDelimitedRows('one\ttwo\tthree', '\t')).toEqual([
      ['one', 'two', 'three'],
    ])
    expect(parseDelimitedRows('one,two,three', ',')).toEqual([
      ['one', 'two', 'three'],
    ])
    expect(parseDelimitedRows('one;two;three', ';')).toEqual([
      ['one', 'two', 'three'],
    ])
  })
})

describe('detectSeparator', () => {
  it('detects a consistent pipe delimiter', () => {
    expect(detectSeparator('question | answer\nsecond | answer').separator).toBe('|')
  })

  it('detects tabs and commas', () => {
    expect(detectSeparator('question\tanswer\nsecond\tanswer').separator).toBe('\t')
    expect(detectSeparator('question,answer\nsecond,answer').separator).toBe(',')
  })

  it('falls back to pipe for empty content', () => {
    expect(detectSeparator('').separator).toBe('|')
  })

  it('prefers a visibly structured pipe over punctuation commas', () => {
    const text =
      'What, really, huh? | Yes\nWhy, exactly, friend? | No'

    expect(detectSeparator(text).separator).toBe('|')
    expect(detectSeparator(text).confidence).toBeLessThan(0.5)
  })
})

describe('parseAnkiMetadata', () => {
  it('extracts separator and column directives without creating cards', () => {
    const source =
      '#separator:Comma\n#columns:Front,Back\nHello,World\nGoodbye,World'

    expect(parseAnkiMetadata(source)).toEqual({
      metadata: {
        separator: ',',
        columns: ['Front', 'Back'],
      },
      text: 'Hello,World\nGoodbye,World',
      contentLines: ['Hello,World', 'Goodbye,World'],
    })
  })

  it('honors a declared separator while parsing cards', () => {
    const source = '#separator:Comma\nHello,World'

    expect(
      parseDeckWithConfig(source, {
        separator: 'auto',
        questionColumn: 0,
        answerColumn: 1,
        extraColumns: [],
        skipHeader: false,
      }).cards
    ).toEqual([{ question: 'Hello', answer: 'World', extra: '' }])
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

describe('column mapping', () => {
  it('creates a default mapping for all remaining columns', () => {
    expect(createDefaultMapping(4)).toEqual({
      questionColumn: 0,
      answerColumn: 1,
      extraColumns: [2, 3],
    })
  })

  it('normalizes invalid and duplicate column selections', () => {
    expect(
      normalizeColumnMapping(
        { questionColumn: 8, answerColumn: 1, extraColumns: [1, 2, 2, 9] },
        3
      )
    ).toEqual({
      questionColumn: 0,
      answerColumn: 1,
      extraColumns: [2],
    })
  })

  it('requires distinct question and answer columns', () => {
    expect(isValidColumnMapping({ questionColumn: 0, answerColumn: 0 }, 2)).toBe(
      false
    )
    expect(isValidColumnMapping({ questionColumn: 0, answerColumn: 1 }, 2)).toBe(
      true
    )
  })

  it('maps arbitrary question, answer, and extra columns', () => {
    const rows = [
      ['Deck', 'Question', 'Answer', 'Context'],
      ['Biology', 'What is ATP?', 'Adenosine triphosphate', 'Cellular energy'],
    ]

    expect(
      mapRowsToCards(
        rows,
        {
          questionColumn: 1,
          answerColumn: 2,
          extraColumns: [3],
        },
        { skipHeader: true }
      )
    ).toEqual([
      {
        question: 'What is ATP?',
        answer: 'Adenosine triphosphate',
        extra: 'Cellular energy',
      },
    ])
  })

  it('can skip a header row', () => {
    const config = createDefaultImportConfig('Question\tAnswer\nOne\tTwo', '\t')
    const result = parseDeckWithConfig('Question\tAnswer\nOne\tTwo', {
      ...config,
      skipHeader: true,
    })

    expect(result.cards).toEqual([
      { question: 'One', answer: 'Two', extra: '' },
    ])
  })

  it('skips the first non-empty row when treating the source as a header', () => {
    const result = parseDeckWithConfig('\nQuestion\tAnswer\nOne\tTwo', {
      separator: '\t',
      questionColumn: 0,
      answerColumn: 1,
      extraColumns: [],
      skipHeader: true,
    })

    expect(result.cards).toEqual([
      { question: 'One', answer: 'Two', extra: '' },
    ])
  })

  it('counts the widest parsed row', () => {
    expect(getColumnCount([['a'], ['a', 'b', 'c']])).toBe(3)
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

describe('reconcileOrder', () => {
  it('keeps the surviving sequence and appends new indices', () => {
    expect(reconcileOrder([2, 0, 1], 4)).toEqual([2, 0, 1, 3])
  })

  it('drops invalid and duplicate indices', () => {
    expect(reconcileOrder([0, 0, 7, 2], 3)).toEqual([0, 2, 1])
  })

  it('builds an identity order when nothing is usable', () => {
    expect(reconcileOrder(null, 3)).toEqual([0, 1, 2])
    expect(reconcileOrder([], 0)).toEqual([])
  })
})

describe('sanitizeSavedCards', () => {
  it('coerces saved cards into card objects', () => {
    expect(
      sanitizeSavedCards([{ question: 'Q', answer: 'A', extra: 4 }])
    ).toEqual([{ question: 'Q', answer: 'A', extra: '' }])
  })

  it('rejects cards with non-string question or answer', () => {
    expect(sanitizeSavedCards([{ question: 'Q' }])).toBeNull()
  })

  it('rejects malformed payloads', () => {
    expect(sanitizeSavedCards(undefined)).toBeNull()
    expect(sanitizeSavedCards('cards')).toBeNull()
    expect(sanitizeSavedCards([null])).toBeNull()
  })

  it('accepts an intentionally emptied deck', () => {
    expect(sanitizeSavedCards([])).toEqual([])
  })
})

describe('serializeCards', () => {
  const cards = [
    { question: 'What is a monad?', answer: 'A composable context', extra: '' },
    { question: 'Why, though?', answer: 'Because "reasons"', extra: 'line one\nline two' },
  ]

  it('quotes fields that contain the separator, quotes, or newlines', () => {
    expect(escapeDelimitedField('plain', ',')).toBe('plain')
    expect(escapeDelimitedField('a,b', ',')).toBe('"a,b"')
    expect(escapeDelimitedField('say "hi"', ',')).toBe('"say ""hi"""')
    expect(escapeDelimitedField('one\ntwo', ',')).toBe('"one\ntwo"')
    expect(escapeDelimitedField('a|b', '|')).toBe('"a|b"')
  })

  it('writes comma CSV without a header by default', () => {
    expect(serializeCards([cards[0]])).toBe(
      'What is a monad?,A composable context,\n'
    )
  })

  it('writes a header when asked', () => {
    expect(serializeCards([cards[0]], { includeHeader: true })).toBe(
      'question,answer,extra\nWhat is a monad?,A composable context,\n'
    )
  })

  it('skips cards with a blank question', () => {
    expect(
      serializeCards([{ question: '  ', answer: 'orphan', extra: '' }])
    ).toBe('')
  })

  it('round-trips through the deck parser', () => {
    const text = serializeCards(cards, { includeHeader: true })
    const parsed = parseDeckWithConfig(text, {
      separator: ',',
      questionColumn: 0,
      answerColumn: 1,
      extraColumns: [2],
      skipHeader: true,
    })

    expect(parsed.cards).toEqual(cards)
  })

  it('round-trips pipe output without a header', () => {
    const text = serializeCards(cards, { separator: '|' })
    const parsed = parseDeckWithConfig(text, {
      separator: '|',
      questionColumn: 0,
      answerColumn: 1,
      extraColumns: [2],
      skipHeader: false,
    })

    expect(text).toBe(
      'What is a monad?|A composable context|\nWhy, though?|"Because ""reasons"""|"line one\nline two"\n'
    )
    expect(parsed.cards).toEqual(cards)
  })
})

describe('createDeckFilename', () => {
  it('sanitises the deck name and picks an extension', () => {
    expect(createDeckFilename('My Deck.csv', ',')).toBe('My-Deck.csv')
    expect(createDeckFilename('anki export.txt', '|')).toBe('anki-export.txt')
  })

  it('falls back to a safe default name', () => {
    expect(createDeckFilename('', ',')).toBe('deck.csv')
    expect(createDeckFilename(null, '|')).toBe('deck.txt')
  })
})
