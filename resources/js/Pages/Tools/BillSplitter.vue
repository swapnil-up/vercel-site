<template>
  <div class="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-900 min-h-screen">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Bill Splitter
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Add people, items, and see who owes whom
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Left Panel: People & Items -->
      <div class="space-y-6">
        <!-- People Section -->
        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-4">
            <Users class="mr-2 h-5 w-5" />
            People
          </h2>
          
          <div class="space-y-2">
            <div
              v-for="(person, index) in people"
              :key="index"
              class="flex items-center space-x-2"
            >
              <input
                v-model="people[index]"
                @input="updatePerson(index, $event.target.value)"
                type="text"
                :placeholder="`Person ${index + 1}`"
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                v-if="people.length > 1"
                @click="removePerson(index)"
                class="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
            
            <button
              @click="addPerson"
              class="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm mt-3"
            >
              <Plus class="mr-1 h-4 w-4" />
              Add Person
            </button>
          </div>
        </div>

        <!-- Items Section -->
        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-4">
            <DollarSign class="mr-2 h-5 w-5" />
            Items
          </h2>

          <div class="space-y-4">
            <div
              v-for="(item, index) in items"
              :key="item.id"
              class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700"
            >
              <div class="flex items-center justify-between mb-3">
                <input
                  v-model="item.description"
                  type="text"
                  placeholder="Item description"
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-2"
                />
                <button
                  @click="removeItem(index)"
                  class="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cost (Rs.)
                  </label>
                  <input
                    v-model="item.cost"
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
                      Select All
                    </button>
                    <button
                      @click="clearAllSharedBy(index)"
                      class="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="(person, personIndex) in validPeople"
                    :key="personIndex"
                    class="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                  >
                    <input
                      v-model="item.sharedBy[personIndex]"
                      type="checkbox"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-sm text-gray-700 dark:text-gray-300">{{ person }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Add Item button-->
            <button
              @click="addItem"
              class="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm"
            >
              <Plus class="mr-1 h-4 w-4" />
              Add Item
            </button>

            <div v-if="items.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
              No items added yet. Click "Add Item" to get started!
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Summary & Settlements -->
      <div class="space-y-6">
        <!-- Summary -->
        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-4">
            <Calculator class="mr-2 h-5 w-5" />
            Summary
          </h2>
          
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-gray-600 dark:text-gray-400">Total Amount:</span>
              <span class="text-xl font-bold text-gray-900 dark:text-gray-100">
                Rs. {{ totalAmount.toFixed(2) }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600 dark:text-gray-400">Number of Items:</span>
              <span class="text-gray-900 dark:text-gray-100">{{ items.length }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600 dark:text-gray-400">Number of People:</span>
              <span class="text-gray-900 dark:text-gray-100">{{ validPeople.length }}</span>
            </div>
          </div>
        </div>

        <!-- Individual Balances -->
        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Individual Balances
          </h2>
          
          <div class="space-y-2">
            <div
              v-for="(person, index) in validPeople"
              :key="index"
              class="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-700 rounded-lg"
            >
              <span class="font-medium text-gray-900 dark:text-gray-100">{{ person }}</span>
              <span
                :class="[
                  'font-bold',
                  balances[index] > 0.01 ? 'text-green-600' : 
                  balances[index] < -0.01 ? 'text-red-600' : 
                  'text-gray-500 dark:text-gray-400'
                ]"
              >
                {{ balances[index] > 0.01 ? '+' : '' }}Rs. {{ balances[index].toFixed(2) }}
              </span>
            </div>
          </div>
          
          <div class="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Green = Gets money back, Red = Owes money, Gray = Even
          </div>
        </div>

        <!-- Settlements -->
        <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Who Pays Whom
          </h2>
          
          <div v-if="settlements.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
            Add some items to see settlements!
          </div>
          
          <div v-else class="space-y-3">
            <div
              v-for="settlement in settlements"
              :key="`${settlement.from}-${settlement.to}`"
              class="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border-l-4 border-blue-500"
            >
              <div class="flex items-center space-x-3">
                <span class="font-medium text-gray-900 dark:text-gray-100">
                  {{ validPeople[settlement.from] }}
                </span>
                <ArrowRight class="h-4 w-4 text-gray-400" />
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

        <!-- Quick Actions -->
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
              Add Sample Data
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const people = ref([''])
const items = ref([])


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

      // Person who paid gets credited
      if (paidBy < balanceArray.length) {
        balanceArray[paidBy] += cost
      }

      // People who shared it get debited
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


const addPerson = () => {
  people.value.push('')
}

const updatePerson = (index, value) => {
  people.value[index] = value
}

const removePerson = (index) => {
  if (people.value.length > 1) {
    people.value.splice(index, 1)
    
    // Remove this person from all items
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

const addItem = () => {
  const newItem = {
    id: Date.now(),
    description: '',
    cost: '',
    paidBy: 0,
    sharedBy: people.value.map(() => false)
  }
  items.value.push(newItem)
}

const removeItem = (index) => {
  items.value.splice(index, 1)
}

const selectAllSharedBy = (itemIndex) => {
  items.value[itemIndex].sharedBy = items.value[itemIndex].sharedBy.map(() => true)
}

const clearAllSharedBy = (itemIndex) => {
  items.value[itemIndex].sharedBy = items.value[itemIndex].sharedBy.map(() => false)
}

const clearAll = () => {
  people.value = ['']
  items.value = []
}

const addSampleData = () => {
  people.value = ['Alice', 'Bob', 'Charlie']
  items.value = [
    {
      id: Date.now(),
      description: 'Dinner at restaurant',
      cost: '1200.00',
      paidBy: 0,
      sharedBy: [true, true, true]
    },
    {
      id: Date.now() + 1,
      description: 'Pathao',
      cost: '400',
      paidBy: 1,
      sharedBy: [true, true, false]
    },
    {
      id: Date.now() + 2,
      description: 'Movie tickets',
      cost: '900.00',
      paidBy: 2,
      sharedBy: [false, true, true]
    }
  ]
}
</script>