import { describe, expect, it } from 'vitest'
import {
  createDefaultImportConfig,
  createDefaultMapping,
  createIdentityOrder,
  createShuffledOrder,
  detectSeparator,
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
