<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import CardBlobby from '@/Components/Blobby/CardBlobby.vue'
import {
  SEPARATOR_OPTIONS,
  createDeckFilename,
  createDefaultImportConfig,
  createDefaultMapping,
  createIdentityOrder,
  createShuffledOrder,
  detectSeparator,
  getColumnCount,
  isValidColumnMapping,
  normalizeColumnMapping,
  normalizeDeckState,
  parseAnkiMetadata,
  parseDelimitedRows,
  parseDeckWithConfig,
  reconcileOrder,
  sanitizeSavedCards,
  serializeCards,
} from '@/Utils/cardViewer.js'
import {
  CRAM_RATINGS,
  CRAM_STAGES,
  createCramState,
  getCramCardGroups,
  getCramCounts,
  getDueCardIds,
  getNextDueAt,
  gradeCard,
  isCramComplete,
  normalizeCramState,
} from '@/Utils/cardCram.js'

const STORAGE_KEY = 'card-viewer:v4'
const LEGACY_STORAGE_KEYS = ['card-viewer:v3', 'card-viewer:v2', 'card-viewer:v1']
const REVIEW_MODES = { BROWSE: 'browse', CRAM: 'cram', EDIT: 'edit' }
const EXPORT_FORMATS = [
  {
    value: ',',
    label: 'Comma CSV',
    hint: '.csv · opens in spreadsheets',
  },
  {
    value: '|',
    label: 'Pipe',
    hint: '.txt · matches this tool and anki-smith',
  },
]
const CRAM_STAGE_LABELS = {
  [CRAM_STAGES.NEW]: 'New',
  [CRAM_STAGES.LEARNING]: 'Learning',
  [CRAM_STAGES.GOOD]: 'Good',
  [CRAM_STAGES.GRADUATED]: 'Graduated',
}

const cards = ref([])
const baseCards = ref([])
const order = ref([])
const position = ref(0)
const isFlipped = ref(false)
const isShuffled = ref(false)
const deckText = ref('')
const deckName = ref('')
const errorMessage = ref('')
const isDragging = ref(false)
const isJumpOpen = ref(false)
const jumpValue = ref('')
const fileInput = ref(null)
const jumpInput = ref(null)
const cardButton = ref(null)
const cardBlobby = ref(null)
const statesButton = ref(null)
const statePanelBody = ref(null)
const editorList = ref(null)

const reviewMode = ref(REVIEW_MODES.BROWSE)
const cramState = ref(null)
const cramCurrentId = ref(null)
const currentTime = ref(Date.now())
const statePanelOpen = ref(false)
const compactStatePanel = ref(false)

const exportOpen = ref(false)
const exportFormat = ref(',')
const exportIncludeHeader = ref(true)
const exportDialog = ref(null)
const exportTrigger = ref(null)
const clipboardMessageExport = ref('')

const importPanelOpen = ref(false)
const sourceDraft = ref('')
const sourceName = ref('Pasted deck')
const clipboardMessage = ref('')
const sourceTextarea = ref(null)
const importDialog = ref(null)
const importTrigger = ref(null)
const storageWarning = ref('')
const defaultImportConfig = {
  separator: 'auto',
  ...createDefaultMapping(2),
  skipHeader: false,
}
const appliedImportConfig = ref({ ...defaultImportConfig })
const importConfig = ref({ ...defaultImportConfig })

const hasDeck = computed(() => cards.value.length > 0)
const isCramMode = computed(() => reviewMode.value === REVIEW_MODES.CRAM)
const isEditMode = computed(() => reviewMode.value === REVIEW_MODES.EDIT)
const hasEdits = computed(() => {
  if (cards.value.length !== baseCards.value.length) return true

  return cards.value.some((card, index) => {
    const base = baseCards.value[index]
    return (
      !base ||
      base.question !== card.question ||
      base.answer !== card.answer ||
      base.extra !== card.extra
    )
  })
})
const invalidCardCount = computed(
  () => cards.value.filter((card) => !String(card.question ?? '').trim()).length
)
const exportableCards = computed(() =>
  cards.value.filter((card) => String(card.question ?? '').trim())
)
const exportSkippedCount = computed(
  () => cards.value.length - exportableCards.value.length
)
const exportText = computed(() =>
  serializeCards(exportableCards.value, {
    separator: exportFormat.value,
    includeHeader: exportIncludeHeader.value,
  })
)
const exportPreview = computed(() =>
  exportText.value.replace(/\n$/, '').split('\n').slice(0, 6).join('\n')
)
const exportFilename = computed(() =>
  createDeckFilename(deckName.value, exportFormat.value)
)
const exportHasContent = computed(() => exportText.value.length > 0)
const currentCramState = computed(() => {
  if (!cramState.value || cramCurrentId.value === null) return null
  return (
    cramState.value.cards.find((card) => card.id === cramCurrentId.value) ?? null
  )
})
const currentCard = computed(() => {
  if (isCramMode.value) {
    return cramCurrentId.value === null ? null : cards.value[cramCurrentId.value] ?? null
  }

  const cardIndex = order.value[position.value]
  return cardIndex === undefined ? null : cards.value[cardIndex]
})
const currentCardId = computed(() => {
  if (isCramMode.value) return cramCurrentId.value

  const cardIndex = order.value[position.value]
  return cardIndex === undefined ? null : cardIndex
})
const cardNumber = computed(() => {
  if (!hasDeck.value) return ''

  if (isCramMode.value) {
    return currentCard.value
      ? `card ${cramCurrentId.value + 1}`
      : `${cramCounts.value.graduated} / ${cards.value.length} done`
  }

  return `${position.value + 1} / ${order.value.length}`
})
const progress = computed(() => {
  if (!hasDeck.value) return 0

  if (isCramMode.value) {
    return cards.value.length
      ? (cramCounts.value.graduated / cards.value.length) * 100
      : 0
  }

  return order.value.length ? ((position.value + 1) / order.value.length) * 100 : 0
})
const canGoPrevious = computed(() => position.value > 0)
const canGoNext = computed(() => position.value < order.value.length - 1)
const accessibleCard = computed(() => {
  if (!currentCard.value) {
    if (isCramMode.value && cramComplete.value) return 'Cram session complete.'
    if (isCramMode.value) return 'Waiting for the next card.'
    return ''
  }

  return isFlipped.value
    ? `Answer: ${currentCard.value.answer}${
        currentCard.value.extra ? ` Context: ${currentCard.value.extra}` : ''
      }`
    : `Question: ${currentCard.value.question}. Activate to reveal the answer.`
})

const preview = computed(() =>
  parseDeckWithConfig(sourceDraft.value, importConfig.value)
)
const previewRows = computed(() => preview.value.rows.slice(0, 6))
const previewColumnCount = computed(() => preview.value.columnCount)
const previewColumnOptions = computed(() =>
  Array.from({ length: previewColumnCount.value }, (_, index) => ({
    value: index,
    label:
      preview.value.metadata.columns?.[index] ??
      `Column ${String.fromCharCode(65 + index)}`,
  }))
)
const previewExtraColumns = computed(() =>
  previewColumnOptions.value.filter(
    (column) =>
      column.value !== importConfig.value.questionColumn &&
      column.value !== importConfig.value.answerColumn
  )
)
const mappingIsValid = computed(() =>
  isValidColumnMapping(importConfig.value, previewColumnCount.value)
)
const resolvedSeparator = computed(() => preview.value.resolvedSeparator)
const separatorDetection = computed(() => detectSeparator(sourceDraft.value))
const separatorName = (separator) =>
  SEPARATOR_OPTIONS.find((option) => option.value === separator)?.label ?? separator
const importConfigSignature = (config) =>
  JSON.stringify({
    separator: config.separator,
    questionColumn: config.questionColumn,
    answerColumn: config.answerColumn,
    extraColumns: [...config.extraColumns].sort((first, second) => first - second),
    skipHeader: config.skipHeader,
  })
const importHasChanges = computed(
  () =>
    sourceDraft.value !== deckText.value ||
    importConfigSignature(importConfig.value) !==
      importConfigSignature(appliedImportConfig.value)
)
const sourceIsNew = computed(() => sourceDraft.value !== deckText.value)
const cramCounts = computed(() =>
  getCramCounts(cramState.value, currentTime.value)
)
const cramStateGroups = computed(() =>
  getCramCardGroups(cramState.value, cards.value, currentTime.value)
)
const cramComplete = computed(() => isCramComplete(cramState.value))
const formatCramDue = (card) => {
  if (card.stage === CRAM_STAGES.GRADUATED) return 'complete'
  if (card.stage === CRAM_STAGES.NEW) return 'first review'
  if (card.isDue) return 'due now'

  const minutes = Math.max(
    1,
    Math.ceil((Number(card.dueAt) - currentTime.value) / 60_000)
  )

  if (minutes < 60) return `in ${minutes}m`

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `in ${hours}h ${remainder}m` : `in ${hours}h`
}
const nextDueAt = computed(() => getNextDueAt(cramState.value))
const countdownText = computed(() => {
  if (nextDueAt.value === null) return '00:00'
  const seconds = Math.max(
    0,
    Math.ceil((nextDueAt.value - currentTime.value) / 1000)
  )
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
})
const goodActionLabel = computed(() =>
  currentCramState.value?.stage === CRAM_STAGES.GOOD ? 'graduate' : '10 min'
)

const persistDeck = () => {
  if (!deckText.value) return false

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 4,
        text: deckText.value,
        name: deckName.value,
        pos: position.value,
        order: order.value,
        shuffled: isShuffled.value,
        mode: reviewMode.value,
        importConfig: appliedImportConfig.value,
        cram: cramState.value,
        cramCurrentId: cramCurrentId.value,
        cards: cards.value,
      })
    )
    storageWarning.value = ''
    return true
  } catch {
    storageWarning.value =
      'This browser could not save the session. It will continue in this tab, but may be lost when the page closes.'
    return false
  }
}

const selectNextDueCard = () => {
  if (!cramState.value) {
    cramCurrentId.value = null
    return
  }

  const dueCardIds = getDueCardIds(
    cramState.value,
    Date.now(),
    order.value
  )
  cramCurrentId.value = dueCardIds.length ? dueCardIds[0] : null
}

const ensureCramCard = () => {
  if (!cramState.value) {
    cramState.value = createCramState(cards.value.length)
  }

  const current = cramState.value.cards.find(
    (card) => card.id === cramCurrentId.value
  )

  if (
    current &&
    current.stage !== CRAM_STAGES.GRADUATED &&
    Number(current.dueAt) <= Date.now()
  ) {
    cramCurrentId.value = current.id
    return
  }

  cramCurrentId.value = null
  selectNextDueCard()
}

const loadDeck = (text, name, savedState = null) => {
  const requestedConfig =
    savedState?.importConfig ?? createDefaultImportConfig(text, '|')
  const parsed = parseDeckWithConfig(text, requestedConfig)

  if (!parsed.cards.length) {
    errorMessage.value =
      'No cards found. Check the separator and column mapping.'
    return false
  }

  const savedCards = sanitizeSavedCards(savedState?.cards)
  const liveCards = savedCards && savedCards.length ? savedCards : parsed.cards
  const restoredState = normalizeDeckState(savedState, liveCards.length)

  baseCards.value = parsed.cards.map((card) => ({ ...card }))
  cards.value = liveCards.map((card) => ({ ...card }))
  deckText.value = text
  deckName.value = name || 'restored deck'
  appliedImportConfig.value = { ...parsed.config }
  importConfig.value = { ...parsed.config }
  order.value = restoredState.order
  position.value = restoredState.position
  isShuffled.value = restoredState.shuffled
  reviewMode.value = Object.values(REVIEW_MODES).includes(savedState?.mode)
    ? savedState.mode
    : REVIEW_MODES.BROWSE
  cramState.value = savedState?.cram
    ? normalizeCramState(savedState.cram, liveCards.length)
    : null
  const savedCurrentId = Number(savedState?.cramCurrentId)
  cramCurrentId.value = Number.isInteger(savedCurrentId) ? savedCurrentId : null
  isFlipped.value = false
  isJumpOpen.value = false
  statePanelOpen.value = false
  errorMessage.value = ''

  if (isCramMode.value) {
    if (!cramState.value) {
      cramState.value = createCramState(liveCards.length)
    }
    ensureCramCard()
  }

  persistDeck()
  return true
}

const restoreDeck = () => {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue

      const saved = JSON.parse(raw)
      if (saved?.text) {
        const loaded = loadDeck(saved.text, saved.name || 'restored deck', saved)
        if (loaded) return
      }
    } catch {
      // Ignore unreadable or legacy-corrupt state and keep the empty state.
    }
  }
}

const rememberImportTrigger = () => {
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement) importTrigger.value = activeElement
}

const openImportPanel = async () => {
  importPanelOpen.value = true
  await nextTick()

  const dialog = importDialog.value
  if (dialog && !dialog.open) dialog.showModal()
  sourceTextarea.value?.focus()
}

const openFilePicker = () => {
  rememberImportTrigger()
  fileInput.value?.click()
}

const stageSource = async (text, name) => {
  if (typeof text !== 'string' || !text.trim()) {
    errorMessage.value = 'There is no card content to load.'
    return
  }

  sourceDraft.value = text
  sourceName.value = name || 'Pasted deck'
  clipboardMessage.value = ''
  importConfig.value = createDefaultImportConfig(text, 'auto')
  const parsed = parseDeckWithConfig(text, importConfig.value)

  errorMessage.value = parsed.cards.length
    ? ''
    : 'No cards found yet. Choose a different separator or column mapping.'

  await openImportPanel()
}

const readFile = async (file) => {
  if (!file) return

  try {
    const text = await file.text()
    await stageSource(text, file.name)
  } catch {
    errorMessage.value = 'That file could not be read.'
  }
}

const onFileChange = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  readFile(file)
}

const onDrop = async (event) => {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]

  if (file) {
    await readFile(file)
    return
  }

  const text = event.dataTransfer?.getData('text/plain')
  if (text) await stageSource(text, 'Pasted deck')
}

const onDragOver = () => {
  isDragging.value = true
}

const onDragLeave = (event) => {
  if (!event.relatedTarget) isDragging.value = false
}

const pasteFromClipboard = async () => {
  rememberImportTrigger()
  clipboardMessage.value = ''

  if (!navigator.clipboard?.readText) {
    sourceDraft.value = ''
    sourceName.value = 'Pasted deck'
    importConfig.value = { ...defaultImportConfig }
    await openImportPanel()
    clipboardMessage.value =
      'Clipboard reading is unavailable here. Paste into the text area instead.'
    return
  }

  try {
    const text = await navigator.clipboard.readText()
    if (!text.trim()) {
      errorMessage.value = 'The clipboard does not contain any card content.'
      return
    }
    await stageSource(text, 'Pasted deck')
  } catch {
    sourceDraft.value = ''
    sourceName.value = 'Pasted deck'
    importConfig.value = { ...defaultImportConfig }
    await openImportPanel()
    clipboardMessage.value =
      'Clipboard access was blocked. Paste into the text area instead.'
  }
}

const openManualPaste = async () => {
  rememberImportTrigger()
  sourceDraft.value = ''
  sourceName.value = 'Pasted deck'
  clipboardMessage.value = ''
  errorMessage.value = ''
  importConfig.value = { ...defaultImportConfig }
  await openImportPanel()
}

const openImportSettings = async () => {
  rememberImportTrigger()
  sourceDraft.value = deckText.value
  sourceName.value = deckName.value
  clipboardMessage.value = ''
  errorMessage.value = ''
  importConfig.value = { ...appliedImportConfig.value }
  await openImportPanel()
}

const closeImportPanel = async () => {
  const trigger = importTrigger.value

  if (importDialog.value?.open) importDialog.value.close()
  importPanelOpen.value = false
  sourceDraft.value = deckText.value
  sourceName.value = deckName.value
  importConfig.value = { ...appliedImportConfig.value }
  clipboardMessage.value = ''
  errorMessage.value = ''
  importTrigger.value = null

  await nextTick()
  trigger?.focus()
}

const updateSourceContent = () => {
  importConfig.value = createDefaultImportConfig(sourceDraft.value, 'auto')
}

const updateImportSeparator = (event) => {
  const separator = event.target.value
  const { metadata, text: content } = parseAnkiMetadata(sourceDraft.value)
  const resolved =
    separator === 'auto'
      ? metadata.separator ?? detectSeparator(content).separator
      : separator
  const rows = parseDelimitedRows(content, resolved)
  const columnCount = getColumnCount(rows)
  const mapping = normalizeColumnMapping(importConfig.value, columnCount)

  importConfig.value = {
    ...importConfig.value,
    separator,
    ...mapping,
  }
}

const updateQuestionColumn = (event) => {
  const questionColumn = Number(event.target.value)
  let answerColumn = importConfig.value.answerColumn

  if (answerColumn === questionColumn) {
    answerColumn = questionColumn === 0 ? 1 : 0
  }

  importConfig.value = {
    ...importConfig.value,
    questionColumn,
    answerColumn,
    extraColumns: importConfig.value.extraColumns.filter(
      (column) => column !== questionColumn && column !== answerColumn
    ),
  }
}

const updateAnswerColumn = (event) => {
  const answerColumn = Number(event.target.value)
  let questionColumn = importConfig.value.questionColumn

  if (questionColumn === answerColumn) {
    questionColumn = answerColumn === 0 ? 1 : 0
  }

  importConfig.value = {
    ...importConfig.value,
    questionColumn,
    answerColumn,
    extraColumns: importConfig.value.extraColumns.filter(
      (column) => column !== questionColumn && column !== answerColumn
    ),
  }
}

const updateExtraColumn = (column, checked) => {
  const columns = checked
    ? [...new Set([...importConfig.value.extraColumns, column])]
    : importConfig.value.extraColumns.filter((value) => value !== column)

  importConfig.value = {
    ...importConfig.value,
    extraColumns: columns.sort((first, second) => first - second),
  }
}

const updateSkipHeader = (event) => {
  importConfig.value = {
    ...importConfig.value,
    skipHeader: event.target.checked,
  }
}

const applyImport = () => {
  const parsed = parseDeckWithConfig(sourceDraft.value, importConfig.value)

  if (!parsed.cards.length) {
    errorMessage.value =
      'No cards found. Choose a separator and two different card columns.'
    return
  }

  if (!importHasChanges.value) {
    closeImportPanel()
    return
  }

  const sourceChanged = sourceDraft.value !== deckText.value
  const nextMode = sourceChanged ? REVIEW_MODES.BROWSE : reviewMode.value
  const nextName = sourceChanged ? sourceName.value : deckName.value
  const loaded = loadDeck(
    sourceDraft.value,
    nextName,
    { importConfig: parsed.config, mode: nextMode }
  )

  if (loaded) closeImportPanel()
}

const syncDeckToCardCount = () => {
  order.value = reconcileOrder(order.value, cards.value.length)
  position.value = Math.min(position.value, Math.max(cards.value.length - 1, 0))
  isFlipped.value = false

  if (cramState.value) {
    cramState.value = createCramState(cards.value.length)
    cramCurrentId.value = null
    if (isCramMode.value) ensureCramCard()
  }
}

const persistCardEdits = () => {
  persistDeck()
}

let editPersistTimer = null

const schedulePersistCardEdits = () => {
  if (editPersistTimer) window.clearTimeout(editPersistTimer)

  editPersistTimer = window.setTimeout(() => {
    editPersistTimer = null
    persistDeck()
  }, 400)
}

const addCard = async () => {
  cards.value.push({ question: '', answer: '', extra: '' })
  syncDeckToCardCount()
  persistDeck()
  await nextTick()

  const fields = editorList.value?.querySelectorAll('.editor-question')
  fields?.[fields.length - 1]?.focus()
}

const removeCard = (index) => {
  if (index < 0 || index >= cards.value.length) return

  cards.value.splice(index, 1)
  order.value = order.value
    .filter((cardIndex) => cardIndex !== index)
    .map((cardIndex) => (cardIndex > index ? cardIndex - 1 : cardIndex))
  syncDeckToCardCount()
  persistDeck()
}

const resetEdits = () => {
  cards.value = baseCards.value.map((card) => ({ ...card }))
  syncDeckToCardCount()
  persistDeck()
}

const rememberExportTrigger = () => {
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement) exportTrigger.value = activeElement
}

const openExport = async () => {
  if (!hasDeck.value) {
    errorMessage.value = 'Load a deck before exporting it.'
    return
  }

  rememberExportTrigger()
  errorMessage.value = ''
  clipboardMessageExport.value = ''
  exportOpen.value = true
  await nextTick()

  const dialog = exportDialog.value
  if (dialog && !dialog.open) dialog.showModal()
  dialog?.querySelector('.export-primary')?.focus()
}

const closeExport = async () => {
  const trigger = exportTrigger.value

  if (exportDialog.value?.open) exportDialog.value.close()
  exportOpen.value = false
  clipboardMessageExport.value = ''
  exportTrigger.value = null

  await nextTick()
  trigger?.focus()
}

const downloadExport = () => {
  if (!exportHasContent.value) {
    errorMessage.value = 'Nothing to export yet. Every card needs a question.'
    return
  }

  const blob = new Blob([exportText.value], {
    type:
      exportFormat.value === ','
        ? 'text/csv;charset=utf-8'
        : 'text/plain;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = exportFilename.value
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  closeExport()
}

const copyExport = async () => {
  if (!exportHasContent.value) {
    errorMessage.value = 'Nothing to export yet. Every card needs a question.'
    return
  }

  clipboardMessageExport.value = ''

  if (!navigator.clipboard?.writeText) {
    clipboardMessageExport.value =
      'Clipboard writing is unavailable here. Use download instead.'
    return
  }

  try {
    await navigator.clipboard.writeText(exportText.value)
    clipboardMessageExport.value = 'Copied the deck to the clipboard.'
  } catch {
    clipboardMessageExport.value =
      'The clipboard was blocked. Use download instead.'
  }
}

const flip = () => {
  if (!hasDeck.value || !currentCard.value) return

  const revealingAnswer = !isFlipped.value
  isFlipped.value = !isFlipped.value
  if (revealingAnswer) {
    cardBlobby.value?.answer('flip', currentCardId.value)
  }
}

const go = (amount) => {
  if (isCramMode.value) return

  const nextPosition = position.value + amount
  if (nextPosition < 0 || nextPosition >= order.value.length) return

  position.value = nextPosition
  isFlipped.value = false
  persistDeck()
}

const toggleShuffle = () => {
  if (!hasDeck.value || isCramMode.value) return

  isShuffled.value = !isShuffled.value
  order.value = isShuffled.value
    ? createShuffledOrder(cards.value.length)
    : createIdentityOrder(cards.value.length)
  position.value = 0
  isFlipped.value = false
  persistDeck()
}

const openJump = async () => {
  if (!hasDeck.value || isCramMode.value) return

  isJumpOpen.value = true
  jumpValue.value = String(position.value + 1)
  await nextTick()
  jumpInput.value?.focus()
  jumpInput.value?.select()
}

const closeJump = () => {
  isJumpOpen.value = false
}

const submitJump = () => {
  const requestedPosition = Number.parseInt(jumpValue.value, 10)

  if (
    Number.isInteger(requestedPosition) &&
    requestedPosition >= 1 &&
    requestedPosition <= order.value.length
  ) {
    position.value = requestedPosition - 1
    isFlipped.value = false
    persistDeck()
  }

  closeJump()
}

const handleJumpKeydown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    submitJump()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeJump()
  }
}

const scrollStatePanel = (key) => {
  const panel = statePanelBody.value
  if (!panel) return

  const pageDistance = Math.max(120, panel.clientHeight * 0.8)

  if (key === 'ArrowDown') panel.scrollTop += 48
  else if (key === 'ArrowUp') panel.scrollTop -= 48
  else if (key === 'PageDown') panel.scrollTop += pageDistance
  else if (key === 'PageUp') panel.scrollTop -= pageDistance
  else if (key === 'Home') panel.scrollTop = 0
  else if (key === 'End') panel.scrollTop = panel.scrollHeight
}

const restoreStatePanelFocus = () => {
  nextTick(() => (cardButton.value ?? statesButton.value)?.focus())
}

const toggleStatePanel = () => {
  if (!hasDeck.value || !isCramMode.value) return

  const shouldRestoreFocus =
    statePanelOpen.value &&
    Boolean(document.activeElement?.closest?.('.state-panel'))

  statePanelOpen.value = !statePanelOpen.value

  if (statePanelOpen.value) {
    nextTick(() => statePanelBody.value?.focus())
  } else if (shouldRestoreFocus) {
    restoreStatePanelFocus()
  }
}

const switchMode = (mode) => {
  if (!hasDeck.value || mode === reviewMode.value) return

  reviewMode.value = mode
  isFlipped.value = false
  isJumpOpen.value = false

  if (mode === REVIEW_MODES.CRAM) {
    if (!cramState.value) cramState.value = createCramState(cards.value.length)
    ensureCramCard()
  } else {
    statePanelOpen.value = false
  }

  persistDeck()
}

const restartCram = () => {
  cramState.value = createCramState(cards.value.length)
  cramCurrentId.value = null
  isFlipped.value = false
  selectNextDueCard()
  persistDeck()
}

const gradeCurrent = (rating) => {
  if (
    !isCramMode.value ||
    !currentCard.value ||
    cramCurrentId.value === null ||
    !isFlipped.value
  ) {
    return
  }

  const now = Date.now()
  const wasComplete = cramComplete.value
  const gradedCardId = cramCurrentId.value

  cramState.value = gradeCard(
    cramState.value,
    cramCurrentId.value,
    rating,
    now
  )
  cramCurrentId.value = null
  isFlipped.value = false
  currentTime.value = now
  cardBlobby.value?.recordReview(rating, gradedCardId)
  selectNextDueCard()
  persistDeck()

  if (!wasComplete && cramComplete.value) {
    cardBlobby.value?.celebrate()
  }
}

const handleKeydown = (event) => {
  if (importPanelOpen.value || exportOpen.value) {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (importPanelOpen.value) closeImportPanel()
      else closeExport()
    }
    return
  }

  if (!hasDeck.value || event.metaKey || event.ctrlKey || event.altKey) return

  // Blobby is an interactive button. Let its own keyboard handler own
  // Enter/Space instead of also flipping or grading the card behind it.
  if (event.target?.closest?.('.card-blobby')) return

  const key = event.key.toLowerCase()
  const targetTag = event.target?.tagName
  const targetIsInStatePanel = Boolean(
    event.target?.closest?.('.state-panel')
  )

  if (isEditMode.value) {
    if (event.key === 'Escape') {
      event.preventDefault()
      switchMode(REVIEW_MODES.BROWSE)
    }
    return
  }

  if (isCramMode.value && key === 'o') {
    event.preventDefault()
    if (!event.repeat) toggleStatePanel()
    return
  }

  if (statePanelOpen.value && event.key === 'Escape') {
    event.preventDefault()
    statePanelOpen.value = false
    if (targetIsInStatePanel) restoreStatePanelFocus()
    return
  }

  if (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) ||
    event.target?.isContentEditable
  ) {
    return
  }

  if (targetIsInStatePanel) {
    if (
      ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(
        event.key
      )
    ) {
      event.preventDefault()
      scrollStatePanel(event.key)
      return
    }

    if (compactStatePanel.value) return
  } else if (statePanelOpen.value && compactStatePanel.value) {
    return
  }

  if (isCramMode.value) {
    if (event.key === ' ') {
      if (['BUTTON', 'A'].includes(targetTag)) return
      event.preventDefault()
      flip()
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      flip()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      gradeCurrent(CRAM_RATINGS.AGAIN)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      gradeCurrent(CRAM_RATINGS.GOOD)
    } else if (event.key === '1') {
      event.preventDefault()
      gradeCurrent(CRAM_RATINGS.AGAIN)
    } else if (event.key === '2') {
      event.preventDefault()
      gradeCurrent(CRAM_RATINGS.GOOD)
    }
    return
  }

  if (event.key === ' ') {
    if (['BUTTON', 'A'].includes(targetTag)) return
    event.preventDefault()
    flip()
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
    flip()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    go(1)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    go(-1)
  } else if (key === 'a') {
    event.preventDefault()
    go(-1)
  } else if (key === 'd') {
    event.preventDefault()
    go(1)
  } else if (key === 's') {
    toggleShuffle()
  } else if (key === 'e') {
    event.preventDefault()
    switchMode(REVIEW_MODES.EDIT)
  } else if (key === 'g') {
    event.preventDefault()
    openJump()
  }
}

let clockTimer = null
let compactStatePanelQuery = null

const updateCompactStatePanel = (event) => {
  compactStatePanel.value = event.matches
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  compactStatePanelQuery = window.matchMedia('(max-width: 760px)')
  compactStatePanel.value = compactStatePanelQuery.matches
  compactStatePanelQuery.addEventListener('change', updateCompactStatePanel)
  restoreDeck()
  clockTimer = window.setInterval(() => {
    currentTime.value = Date.now()

    if (isCramMode.value && !currentCard.value && cramState.value) {
      const previousId = cramCurrentId.value
      selectNextDueCard()
      if (previousId !== cramCurrentId.value) persistDeck()
    }
  }, 1000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  compactStatePanelQuery?.removeEventListener('change', updateCompactStatePanel)
  if (clockTimer) window.clearInterval(clockTimer)
  if (editPersistTimer) window.clearTimeout(editPersistTimer)
})
</script>

<template>
  <div
    class="card-viewer"
    :class="{ 'is-dragging': isDragging }"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="grain" aria-hidden="true"></div>
    <div class="progress" :style="{ width: `${progress}%` }" aria-hidden="true"></div>

    <header>
      <div class="file-summary" :title="deckName">
        <template v-if="hasDeck">
          <span class="file-name">{{ deckName }}</span>
          <span aria-hidden="true">·</span>
          <b>{{ cards.length }} cards</b>
          <span v-if="hasEdits" class="edited-flag">edited</span>
        </template>
        <template v-else>
          <span>no deck loaded</span>
        </template>
      </div>

      <span class="spacer"></span>

      <div v-if="hasDeck" class="mode-switch" role="group" aria-label="Deck mode">
        <button
          type="button"
          :class="{ active: !isCramMode && !isEditMode }"
          :aria-pressed="!isCramMode && !isEditMode"
          @click="switchMode('browse')"
        >
          browse
        </button>
        <button
          type="button"
          :class="{ active: isCramMode }"
          :aria-pressed="isCramMode"
          @click="switchMode('cram')"
        >
          cram
        </button>
        <button
          type="button"
          :class="{ active: isEditMode }"
          :aria-pressed="isEditMode"
          title="Edit the deck (E)"
          @click="switchMode('edit')"
        >
          edit
        </button>
      </div>

      <div v-if="hasDeck && !isCramMode && !isEditMode" class="position-controls">
        <button
          v-if="!isJumpOpen"
          type="button"
          class="counter"
          title="Jump to a card"
          aria-label="Jump to a card"
          @click="openJump"
        >
          <b>{{ position + 1 }}</b> / {{ cards.length }}
        </button>
        <input
          v-else
          ref="jumpInput"
          v-model="jumpValue"
          class="jump"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          aria-label="Card number"
          @keydown="handleJumpKeydown"
          @blur="closeJump"
        />
      </div>

      <div
        v-else-if="hasDeck && isCramMode"
        class="cram-summary"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Cram status"
      >
        <span><b>{{ cramCounts.left }}</b> left</span>
        <span><b>{{ cramCounts.new }}</b> new</span>
        <span><b>{{ cramCounts.due }}</b> due</span>
        <span><b>{{ cramCounts.graduated }}</b> graduated</span>
      </div>

      <button
        v-if="hasDeck && !isCramMode && !isEditMode"
        type="button"
        class="tool-button"
        :class="{ active: isShuffled }"
        :aria-pressed="isShuffled"
        title="Shuffle cards (S)"
        @click="toggleShuffle"
      >
        shuffle
      </button>

      <button
        v-if="hasDeck && isCramMode"
        ref="statesButton"
        type="button"
        class="tool-button states-button"
        :class="{ active: statePanelOpen }"
        :aria-expanded="statePanelOpen"
        aria-controls="cram-state-panel"
        title="Show all card states (O)"
        @click="toggleStatePanel"
      >
        states
        <kbd>O</kbd>
      </button>

      <button
        v-if="hasDeck"
        type="button"
        class="tool-button"
        title="Choose the separator and card columns"
        @click="openImportSettings"
      >
        columns
      </button>

      <button
        v-if="hasDeck"
        type="button"
        class="tool-button"
        title="Export the deck as a CSV"
        @click="openExport"
      >
        export
      </button>

      <button
        type="button"
        class="tool-button"
        title="Paste a deck from the clipboard"
        @click="pasteFromClipboard"
      >
        paste
      </button>

      <button type="button" class="tool-button" title="Load a CSV deck" @click="openFilePicker">
        load csv
      </button>
    </header>

    <div class="workspace">
      <main
        :inert="compactStatePanel && statePanelOpen ? true : undefined"
        :aria-hidden="
          compactStatePanel && statePanelOpen ? 'true' : undefined
        "
      >
      <CardBlobby v-if="!isEditMode" ref="cardBlobby" :compact="statePanelOpen" />

      <section
        v-if="!hasDeck"
        class="empty-state"
        :class="{ dragging: isDragging }"
        aria-labelledby="empty-title"
      >
        <span id="empty-title" class="empty-title">drop a deck <em>here</em></span>
        <span class="empty-subtitle">or bring your own cards</span>

        <div class="empty-actions">
          <button type="button" @click="pasteFromClipboard">
            <span>paste clipboard</span>
            <small>read directly from your clipboard</small>
          </button>
          <button type="button" @click="openManualPaste">
            <span>paste text</span>
            <small>paste into a text area</small>
          </button>
          <button type="button" @click="openFilePicker">
            <span>load csv</span>
            <small>choose a local file</small>
          </button>
        </div>

        <span class="empty-format">question | answer | extra · no header required</span>
      </section>

      <section v-else-if="isEditMode" class="editor" aria-label="Deck editor">
        <header class="editor-toolbar">
          <div class="editor-summary">
            <span class="editor-kicker">edit deck</span>
            <p>
              <b>{{ cards.length }}</b>
              {{ cards.length === 1 ? 'card' : 'cards' }}
              <template v-if="invalidCardCount">
                ·
                <span class="editor-warning">
                  {{ invalidCardCount }} need a question
                </span>
              </template>
              <template v-else-if="hasEdits">· changes saved locally</template>
            </p>
          </div>

          <div class="editor-actions">
            <button type="button" :disabled="!hasEdits" @click="resetEdits">
              reset
            </button>
            <button type="button" @click="addCard">+ add card</button>
            <button type="button" class="primary" @click="openExport">
              export
            </button>
          </div>
        </header>

        <div ref="editorList" class="editor-list">
          <article
            v-for="(card, index) in cards"
            :key="index"
            class="editor-card"
            :class="{ invalid: !card.question.trim() }"
          >
            <div class="editor-card-head">
              <span class="editor-index">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              <span v-if="!card.question.trim()" class="editor-flag">
                needs question
              </span>
              <button
                type="button"
                class="editor-delete"
                :aria-label="`Delete card ${index + 1}`"
                title="Delete card"
                @click="removeCard(index)"
              >
                ×
              </button>
            </div>

            <div class="editor-fields">
              <label class="editor-field">
                <span>question</span>
                <textarea
                  v-model="card.question"
                  class="editor-question"
                  rows="2"
                  spellcheck="false"
                  @input="schedulePersistCardEdits"
                  @blur="persistCardEdits"
                ></textarea>
              </label>

              <label class="editor-field">
                <span>answer</span>
                <textarea
                  v-model="card.answer"
                  rows="2"
                  spellcheck="false"
                  @input="schedulePersistCardEdits"
                  @blur="persistCardEdits"
                ></textarea>
              </label>

              <label class="editor-field editor-field-extra">
                <span>extra / context</span>
                <textarea
                  v-model="card.extra"
                  rows="2"
                  spellcheck="false"
                  @input="schedulePersistCardEdits"
                  @blur="persistCardEdits"
                ></textarea>
              </label>
            </div>
          </article>

          <p v-if="!cards.length" class="editor-empty">
            This deck is empty.
            <button type="button" @click="addCard">add a card</button>.
          </p>
        </div>

        <p class="editor-footnote">
          <kbd>Esc</kbd> back to browse · edits are saved in this browser only
        </p>
      </section>

      <section v-else class="stage" aria-label="Flashcard deck">
        <div v-if="currentCard" class="card-wrap">
          <button
            ref="cardButton"
            type="button"
            class="card"
            :class="{ flipped: isFlipped }"
            :aria-label="accessibleCard"
            :aria-pressed="isFlipped"
            title="Click to flip"
            @click="flip"
          >
            <span class="face front" aria-hidden="true">
              <span class="tag">
                <span>question</span>
                <span class="card-number">{{ cardNumber }}</span>
              </span>
              <span class="question-text">{{ currentCard.question }}</span>
            </span>

            <span class="face back" aria-hidden="true">
              <span class="tag">
                <span>answer</span>
                <span class="card-number">{{ cardNumber }}</span>
              </span>
              <span class="answer-text">{{ currentCard.answer }}</span>
              <span v-if="currentCard.extra" class="context">
                <span class="context-label">context</span>
                <span class="context-text">{{ currentCard.extra }}</span>
              </span>
            </span>
          </button>
        </div>

        <div v-else-if="isCramMode && cramComplete" class="cram-status complete">
          <span class="status-label">session complete</span>
          <h2>Deck cleared</h2>
          <p>Every card graduated. The next good answer would have closed it out.</p>
          <div class="status-actions">
            <button type="button" @click="restartCram">start again</button>
            <button type="button" @click="switchMode('browse')">browse deck</button>
          </div>
        </div>

        <div v-else class="cram-status waiting">
          <span class="status-label">next card unlocks in</span>
          <strong>{{ countdownText }}</strong>
          <p v-if="storageWarning">
            {{ storageWarning }}
          </p>
          <p v-else>The schedule is saved. Come back later or keep this page open.</p>
        </div>

        <div v-if="isCramMode && currentCard" class="ratings" :class="{ ready: isFlipped }">
          <button
            type="button"
            class="rating again"
            :disabled="!isFlipped"
            aria-keyshortcuts="ArrowLeft 1"
            @click="gradeCurrent('again')"
          >
            <span class="rating-main">Again</span>
            <span class="rating-time">in 1 minute</span>
            <kbd>←</kbd>
          </button>
          <button
            type="button"
            class="rating good"
            :disabled="!isFlipped"
            aria-keyshortcuts="ArrowRight 2"
            @click="gradeCurrent('good')"
          >
            <span class="rating-main">Good</span>
            <span class="rating-time">{{ goodActionLabel }}</span>
            <kbd>→</kbd>
          </button>
        </div>

        <nav v-if="!isCramMode" class="navigation" aria-label="Card navigation">
          <button
            type="button"
            :disabled="!canGoPrevious"
            aria-label="Previous card"
            @click="go(-1)"
          >
            ‹
          </button>

          <span class="hint">
            <kbd>space</kbd>/<kbd>↑</kbd><kbd>↓</kbd> flip
            <span class="hint-divider">·</span>
            <kbd>A</kbd>/<kbd>D</kbd> or <kbd>←</kbd>/<kbd>→</kbd> move
            <span class="hint-divider">·</span>
            <kbd>S</kbd> shuffle
            <span class="hint-divider">·</span>
            <kbd>G</kbd> jump
          </span>

          <button
            type="button"
            :disabled="!canGoNext"
            aria-label="Next card"
            @click="go(1)"
          >
            ›
          </button>
        </nav>
      </section>
      </main>

      <aside
        v-if="statePanelOpen && isCramMode"
        id="cram-state-panel"
        class="state-panel"
        aria-labelledby="cram-state-title"
      >
        <header class="state-panel-header">
          <div>
            <span class="state-panel-kicker">cram ledger</span>
            <h2 id="cram-state-title">Card states</h2>
          </div>
          <button
            type="button"
            aria-label="Close card states"
            @click="toggleStatePanel"
          >
            ×
          </button>
        </header>

        <div class="state-panel-summary" aria-label="Card state totals">
          <span>
            <b>{{ cramCounts.new }}</b>
            <small>new</small>
          </span>
          <span>
            <b>{{ cramCounts.learning }}</b>
            <small>learning</small>
          </span>
          <span>
            <b>{{ cramCounts.good }}</b>
            <small>good</small>
          </span>
          <span>
            <b>{{ cramCounts.graduated }}</b>
            <small>graduated</small>
          </span>
        </div>

        <div
          ref="statePanelBody"
          class="state-panel-body"
          role="region"
          aria-label="All cram card states"
          tabindex="0"
        >
          <section
            v-for="group in cramStateGroups"
            v-show="group.count"
            :key="group.stage"
            class="state-group"
          >
            <h3>
              <span>{{ CRAM_STAGE_LABELS[group.stage] }}</span>
              <b>{{ group.count }}</b>
            </h3>

            <ul>
              <li
                v-for="card in group.cards"
                :key="card.id"
                :class="{ current: card.id === cramCurrentId }"
              >
                <span class="state-card-index">
                  {{ String(card.id + 1).padStart(2, '0') }}
                </span>
                <span class="state-card-copy">
                  <span class="state-card-question">{{ card.question }}</span>
                  <span v-if="card.id === cramCurrentId" class="state-current">
                    current
                  </span>
                </span>
                <span class="state-due" :class="{ due: card.isDue }">
                  {{ formatCramDue(card) }}
                </span>
              </li>
            </ul>
          </section>
        </div>

        <footer class="state-panel-footer">
          <span><kbd>O</kbd> toggle</span>
          <span><kbd>Esc</kbd> close</span>
        </footer>
      </aside>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".csv,.tsv,.txt,text/csv,text/plain"
      hidden
      @change="onFileChange"
    />

    <dialog
      v-if="importPanelOpen"
      ref="importDialog"
      class="import-dialog import-panel"
      aria-modal="true"
      aria-labelledby="import-title"
      @cancel.prevent="closeImportPanel"
    >
        <header class="import-header">
          <div>
            <span class="import-kicker">deck setup</span>
            <h2 id="import-title">Choose how to read these cards</h2>
          </div>
          <button type="button" aria-label="Close deck setup" @click="closeImportPanel">×</button>
        </header>

        <div class="import-body">
          <label class="source-field">
            <span>Source content</span>
            <textarea
              ref="sourceTextarea"
              v-model="sourceDraft"
              rows="7"
              spellcheck="false"
              placeholder="Paste question | answer | extra here…"
              @input="updateSourceContent"
            ></textarea>
          </label>

          <p v-if="clipboardMessage" class="import-message" role="status">
            {{ clipboardMessage }}
          </p>

          <div class="import-controls">
            <label>
              <span>Separator</span>
              <select :value="importConfig.separator" @change="updateImportSeparator">
                <option
                  v-for="option in SEPARATOR_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <div class="detected-separator">
              <span>Detected</span>
              <strong>{{ separatorName(resolvedSeparator) }}</strong>
              <small v-if="importConfig.separator === 'auto'">
                <template v-if="separatorDetection.confidence < 0.5">
                  low confidence · check the preview
                </template>
                <template v-else>auto · best match for this file</template>
              </small>
              <small v-else>using your selected separator</small>
            </div>

            <label class="header-toggle">
              <input
                type="checkbox"
                :checked="importConfig.skipHeader"
                @change="updateSkipHeader"
              />
              <span>First row is a header</span>
            </label>
          </div>

          <div class="mapping-grid">
            <label>
              <span>Question column</span>
              <select
                :value="importConfig.questionColumn"
                :disabled="previewColumnCount < 2"
                @change="updateQuestionColumn"
              >
                <option
                  v-for="column in previewColumnOptions"
                  :key="column.value"
                  :value="column.value"
                >
                  {{ column.label }}
                </option>
              </select>
            </label>

            <label>
              <span>Answer column</span>
              <select
                :value="importConfig.answerColumn"
                :disabled="previewColumnCount < 2"
                @change="updateAnswerColumn"
              >
                <option
                  v-for="column in previewColumnOptions"
                  :key="column.value"
                  :value="column.value"
                >
                  {{ column.label }}
                </option>
              </select>
            </label>

            <fieldset>
              <legend>Extra / context columns</legend>
              <div v-if="previewExtraColumns.length" class="extra-options">
                <label v-for="column in previewExtraColumns" :key="column.value">
                  <input
                    type="checkbox"
                    :checked="importConfig.extraColumns.includes(column.value)"
                    @change="updateExtraColumn(column.value, $event.target.checked)"
                  />
                  <span>{{ column.label }}</span>
                </label>
              </div>
              <small v-else>No other columns to use as context.</small>
            </fieldset>
          </div>

          <div class="preview-block">
            <div class="preview-heading">
              <span>Preview</span>
              <b>
                {{ preview.cards.length }}
                {{ preview.cards.length === 1 ? 'card' : 'cards' }} detected
              </b>
            </div>
            <div v-if="previewRows.length" class="preview-scroll">
              <table>
                <thead>
                  <tr>
                    <th v-for="column in previewColumnOptions" :key="column.value">
                      {{ column.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in previewRows" :key="rowIndex">
                    <td v-for="column in previewColumnOptions" :key="column.value">
                      {{ row[column.value] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="preview-empty">Paste or type some content to preview it.</p>
          </div>

          <p v-if="errorMessage" class="import-error" role="alert">{{ errorMessage }}</p>
        </div>

        <footer class="import-footer">
          <p>Changing the source or columns starts a fresh Cram session and discards edits.</p>
          <div>
            <button type="button" class="secondary" @click="closeImportPanel">Cancel</button>
            <button
              type="button"
              class="primary"
              :disabled="!mappingIsValid || !preview.cards.length"
              @click="applyImport"
            >
              {{ importHasChanges ? (sourceIsNew ? 'Load deck' : 'Apply changes') : 'Done' }}
            </button>
          </div>
        </footer>
    </dialog>

    <dialog
      v-if="exportOpen"
      ref="exportDialog"
      class="import-dialog import-panel export-panel"
      aria-modal="true"
      aria-labelledby="export-title"
      @cancel.prevent="closeExport"
    >
      <header class="import-header">
        <div>
          <span class="import-kicker">export deck</span>
          <h2 id="export-title">Take these cards with you</h2>
        </div>
        <button type="button" aria-label="Close export" @click="closeExport">×</button>
      </header>

      <div class="import-body">
        <div class="export-controls">
          <fieldset class="export-formats">
            <legend>Format</legend>
            <label
              v-for="option in EXPORT_FORMATS"
              :key="option.value"
              :class="{ active: exportFormat === option.value }"
            >
              <input
                v-model="exportFormat"
                type="radio"
                name="export-format"
                :value="option.value"
              />
              <span>{{ option.label }}</span>
              <small>{{ option.hint }}</small>
            </label>
          </fieldset>

          <label class="header-toggle export-header-toggle">
            <input v-model="exportIncludeHeader" type="checkbox" />
            <span>Include header row</span>
          </label>
        </div>

        <div class="preview-block">
          <div class="preview-heading">
            <span>Preview</span>
            <b>
              {{ exportableCards.length }}
              {{ exportableCards.length === 1 ? 'card' : 'cards' }}
              <template v-if="exportSkippedCount">
                · {{ exportSkippedCount }} skipped (blank question)
              </template>
            </b>
          </div>
          <pre v-if="exportPreview" class="export-preview">{{ exportPreview }}</pre>
          <p v-else class="preview-empty">
            No cards to export yet. Every card needs a question.
          </p>
        </div>

        <p class="export-note">
          Saves as <b>{{ exportFilename }}</b>
        </p>

        <p v-if="clipboardMessageExport" class="import-message" role="status">
          {{ clipboardMessageExport }}
        </p>

        <p v-if="errorMessage" class="import-error" role="alert">
          {{ errorMessage }}
        </p>
      </div>

      <footer class="import-footer">
        <p>Exports the edited deck, not the original file.</p>
        <div>
          <button type="button" class="secondary" @click="closeExport">Cancel</button>
          <button
            type="button"
            class="secondary"
            :disabled="!exportHasContent"
            @click="copyExport"
          >
            Copy
          </button>
          <button
            type="button"
            class="primary export-primary"
            :disabled="!exportHasContent"
            @click="downloadExport"
          >
            Download
          </button>
        </div>
      </footer>
    </dialog>

    <p
      v-if="errorMessage && !importPanelOpen && !exportOpen"
      class="error-toast"
      role="alert"
    >
      <span>{{ errorMessage }}</span>
      <button type="button" aria-label="Dismiss error" @click="errorMessage = ''">×</button>
    </p>

    <p v-if="storageWarning" class="error-toast storage-toast" role="status">
      <span>{{ storageWarning }}</span>
    </p>

    <span class="sr-only" aria-live="polite">{{ accessibleCard }}</span>
  </div>
</template>

<style scoped>
.card-viewer {
  --desk: #14151a;
  --paper: #f4eee1;
  --paper-shade: #ebe3d3;
  --ink: #232019;
  --ink-soft: #5c564a;
  --faint: #7d776b;
  --accent: #c4442a;
  --amber: #e2a94f;

  position: relative;
  isolation: isolate;
  display: flex;
  height: calc(100svh - 4rem);
  min-height: 560px;
  flex-direction: column;
  overflow: hidden;
  color: #cfc9bd;
  background:
    radial-gradient(1200px 700px at 50% -10%, #23252e 0%, transparent 60%),
    radial-gradient(900px 900px at 50% 120%, #191b22 0%, transparent 55%),
    var(--desk);
  color-scheme: dark;
  font-family: 'DM Sans', ui-sans-serif, sans-serif;
}

.card-viewer,
.card-viewer * {
  box-sizing: border-box;
}

.grain {
  position: fixed;
  z-index: 20;
  inset: -50%;
  pointer-events: none;
  opacity: 0.055;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.progress {
  position: absolute;
  z-index: 4;
  top: 0;
  left: 0;
  height: 2px;
  background: var(--amber);
  box-shadow: 0 0 8px rgb(226 169 79 / 50%);
  transition: width 0.35s ease;
}

header {
  position: relative;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  padding: 18px 26px 0;
  color: var(--faint);
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  user-select: none;
}

.file-summary {
  display: flex;
  min-width: 0;
  max-width: 50%;
  align-items: center;
  gap: 8px;
  color: #b7b0a2;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-summary b {
  color: var(--amber);
  font-weight: 500;
  white-space: nowrap;
}

.edited-flag {
  border: 1px solid rgb(226 169 79 / 45%);
  border-radius: 2px;
  padding: 2px 6px;
  color: var(--amber);
  font-size: 8px;
  letter-spacing: 0.16em;
  white-space: nowrap;
}

.spacer {
  flex: 1;
}

.position-controls {
  display: flex;
  align-items: center;
}

.counter {
  border: 0;
  padding: 0;
  background: none;
  color: #9d968a;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 0.1em;
  cursor: pointer;
}

.counter b {
  color: var(--amber);
  font-size: 17px;
  font-weight: 500;
}

.counter:hover {
  color: #cfc9bd;
}

.counter:focus-visible,
.tool-button:focus-visible,
.navigation button:focus-visible,
.card:focus-visible,
.empty-state:focus-visible,
.editor-actions button:focus-visible,
.editor-delete:focus-visible,
.editor-empty button:focus-visible,
.editor-field textarea:focus-visible,
.error-toast button:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 3px;
}

.jump {
  width: 4.5em;
  border: 1px solid var(--amber);
  border-radius: 2px;
  padding: 3px 4px;
  outline: none;
  background: rgb(226 169 79 / 10%);
  color: var(--amber);
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 0.1em;
  text-align: center;
}

.tool-button {
  border: 1px solid #33353d;
  border-radius: 2px;
  padding: 6px 12px;
  background: none;
  color: #8d8779;
  font-family: inherit;
  font-size: inherit;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.tool-button:hover {
  border-color: #5a5c66;
  color: #cfc9bd;
}

.tool-button.active {
  border-color: var(--amber);
  color: var(--amber);
}

.workspace {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
}

main {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 0;
  flex: 1;
  place-items: center;
  padding: 26px;
}

.empty-state {
  display: flex;
  width: min(620px, 92vw);
  flex-direction: column;
  align-items: center;
  border: 1.5px dashed #3a3c45;
  border-radius: 4px;
  padding: 70px 40px;
  background: rgb(255 255 255 / 1.2%);
  color: var(--faint);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}

.empty-state:hover,
.empty-state.dragging,
.card-viewer.is-dragging .empty-state {
  border-color: var(--amber);
  background: rgb(226 169 79 / 5%);
  transform: translateY(-2px);
}

.empty-title {
  margin-bottom: 16px;
  color: #d8d2c4;
  font-family: 'Bricolage Grotesque', ui-sans-serif, sans-serif;
  font-size: clamp(26px, 4vw, 38px);
  font-weight: 500;
  letter-spacing: 0.01em;
}

.empty-title em {
  color: var(--amber);
  font-style: italic;
}

.empty-subtitle {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.empty-format {
  margin-top: 26px;
  color: #918a7c;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
}

.stage {
  position: relative;
  display: flex;
  width: min(700px, 100%);
  flex-direction: column;
  align-items: center;
}

.stage::before,
.stage::after {
  position: absolute;
  z-index: -1;
  inset: -30px;
  pointer-events: none;
  background:
    linear-gradient(var(--accent), var(--accent)) left 0 top 0 / 16px 1.5px,
    linear-gradient(var(--accent), var(--accent)) left 0 top 0 / 1.5px 16px,
    linear-gradient(var(--accent), var(--accent)) right 0 top 0 / 16px 1.5px,
    linear-gradient(var(--accent), var(--accent)) right 0 top 0 / 1.5px 16px,
    linear-gradient(var(--accent), var(--accent)) left 0 bottom 0 / 16px 1.5px,
    linear-gradient(var(--accent), var(--accent)) left 0 bottom 0 / 1.5px 16px,
    linear-gradient(var(--accent), var(--accent)) right 0 bottom 0 / 16px 1.5px,
    linear-gradient(var(--accent), var(--accent)) right 0 bottom 0 / 1.5px 16px;
  background-repeat: no-repeat;
  opacity: 0.65;
}

.card-wrap {
  width: 100%;
  perspective: 1800px;
}

.card {
  display: grid;
  width: 100%;
  min-height: 300px;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  transform-style: preserve-3d;
  cursor: pointer;
  transition: transform 0.55s cubic-bezier(0.25, 0.9, 0.25, 1.02);
}

.card.flipped {
  transform: rotateY(180deg);
}

.face {
  display: flex;
  grid-area: 1 / 1;
  min-height: 300px;
  max-height: 74vh;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  border-radius: 3px;
  padding: 38px 46px 42px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 50%), rgb(0 0 0 / 3%) 12%, transparent 30%),
    var(--paper);
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 25%),
    0 2px 3px rgb(0 0 0 / 35%),
    0 30px 70px -18px rgb(0 0 0 / 80%),
    0 90px 100px -60px rgb(0 0 0 / 90%);
  color: var(--ink);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.face.back {
  transform: rotateY(180deg);
  background:
    linear-gradient(180deg, rgb(255 255 255 / 40%), rgb(0 0 0 / 3%) 12%, transparent 30%),
    var(--paper-shade);
}

.tag {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--accent);
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.tag::after {
  height: 1.5px;
  flex: 1;
  background: currentColor;
  content: '';
  opacity: 0.5;
}

.card-number {
  color: #a09a8c;
  font-weight: 400;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

.question-text,
.answer-text {
  font-family: 'Bricolage Grotesque', ui-sans-serif, sans-serif;
  font-size: clamp(21px, 2.6vw, 30px);
  font-weight: 430;
  letter-spacing: 0.002em;
  line-height: 1.38;
}

.answer-text {
  font-weight: 470;
}

.context {
  margin-top: auto;
  border-top: 1px dashed #c2b9a5;
  padding-top: 18px;
}

.context-label {
  display: block;
  margin-bottom: 8px;
  color: #a09a8c;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.context-text {
  display: block;
  color: var(--ink-soft);
  font-size: 13px;
  font-style: italic;
  line-height: 1.65;
  white-space: pre-wrap;
}

.navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 26px;
  margin-top: 34px;
  user-select: none;
}

.navigation button {
  width: 52px;
  height: 40px;
  border: 1px solid #34363f;
  border-radius: 2px;
  background: none;
  color: #8d8779;
  font-family: inherit;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.navigation button:hover:not(:disabled) {
  border-color: var(--amber);
  color: var(--amber);
}

.navigation button:disabled {
  cursor: default;
  opacity: 0.25;
}

.hint {
  color: #918a7c;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.hint kbd {
  border: 1px solid #3a3c45;
  border-bottom-width: 2px;
  border-radius: 3px;
  padding: 1px 6px;
  background: rgb(255 255 255 / 3%);
  color: #9d968a;
  font: inherit;
}

.hint-divider {
  margin: 0 5px;
}

.error-toast {
  position: absolute;
  z-index: 30;
  bottom: 18px;
  left: 50%;
  display: flex;
  max-width: min(520px, calc(100vw - 32px));
  align-items: center;
  gap: 16px;
  border: 1px solid var(--accent);
  border-radius: 3px;
  padding: 10px 12px 10px 14px;
  background: #241a19;
  box-shadow: 0 12px 36px rgb(0 0 0 / 45%);
  color: #f2c5ba;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  transform: translateX(-50%);
}

.error-toast button {
  border: 0;
  padding: 0;
  background: none;
  color: #f2c5ba;
  font: inherit;
  font-size: 18px;
  cursor: pointer;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.mode-switch {
  display: flex;
  overflow: hidden;
  border: 1px solid #33353d;
  border-radius: 3px;
}

.mode-switch button {
  border: 0;
  padding: 5px 9px;
  background: none;
  color: #969084;
  font: inherit;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.mode-switch button + button {
  border-left: 1px solid #33353d;
}

.mode-switch button:hover {
  color: #cfc9bd;
}

.mode-switch button.active {
  background: rgb(226 169 79 / 12%);
  color: var(--amber);
}

.cram-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #969084;
  font-size: 10px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  white-space: nowrap;
}

.cram-summary span {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.cram-summary span + span {
  border-left: 1px solid #33353d;
  padding-left: 10px;
}

.cram-summary b {
  color: #d8d2c4;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
}

.cram-summary span:nth-child(3) b {
  color: var(--accent);
}

.cram-summary span:nth-child(4) b {
  color: var(--amber);
}

.states-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.states-button kbd {
  border: 1px solid #41434c;
  border-bottom-width: 2px;
  border-radius: 3px;
  padding: 1px 5px;
  background: rgb(255 255 255 / 3%);
  color: #aaa394;
  font: inherit;
  font-size: 9px;
}

.empty-state {
  cursor: default;
}

.empty-actions {
  display: grid;
  width: min(520px, 100%);
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 30px;
}

.empty-actions button {
  display: flex;
  min-height: 74px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 5px;
  border: 1px solid #3a3c45;
  border-radius: 3px;
  padding: 12px 14px;
  background: rgb(255 255 255 / 1.5%);
  color: #b7b0a2;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s, transform 0.15s;
}

.empty-actions button:hover {
  border-color: var(--amber);
  background: rgb(226 169 79 / 5%);
  color: var(--amber);
  transform: translateY(-1px);
}

.empty-actions button span {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.empty-actions button small {
  color: #918a7c;
  font-size: 10px;
  line-height: 1.35;
}

.ratings {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 28px;
}

.rating {
  position: relative;
  display: grid;
  min-height: 76px;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  align-items: center;
  border: 1px solid #3a3c45;
  border-radius: 3px;
  padding: 13px 16px;
  background: rgb(255 255 255 / 1.5%);
  color: #8d8779;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  text-align: left;
  cursor: not-allowed;
  opacity: 0.42;
  transition: border-color 0.15s, background 0.15s, color 0.15s, opacity 0.15s;
}

.ratings.ready .rating {
  cursor: pointer;
  opacity: 1;
}

.rating:hover:not(:disabled) {
  transform: translateY(-1px);
}

.rating.again:hover:not(:disabled) {
  border-color: var(--accent);
  background: rgb(196 68 42 / 8%);
  color: #e18b75;
}

.rating.good:hover:not(:disabled) {
  border-color: var(--amber);
  background: rgb(226 169 79 / 8%);
  color: var(--amber);
}

.rating-main {
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.rating-time {
  grid-row: 2;
  margin-top: 5px;
  color: #918a7c;
  font-size: 11px;
  letter-spacing: 0.08em;
}

.rating kbd {
  grid-row: 1 / 3;
  grid-column: 2;
  border: 1px solid #41434c;
  border-bottom-width: 2px;
  border-radius: 3px;
  padding: 2px 7px;
  background: rgb(255 255 255 / 3%);
  color: #aaa394;
  font: inherit;
  font-size: 11px;
}

.cram-status {
  position: relative;
  display: flex;
  width: min(620px, 100%);
  min-height: 300px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid #3a3c45;
  border-radius: 4px;
  padding: 44px;
  background: rgb(255 255 255 / 1.2%);
  text-align: center;
}

.cram-status::before,
.cram-status::after {
  position: absolute;
  width: 16px;
  height: 16px;
  content: '';
}

.cram-status::before {
  border-top: 1.5px solid var(--accent);
  border-left: 1.5px solid var(--accent);
}

.cram-status::after {
  border-right: 1.5px solid var(--accent);
  border-bottom: 1.5px solid var(--accent);
}

.status-label {
  margin-bottom: 16px;
  color: var(--amber);
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.cram-status strong {
  color: var(--paper);
  font-family: 'Bricolage Grotesque', ui-sans-serif, sans-serif;
  font-size: clamp(48px, 9vw, 78px);
  font-variant-numeric: tabular-nums;
  font-weight: 450;
  letter-spacing: -0.04em;
  line-height: 1;
}

.cram-status h2 {
  color: var(--paper);
  font-family: 'Bricolage Grotesque', ui-sans-serif, sans-serif;
  font-size: clamp(30px, 5vw, 44px);
  font-weight: 500;
}

.cram-status p {
  max-width: 430px;
  margin-top: 16px;
  color: #969084;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  line-height: 1.7;
}

.status-actions {
  display: flex;
  gap: 10px;
  margin-top: 28px;
}

.status-actions button {
  border: 1px solid #44464f;
  border-radius: 3px;
  padding: 9px 14px;
  background: none;
  color: #aaa394;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
}

.status-actions button:hover {
  border-color: var(--amber);
  color: var(--amber);
}

.state-panel {
  display: flex;
  width: 380px;
  min-height: 0;
  flex: 0 0 380px;
  flex-direction: column;
  border-left: 1px solid #30323a;
  background:
    linear-gradient(180deg, rgb(226 169 79 / 3%), transparent 120px),
    #15161c;
  box-shadow: -24px 0 60px rgb(0 0 0 / 24%);
  color: #cfc9bd;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
}

.state-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #30323a;
  padding: 20px 18px 17px;
}

.state-panel-kicker {
  display: block;
  margin-bottom: 5px;
  color: var(--amber);
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.state-panel-header h2 {
  color: #e2dcd0;
  font-family: 'Bricolage Grotesque', ui-sans-serif, sans-serif;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.02em;
}

.state-panel-header button {
  border: 0;
  padding: 0;
  background: none;
  color: #969084;
  font: inherit;
  font-size: 23px;
  line-height: 1;
  cursor: pointer;
}

.state-panel-header button:hover {
  color: var(--amber);
}

.state-panel-header button:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 3px;
}

.state-panel-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-bottom: 1px solid #30323a;
  background: rgb(255 255 255 / 1.5%);
}

.state-panel-summary span {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  padding: 12px 10px;
  text-align: center;
}

.state-panel-summary span + span {
  border-left: 1px solid #292b32;
}

.state-panel-summary b {
  color: #e2dcd0;
  font-family: 'Bricolage Grotesque', ui-sans-serif, sans-serif;
  font-size: 19px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.state-panel-summary small {
  overflow: hidden;
  color: #969084;
  font-size: 8px;
  letter-spacing: 0.08em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.state-panel-body {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 4px 18px 22px;
  scrollbar-color: #41434c transparent;
  scrollbar-width: thin;
}

.state-panel-body:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: -2px;
}

.state-group {
  padding-top: 20px;
}

.state-group h3 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #30323a;
  padding: 0 0 8px;
  color: #aaa394;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.state-group h3 b {
  color: var(--amber);
  font-size: 10px;
  font-weight: 500;
}

.state-group ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.state-group li {
  display: grid;
  min-width: 0;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: start;
  gap: 9px;
  border-bottom: 1px solid #25272e;
  padding: 11px 0;
}

.state-group li.current {
  margin: 0 -8px;
  border-bottom-color: transparent;
  padding-right: 8px;
  padding-left: 8px;
  background: rgb(226 169 79 / 7%);
  box-shadow: inset 2px 0 var(--amber);
}

.state-card-index {
  padding-top: 2px;
  color: #918a7c;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
}

.state-card-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.state-card-question {
  display: -webkit-box;
  overflow: hidden;
  color: #b7b0a2;
  font-family: 'Bricolage Grotesque', ui-sans-serif, sans-serif;
  font-size: 13px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.state-current {
  width: fit-content;
  border: 1px solid rgb(226 169 79 / 45%);
  border-radius: 2px;
  padding: 2px 5px;
  color: var(--amber);
  font-size: 7px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.state-due {
  padding-top: 2px;
  color: #918a7c;
  font-size: 8px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
}

.state-due.due {
  color: #df9d8b;
}

.state-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #30323a;
  padding: 11px 18px;
  background: #121318;
  color: #918a7c;
  font-size: 8px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.state-panel-footer kbd {
  border: 1px solid #3a3c45;
  border-bottom-width: 2px;
  border-radius: 3px;
  padding: 1px 4px;
  background: rgb(255 255 255 / 3%);
  color: #aaa394;
  font: inherit;
}

.editor {
  display: flex;
  align-self: stretch;
  justify-self: center;
  width: min(860px, 100%);
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid #30323a;
  padding-bottom: 14px;
}

.editor-kicker {
  display: block;
  margin-bottom: 5px;
  color: var(--amber);
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.editor-summary p {
  color: #918a7c;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.editor-summary b {
  color: #d8d2c4;
  font-size: 14px;
  font-weight: 500;
}

.editor-warning {
  color: #df9d8b;
}

.editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.editor-actions button {
  border: 1px solid #393b44;
  border-radius: 3px;
  padding: 8px 12px;
  background: none;
  color: #8d8779;
  font-family: inherit;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.editor-actions button:hover:not(:disabled) {
  border-color: var(--amber);
  color: var(--amber);
}

.editor-actions button.primary {
  border-color: var(--amber);
  background: rgb(226 169 79 / 10%);
  color: var(--amber);
}

.editor-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.editor-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 16px 2px 8px;
  scrollbar-color: #41434c transparent;
  scrollbar-width: thin;
}

.editor-card {
  border: 1px solid #30323a;
  border-radius: 3px;
  padding: 11px 14px 14px;
  background: rgb(255 255 255 / 1.2%);
}

.editor-card.invalid {
  border-color: rgb(196 68 42 / 55%);
  box-shadow: inset 2px 0 var(--accent);
}

.editor-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 9px;
}

.editor-index {
  color: var(--amber);
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.12em;
}

.editor-flag {
  color: #df9d8b;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 8px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.editor-delete {
  margin-left: auto;
  border: 1px solid #393b44;
  border-radius: 2px;
  padding: 0 7px;
  background: none;
  color: #918a7c;
  font-family: inherit;
  font-size: 15px;
  line-height: 20px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.editor-delete:hover {
  border-color: var(--accent);
  color: #e18b75;
}

.editor-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.editor-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  color: #918a7c;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.editor-field-extra {
  grid-column: 1 / -1;
}

.editor-field textarea {
  width: 100%;
  min-height: 58px;
  resize: vertical;
  border: 1px solid #33353d;
  border-radius: 3px;
  outline: none;
  padding: 9px 11px;
  background: #101116;
  color: #d8d2c4;
  font-family: 'DM Sans', ui-sans-serif, sans-serif;
  font-size: 13px;
  letter-spacing: normal;
  line-height: 1.5;
  text-transform: none;
}

.editor-field textarea:focus {
  border-color: var(--amber);
  box-shadow: 0 0 0 2px rgb(226 169 79 / 10%);
}

.editor-empty {
  border: 1px dashed #393b44;
  border-radius: 3px;
  padding: 34px;
  color: #918a7c;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  text-align: center;
}

.editor-empty button {
  border: 0;
  padding: 0;
  background: none;
  color: var(--amber);
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
}

.editor-footnote {
  padding-top: 12px;
  color: #918a7c;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.editor-footnote kbd {
  border: 1px solid #3a3c45;
  border-bottom-width: 2px;
  border-radius: 3px;
  padding: 1px 5px;
  background: rgb(255 255 255 / 3%);
  color: #aaa394;
  font: inherit;
}

.export-panel {
  width: min(760px, calc(100vw - 48px));
}

.export-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px 24px;
}

.export-formats {
  display: flex;
  min-width: min(420px, 100%);
  flex: 1;
  flex-direction: column;
  gap: 9px;
  border: 0;
  padding: 0;
}

.export-formats legend {
  margin-bottom: 3px;
  color: #8d8779;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.export-formats label {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 2px 10px;
  border: 1px solid #30323a;
  border-radius: 3px;
  padding: 9px 12px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.export-formats label:hover {
  border-color: #5a5c66;
}

.export-formats label.active {
  border-color: var(--amber);
  background: rgb(226 169 79 / 6%);
}

.export-formats input {
  grid-row: 1 / 3;
  width: 14px;
  height: 14px;
  accent-color: var(--amber);
}

.export-formats span {
  color: #d8d2c4;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.export-formats small {
  color: #918a7c;
  font-size: 9px;
  letter-spacing: normal;
  text-transform: none;
}

.export-header-toggle {
  align-self: center;
}

.export-preview {
  max-height: 210px;
  overflow: auto;
  border: 1px solid #30323a;
  border-radius: 3px;
  padding: 12px 14px;
  background: #101116;
  color: #b7b0a2;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 11px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.export-note {
  margin-top: 12px;
  color: #918a7c;
  font-size: 9px;
  letter-spacing: 0.08em;
}

.export-note b {
  color: #b7b0a2;
  font-weight: 500;
}

.import-dialog {
  position: fixed;
  max-width: none;
  max-height: none;
  margin: auto;
  padding: 0;
}

.import-dialog::backdrop {
  background: rgb(7 8 11 / 78%);
  backdrop-filter: blur(8px);
}

.import-panel {
  width: min(940px, calc(100vw - 48px));
  max-height: calc(100svh - 48px);
  overflow: hidden;
  border: 1px solid #393b44;
  border-radius: 5px;
  padding: 0;
  background: #17181e;
  box-shadow: 0 30px 100px rgb(0 0 0 / 65%);
  color: #cfc9bd;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
}

.import-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid #30323a;
  padding: 22px 26px 19px;
}

.import-kicker {
  display: block;
  margin-bottom: 6px;
  color: var(--amber);
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.import-header h2 {
  color: #e2dcd0;
  font-family: 'Bricolage Grotesque', ui-sans-serif, sans-serif;
  font-size: 24px;
  font-weight: 500;
}

.import-header > button {
  border: 0;
  padding: 0;
  background: none;
  color: #969084;
  font: inherit;
  font-size: 24px;
  cursor: pointer;
}

.import-header > button:hover {
  color: var(--amber);
}

.import-body {
  max-height: calc(100svh - 220px);
  overflow-y: auto;
  padding: 22px 26px 26px;
}

.source-field,
.import-controls label,
.mapping-grid label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #8d8779;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.source-field textarea,
.import-panel select {
  width: 100%;
  border: 1px solid #393b44;
  border-radius: 3px;
  outline: none;
  background: #101116;
  color: #d8d2c4;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  letter-spacing: normal;
  text-transform: none;
}

.source-field textarea {
  min-height: 128px;
  resize: vertical;
  padding: 12px 14px;
  line-height: 1.6;
}

.source-field textarea:focus,
.import-panel select:focus {
  border-color: var(--amber);
  box-shadow: 0 0 0 2px rgb(226 169 79 / 10%);
}

.import-message,
.import-error {
  margin-top: 10px;
  border-left: 2px solid var(--amber);
  padding: 8px 12px;
  background: rgb(226 169 79 / 6%);
  color: #cbb894;
  font-size: 10px;
  line-height: 1.6;
}

.import-error {
  border-color: var(--accent);
  background: rgb(196 68 42 / 7%);
  color: #df9d8b;
}

.import-controls {
  display: grid;
  grid-template-columns: minmax(170px, 0.8fr) minmax(190px, 1fr) auto;
  align-items: end;
  gap: 16px;
  margin-top: 20px;
}

.import-panel select {
  height: 38px;
  padding: 0 10px;
}

.detected-separator {
  display: flex;
  min-height: 38px;
  flex-direction: column;
  justify-content: center;
  border: 1px solid #30323a;
  border-radius: 3px;
  padding: 6px 11px;
}

.detected-separator span {
  color: #918a7c;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.detected-separator strong {
  margin-top: 2px;
  color: #b7b0a2;
  font-size: 11px;
  font-weight: 500;
}

.detected-separator small {
  margin-top: 1px;
  color: #918a7c;
  font-size: 9px;
}

.header-toggle {
  display: flex !important;
  min-height: 38px;
  flex-direction: row !important;
  align-items: center;
  gap: 8px !important;
  white-space: nowrap;
}

.header-toggle input,
.extra-options input {
  width: 14px;
  height: 14px;
  accent-color: var(--amber);
}

.mapping-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.3fr;
  gap: 16px;
  margin-top: 20px;
}

.mapping-grid fieldset {
  min-width: 0;
  border: 0;
  padding: 0;
}

.mapping-grid legend {
  margin-bottom: 8px;
  color: #8d8779;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.extra-options {
  display: flex;
  min-height: 38px;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  border: 1px solid #30323a;
  border-radius: 3px;
  padding: 7px 10px;
}

.extra-options label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  color: #aaa394;
  font-size: 9px;
  letter-spacing: normal;
  text-transform: none;
}

.mapping-grid fieldset > small {
  display: block;
  min-height: 38px;
  border: 1px solid #30323a;
  border-radius: 3px;
  padding: 11px;
  color: #918a7c;
  font-size: 9px;
}

.preview-block {
  margin-top: 22px;
}

.preview-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #8d8779;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.preview-heading b {
  color: var(--amber);
  font-weight: 500;
}

.preview-scroll {
  overflow-x: auto;
  border: 1px solid #30323a;
  border-radius: 3px;
}

.preview-block table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  line-height: 1.5;
  text-align: left;
}

.preview-block th,
.preview-block td {
  max-width: 260px;
  overflow: hidden;
  border-right: 1px solid #292b32;
  border-bottom: 1px solid #292b32;
  padding: 8px 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-block th {
  background: #1d1e24;
  color: #969084;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.preview-block td {
  color: #aaa394;
}

.preview-block tr:last-child td {
  border-bottom: 0;
}

.preview-block th:last-child,
.preview-block td:last-child {
  border-right: 0;
}

.preview-empty {
  border: 1px dashed #393b44;
  border-radius: 3px;
  padding: 22px;
  color: #918a7c;
  font-size: 10px;
  text-align: center;
}

.import-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-top: 1px solid #30323a;
  padding: 16px 26px;
  background: #14151a;
}

.import-footer p {
  color: #918a7c;
  font-size: 9px;
  line-height: 1.5;
}

.import-footer > div {
  display: flex;
  gap: 9px;
}

.import-footer button {
  border-radius: 3px;
  padding: 9px 14px;
  font: inherit;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
}

.import-footer .secondary {
  border: 1px solid #393b44;
  background: none;
  color: #8d8779;
}

.import-footer .primary {
  border: 1px solid var(--amber);
  background: rgb(226 169 79 / 10%);
  color: var(--amber);
}

.import-footer button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.mode-switch button:focus-visible,
.empty-actions button:focus-visible,
.rating:focus-visible,
.status-actions button:focus-visible,
.import-panel button:focus-visible,
.import-panel select:focus-visible,
.import-panel textarea:focus-visible,
.import-panel input:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 2px;
}

.error-toast {
  z-index: 80;
}

.error-toast.storage-toast {
  bottom: 74px;
  border-color: var(--amber);
  background: #262117;
  color: #e4cfaa;
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .progress,
  .empty-state {
    transition: none;
  }
}

@media (max-width: 1050px) {
  .state-panel {
    width: 330px;
    flex-basis: 330px;
  }
}

@media (max-width: 760px) {
  .state-panel {
    position: absolute;
    z-index: 25;
    inset: 0;
    width: 100%;
    flex-basis: 100%;
    border-left: 0;
    box-shadow: 0 -20px 60px rgb(0 0 0 / 40%);
  }
}

@media (max-width: 640px) {
  .card-viewer {
    min-height: 520px;
  }

  header {
    flex-wrap: wrap;
    gap: 10px 14px;
    padding: 14px 16px 0;
  }

  .file-summary {
    max-width: 100%;
  }

  .spacer {
    display: none;
  }

  .position-controls {
    margin-left: auto;
  }

  main {
    padding: 18px 16px;
  }

  .empty-state {
    padding: 48px 22px;
  }

  .face {
    min-height: 270px;
    padding: 28px 24px 32px;
  }

  .card-wrap {
    width: min(700px, 92vw);
  }

  .navigation {
    margin-top: 28px;
  }

  .hint {
    display: none;
  }

  .empty-actions {
    grid-template-columns: 1fr;
  }

  .empty-actions button {
    min-height: 58px;
  }

  .ratings {
    width: min(700px, 92vw);
    gap: 8px;
  }

  .rating {
    min-height: 68px;
    padding: 11px 12px;
  }

  .rating-time {
    font-size: 9px;
  }

  .cram-summary {
    width: 100%;
    justify-content: space-between;
    gap: 6px;
  }

  .cram-summary span + span {
    padding-left: 6px;
  }

  .import-panel {
    width: calc(100vw - 20px);
    max-height: calc(100svh - 20px);
  }

  .import-header,
  .import-body,
  .import-footer {
    padding-right: 16px;
    padding-left: 16px;
  }

  .import-body {
    max-height: calc(100svh - 190px);
  }

  .import-controls,
  .mapping-grid {
    grid-template-columns: 1fr;
  }

  .import-controls {
    align-items: stretch;
  }

  .import-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .import-footer > div {
    justify-content: flex-end;
  }

  .preview-block th,
  .preview-block td {
    max-width: 180px;
  }

  .editor-fields {
    grid-template-columns: 1fr;
  }

  .editor-field-extra {
    grid-column: auto;
  }

  .editor-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .export-panel {
    width: calc(100vw - 20px);
  }

  .export-formats {
    min-width: 100%;
  }
}
</style>
