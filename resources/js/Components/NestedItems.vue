<template>
  <div class="divide-y divide-gray-100">
    <div
      v-for="(item, index) in props.items"
      :key="index"
      :style="{ paddingLeft: `${(props.level + 1) * 1}rem` }"
    >
      <button
        @click="toggleExpand(getKey(index))"
        class="w-full py-3 px-4 flex items-center gap-2 hover:bg-gray-100 transition-colors text-left"
      >
        <span
          v-if="item.children && item.children.length > 0"
          class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-400 transition-transform text-xs"
          :class="{ 'rotate-90': props.expandedItems.has(getKey(index)) }"
        >
          <svg
            class="w-3 h-3"
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
          class="flex-shrink-0 w-4"
        />
        <span class="text-gray-700">{{ item.title }}</span>
        <span v-if="item.children && item.children.length > 0" class="ml-auto text-xs text-gray-400">
          {{ item.children.length }}
        </span>
      </button>

      <div v-if="item.children?.length > 0 && props.expandedItems.has(getKey(index))">
        <NestedItems
          :items="item.children"
          :level="props.level + 1"
          :expanded-items="props.expandedItems"
          :parent-index="getKey(index)"
          @toggle="(k) => $emit('toggle', k)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  expandedItems: {
    type: Set,
    required: true
  },
  parentIndex: {
    type: [String, Number],
    default: ''
  }
})

const emit = defineEmits(['toggle'])

const getKey = (index) => {
  return props.parentIndex ? `${props.parentIndex}-${index}` : `${index}`;
}

const toggleExpand = (key) => {
  if (props.expandedItems.has(key)) {
    props.expandedItems.delete(key)
  } else {
    props.expandedItems.add(key)
  }
  emit('toggle')
}
</script>
