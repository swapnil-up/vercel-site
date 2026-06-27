<script setup>
import { ref, computed, watch } from 'vue'
import { useFamilyTreeStore } from '../../Composables/useFamilyTreeStore.js'

const store = useFamilyTreeStore()
const editingName = ref('')
const editingNotes = ref('')
const linkingType = ref(null)
const linkingQuery = ref('')

const person = computed(() => store.selectedPerson.value)

const parents = computed(() => store.selectedPerson.value ? store.getParents(store.selectedPerson.value.id) : [])
const children = computed(() => store.selectedPerson.value ? store.getChildren(store.selectedPerson.value.id) : [])
const spouses = computed(() => store.selectedPerson.value ? store.getSpouses(store.selectedPerson.value.id) : [])
const siblings = computed(() => {
  if (!person.value) return []
  const myParents = store.getParents(person.value.id)
  const result = []
  const seen = new Set()
  for (const p of myParents) {
    for (const c of store.getChildren(p.id)) {
      if (c.id !== person.value.id && !seen.has(c.id)) {
        seen.add(c.id)
        result.push(c)
      }
    }
  }
  return result
})

watch(() => store.state.selectedId, () => {
  linkingType.value = null
  linkingQuery.value = ''
})

const availableForLinking = computed(() => {
  if (!linkingType.value || !person.value) return []
  const query = linkingQuery.value.toLowerCase().trim()
  const excludeIds = new Set([person.value.id])
  if (linkingType.value === 'spouse') {
    for (const s of spouses.value) excludeIds.add(s.id)
  } else if (linkingType.value === 'parent') {
    for (const p of parents.value) excludeIds.add(p.id)
  } else if (linkingType.value === 'child') {
    for (const c of children.value) excludeIds.add(c.id)
  } else if (linkingType.value === 'sibling') {
    for (const p of parents.value) {
      for (const c of store.getChildren(p.id)) {
        if (c.id !== person.value.id) excludeIds.add(c.id)
      }
    }
  }
  return Object.values(store.state.people)
    .filter(p => !excludeIds.has(p.id))
    .filter(p => !query || p.name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name))
})

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

function openLinkPicker(type) {
  linkingType.value = type
  linkingQuery.value = ''
}

function confirmLink(targetId) {
  if (!person.value || !linkingType.value) return
  if (linkingType.value === 'parent') {
    store.addRelationship(person.value.id, targetId, 'parent')
  } else if (linkingType.value === 'child') {
    store.addRelationship(targetId, person.value.id, 'parent')
  } else if (linkingType.value === 'spouse') {
    store.addRelationship(person.value.id, targetId, 'spouse')
  } else if (linkingType.value === 'sibling') {
    for (const p of parents.value) {
      store.addRelationship(targetId, p.id, 'parent')
    }
  }
  linkingType.value = null
  linkingQuery.value = ''
}

function createAndLink() {
  const name = linkingQuery.value.trim()
  if (!name || !person.value || !linkingType.value) return
  const newId = store.addPerson(name, false)
  confirmLink(newId)
}

function cancelLink() {
  linkingType.value = null
  linkingQuery.value = ''
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
        <h3 class="text-xs font-bold text-warm-muted uppercase tracking-wider mb-2">Siblings</h3>
        <div v-if="siblings.length === 0" class="text-sm text-warm-muted">None listed</div>
        <div v-for="s in siblings" :key="s.id">
          <button @click="selectPerson(s.id)" class="text-sm text-coral hover:underline">{{ s.name }}</button>
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
      <template v-if="!linkingType">
        <button
          @click="openLinkPicker('parent')"
          class="w-full px-4 py-2 bg-warm-surface border border-warm-border rounded-sm hover:bg-cream transition-colors text-sm"
        >
          + Parent
        </button>
        <button
          @click="openLinkPicker('child')"
          class="w-full px-4 py-2 bg-warm-surface border border-warm-border rounded-sm hover:bg-cream transition-colors text-sm"
        >
          + Child
        </button>
        <button
          @click="openLinkPicker('spouse')"
          class="w-full px-4 py-2 bg-warm-surface border border-warm-border rounded-sm hover:bg-cream transition-colors text-sm"
        >
          + Spouse
        </button>
        <button
          @click="openLinkPicker('sibling')"
          class="w-full px-4 py-2 bg-warm-surface border border-warm-border rounded-sm hover:bg-cream transition-colors text-sm"
        >
          + Sibling
        </button>
        <button
          @click="deleteSelected"
          class="w-full px-4 py-2 bg-coral text-white rounded-sm hover:bg-coral/80 transition-colors text-sm"
        >
          Delete Person
        </button>
      </template>
      <template v-else>
        <div class="space-y-1">
          <input
            v-model="linkingQuery"
            placeholder="Search..."
            class="w-full px-2 py-1 border border-warm-border rounded-sm text-sm"
          />
          <div class="max-h-32 overflow-y-auto space-y-0.5">
            <button
              v-for="p in availableForLinking"
              :key="p.id"
              @click="confirmLink(p.id)"
              class="w-full text-left px-2 py-1 text-sm hover:bg-cream rounded-sm transition-colors truncate"
            >
              {{ p.name }}
            </button>
            <div v-if="availableForLinking.length === 0 && !linkingQuery.trim()" class="text-xs text-warm-muted px-2 py-1">
              Type to search or create
            </div>
            <div v-else-if="availableForLinking.length === 0 && linkingQuery.trim()" class="text-xs text-warm-muted px-2 py-1">
              No matches
            </div>
          </div>
          <button
            v-if="linkingQuery.trim()"
            @click="createAndLink"
            class="w-full text-left px-2 py-1 text-sm hover:bg-cream rounded-sm transition-colors"
          >
            + Create "{{ linkingQuery.trim() }}"
          </button>
          <button
            @click="cancelLink"
            class="w-full text-left px-2 py-1 text-sm text-warm-muted hover:bg-cream rounded-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </template>
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-full text-sm text-warm-muted p-4 text-center">
    Select a person to edit
  </div>
</template>
