export const SUPPORTED_SEPARATORS = ['|', '\t', ',', ';']

export const SEPARATOR_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: '|', label: 'Pipe ( | )' },
  { value: '\t', label: 'Tab' },
  { value: ',', label: 'Comma ( , )' },
  { value: ';', label: 'Semicolon ( ; )' },
]

const ANKI_SEPARATOR_NAMES = {
  comma: ',',
  pipe: '|',
  semicolon: ';',
  tab: '\t',
}

const ANKI_DIRECTIVE_PATTERN =
  /^#(separator|columns|html|notetype(?:\s+column)?|deck(?:\s+column)?|tags|guid)\s*:\s*(.*)$/i

export const parseAnkiMetadata = (text) => {
  if (typeof text !== 'string') {
    return { metadata: {}, text: '', contentLines: [] }
  }

  const metadata = {}
  const contentLines = []

  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const directive = line.match(ANKI_DIRECTIVE_PATTERN)

    if (!directive) {
      contentLines.push(line)
      continue
    }

    const key = directive[1].toLowerCase().replace(/\s+/g, ' ')
    const value = directive[2].trim()

    if (key === 'separator') {
      const separator = ANKI_SEPARATOR_NAMES[value.toLowerCase()]
      if (separator) metadata.separator = separator
    } else if (key === 'columns') {
      metadata.columns = value
        .split(',')
        .map((column) => column.trim())
        .filter(Boolean)
    }
  }

  return {
    metadata,
    text: contentLines.join('\n'),
    contentLines,
  }
}

export const parseDelimitedRows = (text, separator = '|') => {
  if (
    typeof text !== 'string' ||
    typeof separator !== 'string' ||
    separator.length !== 1
  ) {
    return []
  }

  const source = text.replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let afterClosingQuote = false

  const pushField = () => {
    row.push(field)
    field = ''
    afterClosingQuote = false
  }

  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
          afterClosingQuote = true
        }
      } else {
        field += character
      }
      continue
    }

    if (character === separator) {
      pushField()
    } else if (
      afterClosingQuote &&
      (character === ' ' || (character === '\t' && separator !== '\t'))
    ) {
      continue
    } else if (character === '"' && !field.trim()) {
      field = ''
      inQuotes = true
      afterClosingQuote = false
    } else if (
      separator === '|' &&
      character === '\\' &&
      source[index + 1] === '|'
    ) {
      field += '|'
      index += 1
    } else if (character === '\n') {
      pushRow()
    } else if (character === '\r') {
      if (source[index + 1] === '\n') index += 1
      pushRow()
    } else {
      afterClosingQuote = false
      field += character
    }
  }

  if (field.length > 0 || row.length > 0 || inQuotes) pushRow()

  return rows
}

export const parsePipeFields = (line) =>
  parseDelimitedRows(typeof line === 'string' ? line : '', '|')[0] ?? []

export const getColumnCount = (rows) => {
  if (!Array.isArray(rows)) return 0

  return rows.reduce((maximum, row) => {
    const count = Array.isArray(row) ? row.length : 0
    return Math.max(maximum, count)
  }, 0)
}

const getSeparatorBoundaryStrength = (text, separator) => {
  let occurrences = 0
  let strength = 0

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== separator) continue
    if (separator === '|' && text[index - 1] === '\\') continue

    const before = text[index - 1] ?? ''
    const after = text[index + 1] ?? ''
    const hasSpaceBefore = /\s/.test(before)
    const hasSpaceAfter = /\s/.test(after)

    occurrences += 1
    if (hasSpaceBefore && hasSpaceAfter) strength += 1
    else if (hasSpaceBefore || hasSpaceAfter) strength += 0.45
  }

  return occurrences ? strength / occurrences : 0
}

export const detectSeparator = (text) => {
  if (typeof text !== 'string' || !text.trim()) {
    return { separator: '|', confidence: 0, scores: {} }
  }

  const { text: content } = parseAnkiMetadata(text)
  const scores = {}
  const eligible = []

  for (const separator of SUPPORTED_SEPARATORS) {
    const rows = parseDelimitedRows(content, separator).filter((row) =>
      row.some((field) => field.trim())
    )
    const rowCount = rows.length

    if (!rowCount) {
      scores[separator] = 0
      continue
    }

    const frequencies = new Map()

    for (const row of rows) {
      const count = row.length
      frequencies.set(count, (frequencies.get(count) ?? 0) + 1)
    }

    let modeColumns = 1
    let modeFrequency = 0

    for (const [columns, frequency] of frequencies) {
      if (
        frequency > modeFrequency ||
        (frequency === modeFrequency && columns > modeColumns)
      ) {
        modeColumns = columns
        modeFrequency = frequency
      }
    }

    const consistency = modeFrequency / rowCount
    const coverage = rows.filter((row) => row.length > 1).length / rowCount
    const boundaryStrength = getSeparatorBoundaryStrength(content, separator)
    const isEligible = coverage >= 0.5 && consistency >= 0.5

    if (!isEligible) {
      scores[separator] = 0
      continue
    }

    eligible.push(separator)
    scores[separator] = consistency * (1 + boundaryStrength * 0.2)
  }

  const separator = eligible.reduce((best, candidate) => {
    if (!best) return candidate
    return scores[candidate] > scores[best] ? candidate : best
  }, null)

  if (!separator) {
    return { separator: '|', confidence: 0, scores }
  }

  const bestScore = scores[separator]
  const secondBestScore = Math.max(
    ...eligible
      .filter((candidate) => candidate !== separator)
      .map((candidate) => scores[candidate]),
    0
  )
  const separation = bestScore ? (bestScore - secondBestScore) / bestScore : 0
  const boundaryStrength = getSeparatorBoundaryStrength(content, separator)
  const punctuationPenalty =
    (separator === ',' || separator === ';') && boundaryStrength > 0 && boundaryStrength < 0.7
      ? 0.65
      : 1
  const confidence = Math.max(
    0,
    Math.min(1, separation * (0.55 + separation * 0.45) * punctuationPenalty)
  )

  return { separator, confidence, scores }
}

export const createDefaultMapping = (columnCount) => {
  const count = Math.max(Number(columnCount) || 0, 1)

  return {
    questionColumn: 0,
    answerColumn: count > 1 ? 1 : 0,
    extraColumns:
      count > 2 ? Array.from({ length: count - 2 }, (_, index) => index + 2) : [],
  }
}

export const normalizeColumnMapping = (mapping = {}, columnCount = 0) => {
  const count = Math.max(Number(columnCount) || 0, 1)
  const hasExtraColumns = Array.isArray(mapping.extraColumns)
  const rawQuestion = Number(mapping.questionColumn)
  const rawAnswer = Number(mapping.answerColumn)
  let questionColumn =
    Number.isInteger(rawQuestion) && rawQuestion >= 0 && rawQuestion < count
      ? rawQuestion
      : 0
  let answerColumn =
    Number.isInteger(rawAnswer) && rawAnswer >= 0 && rawAnswer < count
      ? rawAnswer
      : questionColumn === 0 && count > 1
        ? 1
        : 0

  if (answerColumn === questionColumn && count > 1) {
    answerColumn = questionColumn === 0 ? 1 : 0
  }

  const extraColumns = hasExtraColumns
    ? [...new Set(mapping.extraColumns)]
        .map(Number)
        .filter(
          (column) =>
            Number.isInteger(column) &&
            column >= 0 &&
            column < count &&
            column !== questionColumn &&
            column !== answerColumn
        )
        .sort((first, second) => first - second)
    : createDefaultMapping(count).extraColumns

  return { questionColumn, answerColumn, extraColumns }
}

export const isValidColumnMapping = (mapping = {}, columnCount = 0) => {
  const count = Number(columnCount) || 0
  const questionColumn = Number(mapping.questionColumn)
  const answerColumn = Number(mapping.answerColumn)

  return (
    count >= 2 &&
    Number.isInteger(questionColumn) &&
    Number.isInteger(answerColumn) &&
    questionColumn >= 0 &&
    answerColumn >= 0 &&
    questionColumn < count &&
    answerColumn < count &&
    questionColumn !== answerColumn
  )
}

export const normalizeImportConfig = (config = {}, columnCount = 0) => {
  const separator =
    SUPPORTED_SEPARATORS.includes(config.separator) || config.separator === 'auto'
      ? config.separator
      : 'auto'
  const mapping = normalizeColumnMapping(config, columnCount)

  return {
    separator,
    ...mapping,
    skipHeader: Boolean(config.skipHeader),
  }
}

export const createDefaultImportConfig = (text, separator = 'auto') => {
  const { metadata, text: content } = parseAnkiMetadata(text)
  const resolvedSeparator =
    separator === 'auto'
      ? metadata.separator ?? detectSeparator(content).separator
      : separator
  const rows = parseDelimitedRows(content, resolvedSeparator)
  const columnCount = getColumnCount(rows)

  return {
    separator:
      separator === 'auto' && metadata.separator ? metadata.separator : separator,
    ...createDefaultMapping(columnCount),
    skipHeader: false,
  }
}

const removeFirstContentRow = (rows) => {
  const firstContentIndex = rows.findIndex((row) =>
    Array.isArray(row) ? row.some((field) => field.trim()) : false
  )

  if (firstContentIndex === -1) return rows
  return rows.filter((_, index) => index !== firstContentIndex)
}

export const mapRowsToCards = (rows, mapping = {}, options = {}) => {
  if (!Array.isArray(rows) || !isValidColumnMapping(mapping, getColumnCount(rows))) {
    return []
  }

  const cards = []
  const sourceRows = options.skipHeader ? removeFirstContentRow(rows) : rows
  const extraColumns = Array.isArray(mapping.extraColumns)
    ? mapping.extraColumns
    : createDefaultMapping(getColumnCount(rows)).extraColumns
  const extraSeparator = options.extraSeparator ?? '\n'

  for (const row of sourceRows) {
    if (!Array.isArray(row) || !row.some((field) => field.trim())) continue

    const requiredColumn = Math.max(mapping.questionColumn, mapping.answerColumn)
    if (row.length <= requiredColumn) continue

    const question = String(row[mapping.questionColumn] ?? '').trim()
    const answer = String(row[mapping.answerColumn] ?? '').trim()

    if (!question) continue

    const extra = extraColumns
      .map((column) => String(row[column] ?? '').trim())
      .filter(Boolean)
      .join(extraSeparator)

    cards.push({ question, answer, extra })
  }

  return cards
}

export const parseDeckWithConfig = (text, config = {}) => {
  if (typeof text !== 'string') {
    return {
      cards: [],
      rows: [],
      columnCount: 0,
      config: normalizeImportConfig(config),
      resolvedSeparator: '|',
      skippedRows: 0,
      metadata: {},
    }
  }

  const { metadata, text: content } = parseAnkiMetadata(text)
  const requestedSeparator = SUPPORTED_SEPARATORS.includes(config.separator)
    ? config.separator
    : 'auto'
  const separator =
    requestedSeparator === 'auto'
      ? metadata.separator ?? detectSeparator(content).separator
      : requestedSeparator
  const rows = parseDelimitedRows(content, separator)
  const columnCount = getColumnCount(rows)
  const normalizedConfig = normalizeImportConfig(
    { ...config, separator: requestedSeparator },
    columnCount
  )
  const cards = mapRowsToCards(rows, normalizedConfig, {
    skipHeader: normalizedConfig.skipHeader,
    extraSeparator: '\n',
  })
  const sourceRows = normalizedConfig.skipHeader
    ? removeFirstContentRow(rows)
    : rows
  const skippedRows = sourceRows.filter(
    (row) =>
      Array.isArray(row) &&
      row.some((field) => field.trim()) &&
      !String(row[normalizedConfig.questionColumn] ?? '').trim()
  ).length

  return {
    cards,
    rows,
    columnCount,
    config: normalizedConfig,
    resolvedSeparator: separator,
    skippedRows,
    metadata,
  }
}

export const parseCardDeck = (text) => {
  if (typeof text !== 'string') return []

  const { metadata, text: content } = parseAnkiMetadata(text)
  const separator = metadata.separator ?? '|'
  const cards = []

  for (const row of parseDelimitedRows(content, separator)) {
    if (row.length < 2 || !row[0].trim()) continue

    cards.push({
      question: row[0].trim(),
      answer: row[1].trim(),
      extra: row.slice(2).join('|').trim(),
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

export const reconcileOrder = (order, cardCount) => {
  const count = Math.max(Number(cardCount) || 0, 0)
  const seen = new Set()
  const reconciled = []

  for (const index of Array.isArray(order) ? order : []) {
    if (
      Number.isInteger(index) &&
      index >= 0 &&
      index < count &&
      !seen.has(index)
    ) {
      seen.add(index)
      reconciled.push(index)
    }
  }

  for (let index = 0; index < count; index += 1) {
    if (!seen.has(index)) reconciled.push(index)
  }

  return reconciled
}

export const sanitizeSavedCards = (value) => {
  if (!Array.isArray(value)) return null

  const cards = []

  for (const card of value) {
    if (!card || typeof card !== 'object') return null
    if (typeof card.question !== 'string' || typeof card.answer !== 'string') {
      return null
    }

    cards.push({
      question: card.question,
      answer: card.answer,
      extra: typeof card.extra === 'string' ? card.extra : '',
    })
  }

  return cards
}

export const escapeDelimitedField = (value, separator = ',') => {
  const text = value === null || value === undefined ? '' : String(value)

  if (typeof separator !== 'string' || separator.length !== 1) return text

  const needsQuotes =
    text.includes(separator) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r')

  if (!needsQuotes) return text
  return `"${text.replace(/"/g, '""')}"`
}

export const serializeCards = (
  cards,
  { separator = ',', includeHeader = false } = {}
) => {
  if (!Array.isArray(cards)) return ''

  const lines = []

  if (includeHeader) {
    lines.push(
      ['question', 'answer', 'extra']
        .map((field) => escapeDelimitedField(field, separator))
        .join(separator)
    )
  }

  for (const card of cards) {
    if (!card || typeof card !== 'object') continue

    const question = String(card.question ?? '').trim()
    if (!question) continue

    lines.push(
      [question, card.answer ?? '', card.extra ?? '']
        .map((field) => escapeDelimitedField(String(field).trim(), separator))
        .join(separator)
    )
  }

  return lines.length ? `${lines.join('\n')}\n` : ''
}

const EXPORT_EXTENSIONS = {
  ',': '.csv',
  '\t': '.tsv',
}

export const createDeckFilename = (deckName, separator = ',') => {
  const base =
    String(deckName ?? '')
      .replace(/\.[^./\\]+$/, '')
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 80) || 'deck'

  return `${base}${EXPORT_EXTENSIONS[separator] ?? '.txt'}`
}
