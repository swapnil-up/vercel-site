<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const clicks = ref(0)
const lifetimeClicks = ref(0)
const upgrades = ref([
  { id: 'coffee', name: 'Caffeine Shot', cost: 15, count: 0, desc: '+1 click per tap', power: 1 },
  { id: 'planner', name: 'Productivity Planner', cost: 100, count: 0, desc: '+5 clicks per tap', power: 5 },
  { id: 'hacks', name: 'Life Hacks Newsletter', cost: 500, count: 0, desc: '+20 clicks per tap', power: 20 },
  { id: 'coach', name: 'Billionaire Life Coach', cost: 2000, count: 0, desc: '+50 clicks per tap', power: 50 },
  { id: 'saas', name: 'SaaS Side Project', cost: 5000, count: 0, desc: '+100 clicks per tap', power: 100 },
  { id: 'course', name: 'Sell Courses About Selling Courses', cost: 15000, count: 0, desc: '+300 clicks per tap', power: 300 },
  { id: 'crypto', name: 'Crypto Morning Routine', cost: 50000, count: 0, desc: '+1000 clicks per tap', power: 1000 },
  { id: 'manifest', name: 'Manifestation Coach', cost: 150000, count: 0, desc: '+5000 clicks per tap', power: 5000 },
])

const achievements = [
  { id: 'first', name: 'First Step', desc: 'Click once', check: (c) => c >= 1 },
  { id: 'hundo', name: 'Hundo', desc: '100 clicks', check: (c) => c >= 100 },
  { id: 'k', name: 'Four Figures', desc: '1,000 clicks', check: (c) => c >= 1000 },
  { id: 'optimizer', name: 'True Optimizer', desc: '5,000 clicks', check: (c) => c >= 5000 },
  { id: 'productivity', name: 'Productivity Bro', desc: '10,000 clicks', check: (c) => c >= 10000 },
  { id: 'hustle', name: 'Hustle Culture Victim', desc: '50,000 clicks', check: (c) => c >= 50000 },
]

const unlockedAchievements = ref([])

const clicksPerTap = computed(() => {
  return 1 + upgrades.value.reduce((sum, u) => sum + (u.count * u.power), 0)
})

const click = () => {
  clicks.value += clicksPerTap.value
  lifetimeClicks.value += clicksPerTap.value
}

const buyUpgrade = (upgrade) => {
  if (clicks.value >= upgrade.cost) {
    clicks.value -= upgrade.cost
    upgrade.count++
    upgrade.cost = Math.floor(upgrade.cost * 1.5)
    saveProgress()
  }
}

const canAfford = (cost) => clicks.value >= cost

const saveProgress = () => {
  localStorage.setItem('optimizerClicker', JSON.stringify({
    clicks: clicks.value,
    lifetimeClicks: lifetimeClicks.value,
    upgrades: upgrades.value.map(u => ({ id: u.id, count: u.count, cost: u.cost })),
    achievements: unlockedAchievements.value
  }))
}

const loadProgress = () => {
  const saved = localStorage.getItem('optimizerClicker')
  if (saved) {
    const data = JSON.parse(saved)
    clicks.value = data.clicks || 0
    lifetimeClicks.value = data.lifetimeClicks || 0
    unlockedAchievements.value = data.achievements || []
    if (data.upgrades) {
      data.upgrades.forEach(savedU => {
        const upgrade = upgrades.value.find(u => u.id === savedU.id)
        if (upgrade) {
          upgrade.count = savedU.count
          upgrade.cost = savedU.cost
        }
      })
    }
  }
}

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

watch(lifetimeClicks, () => {
  achievements.forEach(ach => {
    if (!unlockedAchievements.value.includes(ach.id) && ach.check(lifetimeClicks.value)) {
      unlockedAchievements.value.push(ach.id)
    }
  })
  saveProgress()
})

onMounted(loadProgress)
</script>

<template>
  <div class="border rounded-lg p-4">
    <div class="flex flex-col md:flex-row gap-4">
      <div class="flex-1">
        <div class="text-center mb-4">
          <h2 class="text-2xl font-bold text-indigo-600">Life Optimizer</h2>
          <p class="text-gray-500 text-xs">Click to optimize</p>
        </div>

        <div class="text-center mb-4">
          <div class="text-4xl font-bold text-gray-800">{{ formatNumber(clicks) }}</div>
          <div class="text-xs text-gray-500">points</div>
          <div class="text-xs text-gray-400">{{ clicksPerTap }}/tap</div>
        </div>

        <div class="flex justify-center mb-4">
          <button 
            @click="click"
            class="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all"
          >
            OPTIMIZE
          </button>
        </div>

        <div class="text-center text-xs text-gray-400">
          Lifetime: {{ formatNumber(lifetimeClicks) }}
        </div>
      </div>

      <div class="flex-1">
        <div class="mb-4">
          <h3 class="text-sm font-semibold mb-2">Upgrades</h3>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div 
              v-for="upgrade in upgrades" 
              :key="upgrade.id"
              class="flex items-center justify-between p-2 border rounded text-xs"
              :class="canAfford(upgrade.cost) ? 'bg-white' : 'bg-gray-50 opacity-60'"
            >
              <div class="truncate flex-1 mr-2">
                <div class="font-medium truncate">{{ upgrade.name }}</div>
                <div class="text-gray-500 text-xs">{{ upgrade.desc }} ({{ upgrade.count }})</div>
              </div>
              <button 
                @click="buyUpgrade(upgrade)"
                :disabled="!canAfford(upgrade.cost)"
                class="px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
                :class="canAfford(upgrade.cost) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'"
              >
                {{ formatNumber(upgrade.cost) }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="unlockedAchievements.length">
          <h3 class="text-sm font-semibold mb-2">Achievements</h3>
          <div class="flex flex-wrap gap-1">
            <span 
              v-for="ach in achievements.filter(a => unlockedAchievements.includes(a.id))" 
              :key="ach.id"
              class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs"
            >
              🏆 {{ ach.name }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>