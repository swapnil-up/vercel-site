<script setup>
import { ref, computed } from 'vue'
import { useFamilyTreeStore } from '../../Composables/useFamilyTreeStore.js'

const store = useFamilyTreeStore()
const editingName = ref('')
const editingNotes = ref('')

const person = computed(() => store.selectedPerson.value)

const parents = computed(() => store.selectedPerson.value ? store.getParents(store.selectedPerson.value.id) : [])
const children = computed(() => store.selectedPerson.value ? store.getChildren(store.selectedPerson.value.id) : [])
const spouses = computed(() => store.selectedPerson.value ? store.getSpouses(store.selectedPerson.value.id) : [])

function startEdit(person) {
  if (!person) return
  editingName.value = person.name || ''
  editingNotes.value = person.notes || ''
}

function saveName(personId) {
  if (editingName.value.trim()) {
    store.updatePerson(personId, { name: editingName.value.trim() })
  }
}

function saveNotes(personId) {
  store.updatePerson(personId, { notes: editingNotes.value })
}

function addParent() {
  const name = prompt('Enter parent name:')
  if (!name?.trim()) return
  const selectedId = store.state.selectedId
  const id = store.addPerson(name.trim())
  store.addRelationship(selectedId, id, 'parent')
}

function addChild() {
  const name = prompt('Enter child name:')
  if (!name?.trim()) return
  const selectedId = store.state.selectedId
  const id = store.addPerson(name.trim())
  store.addRelationship(id, selectedId, 'parent')
}

function addSpouse() {
  const name = prompt('Enter spouse name:')
  if (!name?.trim()) return
  const selectedId = store.state.selectedId
  const id = store.addPerson(name.trim())
  store.addRelationship(selectedId, id, 'spouse')
}

function deleteSelected() {
  if (!person.value) return
  if (confirm(`Delete "${person.value.name}"? This cannot be undone.`)) {
    store.deletePerson(person.value.id)
  }
}

function selectPerson(id) {
  store.state.selectedId = id
}
</script>

<template>
  <div class="flex flex-col h-full" v-if="person">
    <div class="p-4 border-b border-warm-border">
      <div class="mb-3">
        <label class="block text-xs font-medium text-warm-muted mb-1">Name</label>
        <input
          v-model="editingName"
          @focus="startEdit(person)"
          @blur="saveName(person.id)"
          class="w-full px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral text-base font-semibold"
        />
      </div>
      <div class="mb-3">
        <label class="block text-xs font-medium text-warm-muted mb-1">Notes</label>
        <textarea
          v-model="editingNotes"
          @focus="startEdit(person)"
          @blur="saveNotes(person.id)"
          rows="3"
          placeholder="Add notes..."
          class="w-full px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral text-sm resize-none"
        ></textarea>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <h3 class="text-xs font-bold text-warm-muted uppercase tracking-wider mb-2">Parents</h3>
        <div v-if="parents.length === 0" class="text-sm text-warm-muted">None listed</div>
        <div v-for="p in parents" :key="p.id">
          <button @click="selectPerson(p.id)" class="text-sm text-coral hover:underline">{{ p.name }}</button>
        </div>
      </div>

      <div>
        <h3 class="text-xs font-bold text-warm-muted uppercase tracking-wider mb-2">Children</h3>
        <div v-if="children.length === 0" class="text-sm text-warm-muted">None listed</div>
        <div v-for="c in children" :key="c.id">
          <button @click="selectPerson(c.id)" class="text-sm text-coral hover:underline">{{ c.name }}</button>
        </div>
      </div>

      <div>
        <h3 class="text-xs font-bold text-warm-muted uppercase tracking-wider mb-2">Spouses</h3>
        <div v-if="spouses.length === 0" class="text-sm text-warm-muted">None listed</div>
        <div v-for="s in spouses" :key="s.id">
          <button @click="selectPerson(s.id)" class="text-sm text-coral hover:underline">{{ s.name }}</button>
        </div>
      </div>
    </div>

    <div class="p-4 border-t border-warm-border space-y-2">
      <button
        @click="addParent"
        class="w-full px-4 py-2 bg-warm-surface border border-warm-border rounded-sm hover:bg-cream transition-colors text-sm"
      >
        + Parent
      </button>
      <button
        @click="addChild"
        class="w-full px-4 py-2 bg-warm-surface border border-warm-border rounded-sm hover:bg-cream transition-colors text-sm"
      >
        + Child
      </button>
      <button
        @click="addSpouse"
        class="w-full px-4 py-2 bg-warm-surface border border-warm-border rounded-sm hover:bg-cream transition-colors text-sm"
      >
        + Spouse
      </button>
      <button
        @click="deleteSelected"
        class="w-full px-4 py-2 bg-coral text-white rounded-sm hover:bg-coral/80 transition-colors text-sm"
      >
        Delete Person
      </button>
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-full text-sm text-warm-muted p-4 text-center">
    Select a person to edit
  </div>
</template>
