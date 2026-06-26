<script setup>
import { computed } from 'vue'
import { useFamilyTreeStore } from '../../Composables/useFamilyTreeStore.js'

const store = useFamilyTreeStore()

const filteredPeople = computed(() => {
  const q = store.state.searchQuery.toLowerCase().trim()
  if (!q) return store.allPeople.value
  return store.allPeople.value.filter(p =>
    p.name.toLowerCase().includes(q)
  )
})

function select(id) {
  store.state.selectedId = id
}

function addPerson() {
  const name = prompt('Enter name:')
  if (name?.trim()) store.addPerson(name.trim())
}

function onSearch(e) {
  store.state.searchQuery = e.target.value
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="p-3 border-b border-warm-border">
      <input
        type="text"
        placeholder="Search people..."
        :value="store.state.searchQuery"
        @input="onSearch"
        class="w-full px-3 py-2 border border-warm-border rounded-sm bg-warm-surface text-ink focus:ring-2 focus:ring-coral focus:border-coral text-sm"
      />
    </div>
    <div class="flex-1 overflow-y-auto">
      <div
        v-for="person in filteredPeople"
        :key="person.id"
        @click="select(person.id)"
        class="px-3 py-2.5 cursor-pointer border-b border-warm-border hover:bg-coral/5 transition-colors text-sm truncate"
        :class="store.state.selectedId === person.id ? 'bg-coral/10 border-l-2 border-l-coral font-semibold' : ''"
      >
        {{ person.name }}
      </div>
      <div v-if="filteredPeople.length === 0" class="p-4 text-sm text-warm-muted text-center">
        No people yet
      </div>
    </div>
    <div class="p-3 border-t border-warm-border">
      <button
        @click="addPerson"
        class="w-full px-4 py-2.5 bg-mint text-ink rounded-sm hover:bg-mint/80 transition-colors text-sm font-medium"
      >
        + Add Person
      </button>
    </div>
  </div>
</template>
