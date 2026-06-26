import { reactive, computed, watch } from 'vue'

const STORAGE_KEY = 'family-tree'

function generateId() {
  return crypto.randomUUID()
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { people: {}, relationships: [], nodePositions: {} }
}

const saved = loadData()

const state = reactive({
  people: saved.people,
  relationships: saved.relationships,
  selectedId: null,
  searchQuery: '',
  nodePositions: saved.nodePositions,
  importExportMode: null,
})

watch(
  () => ({ people: state.people, relationships: state.relationships, nodePositions: state.nodePositions }),
  (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  },
  { deep: true }
)

function addPerson(name, select = true) {
  const id = generateId()
  state.people[id] = { id, name: name || 'New Person', notes: '' }
  if (select) state.selectedId = id
  return id
}

function updatePerson(id, data) {
  if (!state.people[id]) return
  Object.assign(state.people[id], data)
}

function deletePerson(id) {
  if (!state.people[id]) return
  state.relationships = state.relationships.filter(
    r => r.from !== id && r.to !== id
  )
  delete state.people[id]
  delete state.nodePositions[id]
  if (state.selectedId === id) state.selectedId = null
}

function addRelationship(from, to, type) {
  const exists = state.relationships.some(
    r => r.from === from && r.to === to && r.type === type
  )
  if (exists) return
  state.relationships.push({ from, to, type })
}

function removeRelationship(from, to, type) {
  state.relationships = state.relationships.filter(
    r => !(r.from === from && r.to === to && r.type === type)
  )
}

const allPeople = computed(() => Object.values(state.people))

const selectedPerson = computed(() =>
  state.selectedId ? state.people[state.selectedId] || null : null
)

function getParents(personId) {
  return state.relationships
    .filter(r => r.from === personId && r.type === 'parent')
    .map(r => state.people[r.to])
    .filter(Boolean)
}

function getChildren(personId) {
  return state.relationships
    .filter(r => r.to === personId && r.type === 'parent')
    .map(r => state.people[r.from])
    .filter(Boolean)
}

function getSpouses(personId) {
  const direct = state.relationships
    .filter(r => r.type === 'spouse' && (r.from === personId || r.to === personId))
  const ids = new Set()
  direct.forEach(r => {
    ids.add(r.from === personId ? r.to : r.from)
  })
  return [...ids].map(id => state.people[id]).filter(Boolean)
}

function exportData() {
  const data = {
    version: 1,
    people: state.people,
    relationships: state.relationships,
    nodePositions: state.nodePositions,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'family-tree.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function importData(json) {
  try {
    const data = JSON.parse(json)
    if (!data.people || !data.relationships) {
      throw new Error('Invalid format')
    }
    state.people = data.people
    state.relationships = data.relationships
    state.nodePositions = data.nodePositions || {}
    state.selectedId = null
    state.importExportMode = null
  } catch (e) {
    throw new Error('Failed to import: ' + e.message)
  }
}

export function useFamilyTreeStore() {
  return {
    state,
    allPeople,
    selectedPerson,
    getParents,
    getChildren,
    getSpouses,
    addPerson,
    updatePerson,
    deletePerson,
    addRelationship,
    removeRelationship,
    exportData,
    importData,
    generateId,
  }
}
