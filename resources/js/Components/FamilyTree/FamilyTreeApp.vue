<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useFamilyTreeStore } from '../../Composables/useFamilyTreeStore.js'
import PersonList from './PersonList.vue'
import TreeCanvas from './TreeCanvas.vue'
import PersonDetails from './PersonDetails.vue'

const store = useFamilyTreeStore()

function onGlobalKeyDown(e) {
  const inInput = e.target.closest('input,textarea')
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    if (inInput) return
    e.preventDefault()
    store.undo()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    if (inInput) return
    e.preventDefault()
    store.exportData()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    if (inInput) return
    e.preventDefault()
    store.state.importExportMode = 'import'
  }
}

function handleImportFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      store.importData(event.target?.result)
    } catch (err) {
      alert(err.message)
    }
  }
  reader.readAsText(file)
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeyDown)
})
</script>

<template>
  <div class="flex flex-col h-[calc(100dvh-4rem)]">
    <div class="flex items-center justify-between px-4 py-2 border-b border-warm-border bg-warm-surface shrink-0">
      <div class="flex items-center gap-2">
        <h1 class="font-display text-lg font-bold text-ink">Family Tree</h1>
        <div class="relative group">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full border border-warm-border text-warm-muted text-xs cursor-help font-semibold hover:border-coral hover:text-coral transition-colors">?</span>
          <div class="absolute left-0 top-full mt-1 w-56 bg-ink text-cream text-xs rounded-sm shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
            <p class="font-semibold mb-1.5 text-cream/80 uppercase tracking-wider text-[10px]">Keyboard Shortcuts</p>
            <div class="space-y-1">
              <div class="flex justify-between"><span>New person</span><kbd class="font-mono bg-white/10 px-1.5 rounded text-[10px]">N</kbd></div>
              <div class="flex justify-between"><span>Add child</span><kbd class="font-mono bg-white/10 px-1.5 rounded text-[10px]">C</kbd></div>
              <div class="flex justify-between"><span>Add parent</span><kbd class="font-mono bg-white/10 px-1.5 rounded text-[10px]">P</kbd></div>
              <div class="flex justify-between"><span>Delete person</span><kbd class="font-mono bg-white/10 px-1.5 rounded text-[10px]">Delete</kbd></div>
              <div class="flex justify-between"><span>Undo</span><kbd class="font-mono bg-white/10 px-1.5 rounded text-[10px]">^Z</kbd></div>
              <div class="flex justify-between"><span>Export JSON</span><kbd class="font-mono bg-white/10 px-1.5 rounded text-[10px]">^S</kbd></div>
              <div class="flex justify-between"><span>Import JSON</span><kbd class="font-mono bg-white/10 px-1.5 rounded text-[10px]">^O</kbd></div>
            </div>

          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          @click="store.resetLayout()"
          class="px-3 py-1.5 text-xs bg-warm-surface border border-warm-border text-warm-muted rounded-sm hover:bg-cream transition-colors"
          title="Clear manually dragged positions"
        >
          Reset Layout
        </button>
        <button
          @click="store.exportData()"
          class="px-3 py-1.5 text-xs bg-mint text-ink rounded-sm hover:bg-mint/80 transition-colors"
          title="Export JSON (Ctrl+S)"
        >
          Export JSON
        </button>
        <button
          @click="store.state.importExportMode = 'import'"
          class="px-3 py-1.5 text-xs bg-sky text-white rounded-sm hover:bg-sky/80 transition-colors"
          title="Import JSON (Ctrl+O)"
        >
          Import JSON
        </button>
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <aside class="w-56 border-r border-warm-border bg-warm-surface shrink-0 overflow-hidden">
        <PersonList />
      </aside>

      <main class="flex-1 overflow-hidden">
        <TreeCanvas />
      </main>

      <aside class="w-72 border-l border-warm-border bg-warm-surface shrink-0 overflow-hidden">
        <PersonDetails />
      </aside>
    </div>

    <div v-if="store.state.importExportMode === 'import'" class="fixed inset-0 bg-ink/50 flex items-center justify-center z-50">
      <div class="bg-warm-surface p-6 rounded-sm max-w-md w-full mx-4 shadow-2xl">
        <h3 class="font-display text-lg font-bold text-ink mb-4">Import Family Tree</h3>
        <p class="text-sm text-warm-muted mb-4">Select a JSON file previously exported from Family Tree.</p>
        <input
          type="file"
          accept=".json"
          @change="handleImportFile"
          class="w-full mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:bg-coral file:text-white hover:file:bg-coral/80 file:cursor-pointer"
        />
        <div class="flex justify-end">
          <button
            @click="store.state.importExportMode = null"
            class="px-4 py-2 bg-warm-surface border border-warm-border rounded-sm hover:bg-cream"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
