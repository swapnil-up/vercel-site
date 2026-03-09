<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">Achievement Progress</h1>
      <p class="text-gray-600 mb-8">Track learning journey and accomplishments. Last Updated 2026-03-09</p>

      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading achievements...</p>
      </div>

      <div v-else-if="items.length > 0" class="space-y-3">
        <div
          v-for="(item, index) in items"
          :key="index"
          class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          <button
            @click="toggleExpand(index)"
            class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-center gap-3 flex-1">
              <span
                v-if="item.children && item.children.length > 0"
                class="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 transition-transform"
                :class="{ 'rotate-90': expandedItems.has(index) }"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
              <span
                v-else
                class="flex-shrink-0 w-5 h-5"
              />
              <span class="text-lg font-semibold text-gray-900">{{ item.title }}</span>
            </div>
            <span v-if="item.children && item.children.length > 0" class="text-sm text-gray-500">
              {{ item.children.length }}
            </span>
          </button>

          <div
            v-if="item.children && item.children.length > 0 && expandedItems.has(index)"
            class="border-t border-gray-100 bg-gray-50"
          >
            <NestedItems
              :items="item.children"
              :level="1"
              :parent-index="index"
              :expanded-items="expandedItems"
              @toggle="handleToggle"
            />
          </div>
        </div>
      </div>

      <div v-else class="bg-white rounded-lg shadow-sm p-8 text-center">
        <p class="text-gray-500">No achievements loaded. Check your data file.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NestedItems from '../Components/NestedItems.vue'

const items = ref([])
const loading = ref(true)
const expandedItems = ref(new Set())

const toggleExpand = (index) => {
  if (expandedItems.value.has(index)) {
    expandedItems.value.delete(index)
  } else {
    expandedItems.value.add(index)
  }
}

const parseAchievements = (text) => {
  const lines = text.trim().split('\n')
  const result = []
  const stack = []

  for (const line of lines) {
    const match = line.match(/^(\s*)(.+)$/)
    if (!match) continue

    const indent = match[1].length
    const title = match[2].trim()

    const item = {
      title,
      children: []
    }

    // Find the correct parent level
    while (stack.length > 0 && stack[stack.length - 1].level >= indent) {
      stack.pop()
    }

    if (stack.length === 0) {
      result.push(item)
    } else {
      stack[stack.length - 1].item.children.push(item)
    }

    stack.push({ level: indent, item })
  }

  return result
}

const handleToggle = () => {
  expandedItems.value = new Set(expandedItems.value);
};

onMounted(async () => {
  try {
    const response = await fetch('/achievements.txt')
    const text = await response.text()
    items.value = parseAchievements(text)
  } catch (error) {
    console.error('Error loading achievements:', error)
  } finally {
    loading.value = false
  }
})
</script>
