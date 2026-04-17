<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

const STORAGE_KEY = 'bill-splitter-data'

const people = ref([''])
const items = ref([])
const importExportMode = ref(null)

let itemIdCounter = 0

const newItemId = () => ++itemIdCounter

const validPeople = computed(() => people.value.filter(p => p.trim() !== ''))

const totalAmount = computed(() => {
  return items.value.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0)
})

const balances = computed(() => {
  const balanceArray = new Array(validPeople.value.length).fill(0)

  items.value.forEach(item => {
    const cost = parseFloat(item.cost) || 0
    const paidBy = item.paidBy
    const sharedByCount = item.sharedBy.filter(Boolean).length

    if (cost > 0 && sharedByCount > 0) {
      const costPerPerson = cost / sharedByCount

      if (paidBy < balanceArray.length) {
        balanceArray[paidBy] += cost
      }

      item.sharedBy.forEach((shared, index) => {
        if (shared && index < balanceArray.length) {
          balanceArray[index] -= costPerPerson
        }
      })
    }
  })

  return balanceArray
})

const settlements = computed(() => {
  const creditors = []
  const debtors = []

  balances.value.forEach((balance, index) => {
    if (balance > 0.01) {
      creditors.push({ person: index, amount: balance })
    } else if (balance < -0.01) {
      debtors.push({ person: index, amount: Math.abs(balance) })
    }
  })

  const settlementList = []
  let creditorIndex = 0
  let debtorIndex = 0

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]

    const amount = Math.min(creditor.amount, debtor.amount)

    settlementList.push({
      from: debtor.person,
      to: creditor.person,
      amount: amount
    })

    creditor.amount -= amount
    debtor.amount -= amount

    if (creditor.amount < 0.01) creditorIndex++
    if (debtor.amount < 0.01) debtorIndex++
  }

  return settlementList
})

const saveToStorage = () => {
  const data = {
    people: people.value,
    items: items.value,
    savedAt: Date.now()
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const loadFromStorage = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      people.value = data.people || ['']
      items.value = data.items || []
      if (items.value.length > 0) {
        itemIdCounter = Math.max(...items.value.map(i => i.id)) || 0
      }
    } catch (e) {
      console.warn('Failed to load saved data')
    }
  }
}

const clearStorage = () => {
  localStorage.removeItem(STORAGE_KEY)
}

watch([people, items], () => {
  saveToStorage()
}, { deep: true })

const personInputs = ref([])

const addPerson = () => {
  people.value.push('')
  nextTick(() => {
    const lastIndex = people.value.length - 1
    personInputs.value[lastIndex]?.focus()
    personInputs.value[lastIndex]?.select()
  })
}

const removePerson = (index) => {
  if (people.value.length > 1) {
    people.value.splice(index, 1)
    personInputs.value.splice(index, 1)

    items.value.forEach(item => {
      item.sharedBy.splice(index, 1)
      if (item.paidBy > index) {
        item.paidBy--
      } else if (item.paidBy === index) {
        item.paidBy = 0
      }
    })
  }
}

const descriptionInputs = ref([])
const costInputs = ref([])
const paidBySelects = ref([])

const addItem = () => {
  const newItem = {
    id: newItemId(),
    description: '',
    cost: '',
    paidBy: 0,
    sharedBy: people.value.map(() => false)
  }
  items.value.push(newItem)
  nextTick(() => {
    const lastIndex = items.value.length - 1
    descriptionInputs.value[lastIndex]?.focus()
  })
}

const removeItem = (index) => {
  items.value.splice(index, 1)
  descriptionInputs.value.splice(index, 1)
  costInputs.value.splice(index, 1)
  paidBySelects.value.splice(index, 1)
}

const selectAllSharedBy = (itemIndex) => {
  items.value[itemIndex].sharedBy = items.value[itemIndex].sharedBy.map(() => true)
}

const clearAllSharedBy = (itemIndex) => {
  items.value[itemIndex].sharedBy = items.value[itemIndex].sharedBy.map(() => false)
}

const clearAll = () => {
  if (confirm('Clear all data? This cannot be undone.')) {
    people.value = ['']
    items.value = []
    personInputs.value = []
    descriptionInputs.value = []
    costInputs.value = []
    paidBySelects.value = []
    clearStorage()
  }
}

const addSampleData = () => {
  people.value = ['Alice', 'Bob', 'Charlie']
  items.value = [
    {
      id: newItemId(),
      description: 'Dinner at restaurant',
      cost: '1200.00',
      paidBy: 0,
      sharedBy: [true, true, true]
    },
    {
      id: newItemId(),
      description: 'Pathao delivery',
      cost: '400',
      paidBy: 1,
      sharedBy: [true, true, false]
    },
    {
      id: newItemId(),
      description: 'Movie tickets',
      cost: '900.00',
      paidBy: 2,
      sharedBy: [false, true, true]
    }
  ]
}

const exportData = () => {
  const data = {
    version: 1,
    people: people.value,
    items: items.value,
    exportedAt: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bill-split-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const handleImportFile = (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target?.result)

      if (!data.people || !data.items) {
        alert('Invalid file format. Missing people or items.')
        return
      }

      people.value = data.people
      items.value = data.items
      if (items.value.length > 0) {
        itemIdCounter = Math.max(...items.value.map(i => i.id)) || 0
      }
      personInputs.value = []
      descriptionInputs.value = []
      costInputs.value = []
      paidBySelects.value = []
      importExportMode.value = null
      alert('Import successful!')
    } catch (err) {
      alert('Failed to parse file. Make sure it\'s a valid JSON.')
    }
  }
  reader.readAsText(file)
}

const copyShareLink = () => {
  const data = {
    people: validPeople.value,
    items: items.value.map(item => ({
      description: item.description,
      cost: item.cost,
      paidBy: validPeople.value[item.paidBy] || '',
      sharedBy: item.sharedBy.map((shared, i) => shared ? validPeople.value[i] : null).filter(Boolean)
    }))
  }

  const text = `Bill Split\nTotal: Rs. ${totalAmount.value.toFixed(2)}\n\n` +
    data.items.map(item =>
      `${item.description}: Rs. ${item.cost}\n  Paid by: ${item.paidBy}\n  Split: ${item.sharedBy.join(', ')}`
    ).join('\n\n')

  navigator.clipboard.writeText(text).then(() => {
    alert('Copied to clipboard!')
  })
}

const handleGlobalKeydown = (e) => {
  if (importExportMode.value) return

  if (e.ctrlKey && e.key === 'n' && !e.shiftKey) {
    e.preventDefault()
    addItem()
  }

  if (e.ctrlKey && e.shiftKey && e.key === 'N') {
    e.preventDefault()
    addPerson()
  }

  if (e.ctrlKey && e.key === 'e') {
    e.preventDefault()
    exportData()
  }

  if (e.ctrlKey && e.key === 'i') {
    e.preventDefault()
    importExportMode.value = 'import'
  }

  if (e.key === 'Escape' && importExportMode.value) {
    importExportMode.value = null
  }
}

const handleItemKeydown = (e, itemIndex, field) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (field === 'description') {
      costInputs.value[itemIndex]?.focus()
    } else if (field === 'cost') {
      paidBySelects.value[itemIndex]?.focus()
    } else if (field === 'paidBy') {
      const firstCheckbox = document.querySelector(`#item-${itemIndex} .shared-checkbox:not(:checked)`)
      firstCheckbox?.focus()
    }
  }

  if (e.key === 'Tab' && !e.shiftKey && field === 'paidBy') {
    e.preventDefault()
    const firstCheckbox = document.querySelector(`#item-${itemIndex} .shared-checkbox:not(:checked)`)
    firstCheckbox?.focus()
  }
}

const handleSharedByKeydown = (e, itemIndex, personIndex) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    items.value[itemIndex].sharedBy[personIndex] = !items.value[itemIndex].sharedBy[personIndex]
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault()
    if (personIndex < validPeople.value.length - 1) {
      nextTick(() => {
        const el = document.querySelector(`#item-${itemIndex} .shared-checkbox[data-person="${personIndex + 1}"]`)
        el?.focus()
      })
    }
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (personIndex > 0) {
      nextTick(() => {
        const el = document.querySelector(`#item-${itemIndex} .shared-checkbox[data-person="${personIndex - 1}"]`)
        el?.focus()
      })
    }
  }

  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault()
    addItem()
    nextTick(() => {
      descriptionInputs.value[items.value.length - 1]?.focus()
    })
  }

  if (e.key === 'Tab' && e.shiftKey) {
    e.preventDefault()
    paidBySelects.value[itemIndex]?.focus()
  }
}

const handlePersonKeydown = (e, index) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    addPerson()
  }

  if (e.key === 'ArrowDown' && index < people.value.length - 1) {
    e.preventDefault()
    personInputs.value[index + 1]?.focus()
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (index > 0) {
      personInputs.value[index - 1]?.focus()
    }
  }

  if (e.key === 'Backspace' && people.value[index].trim() === '' && people.value.length > 1) {
    e.preventDefault()
    removePerson(index)
    nextTick(() => {
      const newIndex = Math.max(0, index - 1)
      personInputs.value[newIndex]?.focus()
    })
  }
}

onMounted(() => {
  loadFromStorage()
  window.addEventListener('keydown', handleGlobalKeydown, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown, true)
})
</script>

<template>
  <div class="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-900 min-h-screen">
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Bill Splitter
          </h1>
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400 text-sm">
            <span><kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Ctrl+N</kbd> New item</span>
            <span><kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Ctrl+Shift+N</kbd> New person</span>
            <span><kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Enter</kbd> Next field</span>
            <span><kbd class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Space</kbd> Toggle share</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button @click="exportData" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Export
          </button>
          <button @click="importExportMode = 'import'" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Import
          </button>
        </div>
      </div>
    </div>

    <div v-if="importExportMode === 'import'" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-xl max-w-md w-full mx-4 shadow-2xl">
        <h3 class="text-lg font-bold mb-4">Import Bill Data</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Select a JSON file previously exported from Bill Splitter.</p>
        <input type="file" accept=".json" @change="handleImportFile" class="w-full mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer" />
        <div class="flex justify-end">
          <button @click="importExportMode = null" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Cancel</button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="space-y-6">
        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-4">
            <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/></svg>
            People
          </h2>

          <div class="space-y-2">
            <div v-for="(person, index) in people" :key="index" class="flex items-center space-x-2">
              <input
                v-model="people[index]"
                @keydown="handlePersonKeydown($event, index)"
                @blur="personInputs[index] = $event.target"
                :ref="el => personInputs[index] = el"
                type="text"
                :placeholder="`Person ${index + 1}`"
                class="person-input flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                v-if="people.length > 1"
                @click="removePerson(index)"
                class="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <button
              @click="addPerson"
              class="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm mt-3"
            >
              <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add Person
            </button>
          </div>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-4">
            <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Items
          </h2>

          <div class="space-y-4">
            <div
              v-for="(item, index) in items"
              :key="item.id"
              :id="`item-${index}`"
              class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700"
            >
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs text-gray-400 font-mono">#{{ index + 1 }}</span>
                <button
                  @click="removeItem(index)"
                  class="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div class="flex items-center justify-between mb-3">
                <input
                  v-model="item.description"
                  @keydown="handleItemKeydown($event, index, 'description')"
                  :ref="el => descriptionInputs[index] = el"
                  type="text"
                  :placeholder="`Item ${index + 1} description`"
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-2"
                />
              </div>

              <div class="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cost (Rs.)
                  </label>
                  <input
                    v-model="item.cost"
                    @keydown="handleItemKeydown($event, index, 'cost')"
                    :ref="el => costInputs[index] = el"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Paid by
                  </label>
                  <select
                    v-model="item.paidBy"
                    @keydown="handleItemKeydown($event, index, 'paidBy')"
                    :ref="el => paidBySelects[index] = el"
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option
                      v-for="(person, personIndex) in validPeople"
                      :key="personIndex"
                      :value="personIndex"
                    >
                      {{ person }}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Shared by
                  </label>
                  <div class="flex space-x-2">
                    <button
                      @click="selectAllSharedBy(index)"
                      class="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                    >
                      All
                    </button>
                    <button
                      @click="clearAllSharedBy(index)"
                      class="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2" role="group">
                  <label
                    v-for="(person, personIndex) in validPeople"
                    :key="personIndex"
                    class="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                    :class="item.sharedBy[personIndex]
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'"
                  >
                    <input
                      v-model="item.sharedBy[personIndex]"
                      @keydown="handleSharedByKeydown($event, index, personIndex)"
                      type="checkbox"
                      class="sr-only shared-checkbox"
                      :data-person="personIndex"
                      tabindex="-1"
                    />
                    <span
                      class="w-4 h-4 flex items-center justify-center rounded border transition-colors"
                      :class="item.sharedBy[personIndex]
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-400'"
                    >
                      <svg v-if="item.sharedBy[personIndex]" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                    </span>
                    <span class="text-sm font-medium">{{ person }}</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              @click="addItem"
              class="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm"
            >
              <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add Item
            </button>

            <div v-if="items.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
              No items yet. Press <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Ctrl+N</kbd> to add one!
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-4">
            <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            Summary
          </h2>

          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Rs. {{ totalAmount.toFixed(2) }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600 dark:text-gray-400">Items:</span>
              <span class="text-gray-900 dark:text-gray-100">{{ items.length }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600 dark:text-gray-400">People:</span>
              <span class="text-gray-900 dark:text-gray-100">{{ validPeople.length }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600 dark:text-gray-400">Per person (avg):</span>
              <span class="text-gray-900 dark:text-gray-100">
                {{ validPeople.length > 0 ? 'Rs. ' + (totalAmount / validPeople.length).toFixed(2) : 'Rs. 0.00' }}
              </span>
            </div>
          </div>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Individual Balances
          </h2>

          <div v-if="validPeople.length === 0" class="text-center py-4 text-gray-500 dark:text-gray-400">
            Add people to see balances
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(person, index) in validPeople"
              :key="index"
              class="flex justify-between items-center py-3 px-4 bg-white dark:bg-gray-700 rounded-lg"
            >
              <span class="font-medium text-gray-900 dark:text-gray-100">{{ person }}</span>
              <span
                :class="[
                  'font-bold text-lg',
                  balances[index] > 0.01 ? 'text-green-600' :
                  balances[index] < -0.01 ? 'text-red-600' :
                  'text-gray-500 dark:text-gray-400'
                ]"
              >
                {{ balances[index] > 0.01 ? '+' : '' }}Rs. {{ balances[index].toFixed(2) }}
              </span>
            </div>
          </div>

          <div class="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p><span class="text-green-600 font-medium">Green</span> = Gets money back</p>
            <p><span class="text-red-600 font-medium">Red</span> = Owes money</p>
            <p><span class="text-gray-400">Gray</span> = Settled up</p>
          </div>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Settlements
          </h2>

          <div v-if="settlements.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
            Add items to see who owes whom!
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="settlement in settlements"
              :key="`${settlement.from}-${settlement.to}`"
              class="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border-l-4 border-blue-500"
            >
              <div class="flex items-center space-x-3">
                <span class="font-medium text-gray-900 dark:text-gray-100">
                  {{ validPeople[settlement.from] }}
                </span>
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                <span class="font-medium text-gray-900 dark:text-gray-100">
                  {{ validPeople[settlement.to] }}
                </span>
              </div>
              <span class="font-bold text-lg text-green-600">
                Rs. {{ settlement.amount.toFixed(2) }}
              </span>
            </div>
          </div>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Quick Actions
          </h2>
          <div class="flex flex-wrap gap-2">
            <button
              @click="clearAll"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Clear All
            </button>
            <button
              @click="addSampleData"
              class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              Sample Data
            </button>
            <button
              @click="copyShareLink"
              class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Copy Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>