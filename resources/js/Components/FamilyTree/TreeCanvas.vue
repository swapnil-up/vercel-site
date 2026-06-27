<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useFamilyTreeStore } from '../../Composables/useFamilyTreeStore.js'

const store = useFamilyTreeStore()

const NODE_WIDTH = 140
const NODE_HEIGHT = 50
const H_GAP = 20
const V_GAP = 80

const container = ref(null)
const svg = ref(null)

const panX = ref(0)
const panY = ref(0)
const zoom = ref(1)
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })

const dragging = ref(null)
const dragStart = ref({ x: 0, y: 0, nodeX: 0, nodeY: 0 })

const hoveredId = ref(null)
const contextMenu = ref(null)
const linkingFor = ref(null)
const linkingQuery = ref('')

const svgWidth = ref(2000)
const svgHeight = ref(2000)

const layoutPositions = computed(() => computeLayout())

const lines = computed(() => {
  const result = []
  const pos = layoutPositions.value
  const seen = new Set()

  for (const rel of store.state.relationships) {
    const fromPos = pos[rel.from]
    const toPos = pos[rel.to]
    if (!fromPos || !toPos) continue

    const key = rel.type === 'parent'
      ? `${rel.from}|${rel.to}|${rel.type}`
      : [rel.from, rel.to, rel.type].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)

    if (rel.type === 'spouse') {
      result.push({
        x1: fromPos.x + NODE_WIDTH / 2,
        y1: fromPos.y + NODE_HEIGHT / 2,
        x2: toPos.x + NODE_WIDTH / 2,
        y2: toPos.y + NODE_HEIGHT / 2,
        type: 'spouse',
      })
    } else {
      const childPos = rel.type === 'parent' ? pos[rel.from] : pos[rel.to]
      const parentPos = rel.type === 'parent' ? pos[rel.to] : pos[rel.from]

      if (childPos && parentPos) {
        const top = childPos.y > parentPos.y ? parentPos : childPos
        const bottom = childPos.y > parentPos.y ? childPos : parentPos
        result.push({
          x1: top.x + NODE_WIDTH / 2,
          y1: top.y + NODE_HEIGHT,
          x2: bottom.x + NODE_WIDTH / 2,
          y2: bottom.y,
          type: 'parent',
        })
      }
    }
  }
  return result
})

function computeLayout() {
  const people = store.state.people
  const relationships = store.state.relationships
  const storedPos = store.state.nodePositions

  if (Object.keys(people).length === 0) return {}

  const parentMap = {}
  const childMap = {}
  const spouseMap = {}

  for (const id of Object.keys(people)) {
    parentMap[id] = new Set()
    childMap[id] = new Set()
    spouseMap[id] = new Set()
  }

  for (const r of relationships) {
    if (r.type === 'parent') {
      parentMap[r.from].add(r.to)
      childMap[r.to].add(r.from)
    } else if (r.type === 'spouse') {
      spouseMap[r.from].add(r.to)
      spouseMap[r.to].add(r.from)
    }
  }

  const roots = Object.keys(people).filter(id => parentMap[id].size === 0)
  if (roots.length === 0 && Object.keys(people).length > 0) {
    roots.push(Object.keys(people)[0])
  }

  const level = {}
  for (const root of roots) level[root] = 0
  const queue = [...roots]
  while (queue.length > 0) {
    const id = queue.shift()
    const lvl = level[id]
    for (const childId of childMap[id]) {
      if (level[childId] === undefined || lvl + 1 < level[childId]) {
        level[childId] = lvl + 1
        queue.push(childId)
      }
    }
    for (const spouseId of spouseMap[id]) {
      if (level[spouseId] === undefined) {
        level[spouseId] = lvl
        queue.push(spouseId)
      }
    }
  }
  for (const id of Object.keys(people)) {
    if (level[id] === undefined) level[id] = 0
  }

  const positions = {}
  const positioned = new Set()

  const SPACING = NODE_WIDTH + H_GAP
  const PAD = 80

  function collisionOffset(fx, memberWidth, y) {
    let ox = fx
    for (const pp of Object.values(positions)) {
      if (pp.y !== y) continue
      const rightEdge = pp.x + NODE_WIDTH + H_GAP
      if (ox < rightEdge && ox + memberWidth + H_GAP > pp.x) {
        ox = rightEdge
      }
    }
    return ox
  }

  function layoutFamily(id, leftX, depth) {
    if (positioned.has(id)) {
      return (1 + [...spouseMap[id]].filter(s => positioned.has(s)).length) * SPACING
    }

    const y = depth * (NODE_HEIGHT + V_GAP) + PAD

    const members = [id, ...spouseMap[id]].filter(m => !positioned.has(m))

    const allKids = new Set()
    for (const member of members) {
      for (const childId of childMap[member]) {
        allKids.add(childId)
      }
    }
    const kidList = [...allKids].filter(k => !positioned.has(k))
    const allKidsPositioned = allKids.size > 0 && kidList.length === 0

    const memberWidth = members.length * SPACING - H_GAP

    if (allKidsPositioned) {
      let minX = Infinity, maxX = -Infinity
      for (const kidId of allKids) {
        const kp = positions[kidId]
        if (kp) {
          minX = Math.min(minX, kp.x)
          maxX = Math.max(maxX, kp.x + NODE_WIDTH)
        }
      }
      const childrenCenter = (minX + maxX) / 2
      let fx = childrenCenter - memberWidth / 2
      fx = collisionOffset(fx, memberWidth, y)

      for (const member of members) {
        positions[member] = { x: fx, y }
        positioned.add(member)
        fx += SPACING
      }
      return Math.max(memberWidth, maxX - minX)
    }

    if (kidList.length === 0) {
      let fx = leftX
      for (const member of members) {
        positions[member] = { x: fx, y }
        positioned.add(member)
        fx += SPACING
      }
      return memberWidth
    }

    let childLeft = leftX
    for (const kidId of kidList) {
      childLeft += layoutFamily(kidId, childLeft, depth + 1)
    }

    const childrenSpan = childLeft - leftX
    const totalSpan = Math.max(memberWidth, childrenSpan)
    const childrenCenter = leftX + childrenSpan / 2

    let fx = childrenCenter - memberWidth / 2
    for (const member of members) {
      positions[member] = { x: fx, y }
      positioned.add(member)
      fx += SPACING
    }

    return totalSpan
  }

  let globalX = PAD
  for (const root of roots) {
    if (!positioned.has(root)) {
      globalX += layoutFamily(root, globalX, 0) + H_GAP
    }
  }

  for (const id of Object.keys(people)) {
    if (!positioned.has(id)) {
      positions[id] = {
        x: globalX,
        y: level[id] * (NODE_HEIGHT + V_GAP) + PAD,
      }
      positioned.add(id)
      globalX += SPACING
    }
  }

  for (const [id, pos] of Object.entries(storedPos)) {
    if (positions[id] && Math.abs(pos.y - positions[id].y) < 5) {
      positions[id].x = pos.x
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const pos of Object.values(positions)) {
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + NODE_WIDTH)
    maxY = Math.max(maxY, pos.y + NODE_HEIGHT)
  }

  if (minX !== Infinity) {
    const pad = 100
    const ox = -minX + pad
    const oy = -minY + pad
    for (const id of Object.keys(positions)) {
      positions[id].x += ox
      positions[id].y += oy
    }
    svgWidth.value = Math.max(2000, maxX - minX + pad * 2)
    svgHeight.value = Math.max(2000, maxY - minY + pad * 2)
  }

  return positions
}

const coParents = computed(() => {
  const childToParents = {}
  for (const rel of store.state.relationships) {
    if (rel.type === 'parent') {
      if (!childToParents[rel.from]) childToParents[rel.from] = []
      childToParents[rel.from].push(rel.to)
    }
  }
  const pairs = new Set()
  for (const parents of Object.values(childToParents)) {
    for (let i = 0; i < parents.length; i++) {
      for (let j = i + 1; j < parents.length; j++) {
        pairs.add([parents[i], parents[j]].sort().join('|'))
      }
    }
  }
  return [...pairs].map(p => p.split('|'))
})

const coParentLines = computed(() => {
  const pos = layoutPositions.value
  const result = []
  for (const [a, b] of coParents.value) {
    const pa = pos[a], pb = pos[b]
    if (!pa || !pb) continue
    const alreadySpouse = store.state.relationships.some(
      r => r.type === 'spouse' && (
        (r.from === a && r.to === b) || (r.from === b && r.to === a)
      )
    )
    if (alreadySpouse) continue
    result.push({
      x1: pa.x + NODE_WIDTH,
      y1: pa.y + NODE_HEIGHT / 2,
      x2: pb.x,
      y2: pb.y + NODE_HEIGHT / 2,
    })
  }
  return result
})

function onMouseDown(e) {
  if (e.button !== 0) return
  closeContextMenu()
  isPanning.value = true
  panStart.value = { x: e.clientX - panX.value, y: e.clientY - panY.value }
}

function onMouseMove(e) {
  if (isPanning.value) {
    panX.value = e.clientX - panStart.value.x
    panY.value = e.clientY - panStart.value.y
  }
  if (dragging.value) {
    const dx = (e.clientX - dragStart.value.x) / zoom.value
    const dy = (e.clientY - dragStart.value.y) / zoom.value
    const pos = layoutPositions.value[dragging.value]
    if (pos) {
      pos.x = dragStart.value.nodeX + dx
      pos.y = dragStart.value.nodeY + dy
    }
  }
}

function onMouseUp() {
  if (dragging.value) {
    const pos = layoutPositions.value[dragging.value]
    if (pos) {
      store.state.nodePositions[dragging.value] = { x: pos.x, y: pos.y }
    }
  }
  isPanning.value = false
  dragging.value = null
}

function onWheel(e) {
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.min(3, Math.max(0.2, zoom.value * delta))
  const rect = container.value?.getBoundingClientRect()
  if (rect) {
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    panX.value = mx - (mx - panX.value) * (newZoom / zoom.value)
    panY.value = my - (my - panY.value) * (newZoom / zoom.value)
  }
  zoom.value = newZoom
}

function onNodeMouseDown(personId, e) {
  e.stopPropagation()
  if (e.button === 2) return
  dragging.value = personId
  const pos = layoutPositions.value[personId]
  if (pos) {
    dragStart.value = { x: e.clientX, y: e.clientY, nodeX: pos.x, nodeY: pos.y }
  }
  store.state.selectedId = personId
}

function onContextMenu(personId, e) {
  e.preventDefault()
  e.stopPropagation()
  store.state.selectedId = personId
  contextMenu.value = { personId, x: e.clientX, y: e.clientY }
}

function closeContextMenu() {
  contextMenu.value = null
  linkingFor.value = null
  linkingQuery.value = ''
}

function quickAddChild(parentId) {
  const id = store.addPerson('Child', false)
  store.addRelationship(id, parentId, 'parent')
  closeContextMenu()
}

function quickAddParent(childId) {
  const id = store.addPerson('Parent', false)
  store.addRelationship(childId, id, 'parent')
  closeContextMenu()
}

function quickAddSpouse(personId) {
  const id = store.addPerson('Spouse', false)
  store.addRelationship(personId, id, 'spouse')
  closeContextMenu()
}

const availableForLinking = computed(() => {
  if (!linkingFor.value) return []
  const { personId, type } = linkingFor.value
  const query = linkingQuery.value.toLowerCase().trim()
  const excludeIds = new Set([personId])
  if (type === 'spouse') {
    for (const s of store.getSpouses(personId)) excludeIds.add(s.id)
  } else if (type === 'parent') {
    for (const p of store.getParents(personId)) excludeIds.add(p.id)
  } else if (type === 'child') {
    for (const c of store.getChildren(personId)) excludeIds.add(c.id)
  } else if (type === 'sibling') {
    for (const p of store.getParents(personId)) {
      for (const c of store.getChildren(p.id)) {
        if (c.id !== personId) excludeIds.add(c.id)
      }
    }
  }
  return Object.values(store.state.people)
    .filter(p => !excludeIds.has(p.id))
    .filter(p => !query || p.name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name))
})

function openLinkPicker(personId, type) {
  linkingFor.value = { personId, type }
  linkingQuery.value = ''
}

function confirmLink(targetId) {
  if (!linkingFor.value) return
  const { personId, type } = linkingFor.value
  if (type === 'parent') {
    store.addRelationship(personId, targetId, 'parent')
  } else if (type === 'child') {
    store.addRelationship(targetId, personId, 'parent')
  } else if (type === 'spouse') {
    store.addRelationship(personId, targetId, 'spouse')
  } else if (type === 'sibling') {
    for (const p of store.getParents(personId)) {
      store.addRelationship(targetId, p.id, 'parent')
    }
  }
  linkingFor.value = null
  linkingQuery.value = ''
  closeContextMenu()
}

function createAndLink() {
  const name = linkingQuery.value.trim()
  if (!name || !linkingFor.value) return
  const newId = store.addPerson(name, false)
  confirmLink(newId)
}

function deleteWithConfirm(personId) {
  const person = store.state.people[personId]
  if (person && confirm(`Delete "${person.name}"?`)) {
    store.deletePerson(personId)
  }
  closeContextMenu()
}

function onKeyDown(e) {
  const inInput = e.target.closest('input,textarea')
  if (inInput) return
  const key = e.key.toLowerCase()

  if (key === 'n' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    const name = prompt('Enter name for new person:')
    if (name?.trim()) store.addPerson(name.trim())
  }

  if (key === 'c' && !e.ctrlKey && !e.metaKey && store.state.selectedId) {
    e.preventDefault()
    quickAddChild(store.state.selectedId)
  }

  if (key === 'p' && !e.ctrlKey && !e.metaKey && store.state.selectedId) {
    e.preventDefault()
    quickAddParent(store.state.selectedId)
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    if (store.state.selectedId) {
      const person = store.state.people[store.state.selectedId]
      if (person && confirm(`Delete "${person.name}"?`)) {
        store.deletePerson(store.state.selectedId)
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div
    ref="container"
    class="w-full h-full overflow-hidden bg-cream cursor-grab relative"
    :class="{ 'cursor-grabbing': isPanning }"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @wheel.prevent="onWheel"
    @contextmenu.prevent="closeContextMenu"
  >
    <svg
      ref="svg"
      :width="svgWidth"
      :height="svgHeight"
      class="select-none"
      :style="{ cursor: isPanning ? 'grabbing' : dragging ? 'grabbing' : 'grab' }"
    >
      <g :transform="`translate(${panX}, ${panY}) scale(${zoom})`">
        <line
          v-for="(line, i) in lines"
          :key="'rel-' + i"
          :x1="line.x1"
          :y1="line.y1"
          :x2="line.x2"
          :y2="line.y2"
          stroke="#8B8076"
          :stroke-width="line.type === 'spouse' ? 2 : 2.5"
          :stroke-dasharray="line.type === 'spouse' ? '5,3' : 'none'"
        />


        <g
          v-for="(pos, id) in layoutPositions"
          :key="id"
          :transform="`translate(${pos.x}, ${pos.y})`"
          @mousedown="onNodeMouseDown(id, $event)"
          @mouseenter="hoveredId = id"
          @mouseleave="hoveredId = null"
          @contextmenu="onContextMenu(id, $event)"
          class="node-group"
        >
          <rect
            :width="NODE_WIDTH"
            :height="NODE_HEIGHT"
            rx="6"
            class="node-rect"
            :class="store.state.selectedId === id ? 'node-selected' : 'node-default'"
          />
          <text
            :x="NODE_WIDTH / 2"
            :y="NODE_HEIGHT / 2"
            text-anchor="middle"
            dominant-baseline="central"
            class="node-text"
            :class="store.state.selectedId === id ? 'node-text-selected' : ''"
          >
            {{ store.state.people[id]?.name || '?' }}
          </text>
          <g v-if="hoveredId === id && !dragging" class="quick-actions">
            <rect :x="NODE_WIDTH + 6" :y="2" width="28" height="26" rx="6" class="action-btn" @pointerdown.stop="quickAddChild(id)" />
            <text :x="NODE_WIDTH + 20" :y="15" text-anchor="middle" dominant-baseline="central" class="action-icon">+C</text>
            <rect :x="NODE_WIDTH + 6" :y="32" width="28" height="26" rx="6" class="action-btn" @pointerdown.stop="quickAddParent(id)" />
            <text :x="NODE_WIDTH + 20" :y="45" text-anchor="middle" dominant-baseline="central" class="action-icon">+P</text>
          </g>
        </g>
      </g>
    </svg>

    <div
      v-if="contextMenu"
      class="fixed z-50 bg-warm-surface border border-warm-border rounded-sm shadow-lg py-1 text-sm min-w-[160px] max-h-80 overflow-y-auto"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <template v-if="!linkingFor">
        <button @mousedown.stop @click="openLinkPicker(contextMenu.personId, 'child')" class="w-full text-left px-3 py-1.5 hover:bg-cream transition-colors">Add Child</button>
        <button @mousedown.stop @click="openLinkPicker(contextMenu.personId, 'parent')" class="w-full text-left px-3 py-1.5 hover:bg-cream transition-colors">Add Parent</button>
        <button @mousedown.stop @click="openLinkPicker(contextMenu.personId, 'spouse')" class="w-full text-left px-3 py-1.5 hover:bg-cream transition-colors">Add Spouse</button>
        <button @mousedown.stop @click="openLinkPicker(contextMenu.personId, 'sibling')" class="w-full text-left px-3 py-1.5 hover:bg-cream transition-colors">Add Sibling</button>
        <div class="border-t border-warm-border my-1"></div>
        <button @mousedown.stop @click="store.state.selectedId = contextMenu.personId; closeContextMenu()" class="w-full text-left px-3 py-1.5 hover:bg-cream transition-colors">Edit</button>
        <button @mousedown.stop @click="deleteWithConfirm(contextMenu.personId)" class="w-full text-left px-3 py-1.5 text-coral hover:bg-coral/5 transition-colors">Delete</button>
      </template>
      <template v-else>
        <div class="px-3 py-1.5 border-b border-warm-border">
          <input
            v-model="linkingQuery"
            placeholder="Search..."
            class="w-full px-2 py-1 border border-warm-border rounded-sm text-sm bg-white"
            @mousedown.stop
          />
        </div>
        <div v-if="availableForLinking.length > 0" class="max-h-32 overflow-y-auto">
          <button
            v-for="p in availableForLinking"
            :key="p.id"
            @mousedown.stop @click="confirmLink(p.id)"
            class="w-full text-left px-3 py-1.5 hover:bg-cream transition-colors truncate"
          >
            {{ p.name }}
          </button>
        </div>
        <div v-else-if="linkingQuery.trim()" class="px-3 py-1.5 text-xs text-warm-muted">
          No matches
        </div>
        <div v-else class="px-3 py-1.5 text-xs text-warm-muted">
          Type to search or create
        </div>
        <div class="border-t border-warm-border my-1"></div>
        <button
          v-if="linkingQuery.trim()"
          @mousedown.stop @click="createAndLink"
          class="w-full text-left px-3 py-1.5 hover:bg-cream transition-colors"
        >
          + Create "{{ linkingQuery.trim() }}"
        </button>
        <button @mousedown.stop @click="closeContextMenu" class="w-full text-left px-3 py-1.5 hover:bg-cream transition-colors">
          Cancel
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.node-rect {
  fill: white;
  stroke: #EAE2D6;
  stroke-width: 2;
  transition: stroke 0.15s, fill 0.15s, filter 0.15s;
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.08));
}
.node-default {
  fill: white;
  stroke: #EAE2D6;
}
.node-group:hover .node-rect {
  stroke: #2B59C3;
  fill: #F0F4FF;
}
.node-selected {
  fill: #FFF0ED;
  stroke: #FF5A3D;
  stroke-width: 2.5;
}
.node-text {
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 13px;
  fill: #1C1C1E;
  pointer-events: none;
}
.node-text-selected {
  fill: #1C1C1E;
  font-weight: 600;
}
.quick-actions {
  cursor: pointer;
}
.action-btn {
  fill: #2B59C3;
  cursor: pointer;
  transition: fill 0.15s;
}
.action-btn:hover {
  fill: #FF5A3D;
}
.action-icon {
  fill: white;
  font-size: 11px;
  font-family: 'DM Sans', system-ui, sans-serif;
  font-weight: 700;
  pointer-events: none;
  user-select: none;
}
</style>
