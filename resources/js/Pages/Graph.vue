<template>
  <div class="garden-map">
    <div class="garden-body">
      <aside class="garden-panel">
        <div class="panel-brand">
          <p class="eyebrow">The garden</p>
          <h1>Map</h1>
          <p class="panel-lede">Notes connected through maps and links.</p>
          <dl class="panel-stats">
            <div><dt>Notes</dt><dd>{{ stats.notes }}</dd></div>
            <div><dt>Maps</dt><dd>{{ stats.maps }}</dd></div>
            <div><dt>Links</dt><dd>{{ stats.links }}</dd></div>
          </dl>
        </div>

        <div class="search-wrap">
          <label class="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              v-model="search"
              type="search"
              placeholder="Search notes…"
              aria-label="Search notes"
              @keydown.enter.prevent="focusFirstResult"
              @keydown.escape="search = ''"
            />
            <button v-if="search" class="search-clear" type="button" aria-label="Clear search" @click="search = ''">×</button>
          </label>

          <div v-if="search && searchResults.length" class="search-results">
            <button
              v-for="result in searchResults"
              :key="result.id"
              type="button"
              class="search-result"
              @click="focusNode(result.id)"
            >
              <span class="search-result-title">{{ result.title }}</span>
              <span class="search-result-meta">{{ sectionLabel(result) }}<template v-if="result.is_map"> · {{ result.degree }} links</template></span>
            </button>
          </div>
          <p v-else-if="search" class="search-empty">No notes match “{{ search }}”.</p>
        </div>

        <section class="panel-section">
          <h2>View</h2>
          <div class="segmented two-up">
            <button
              type="button"
              :class="{ active: mode === 'all' }"
              @click="showAll"
            >Garden</button>
            <button
              type="button"
              :class="{ active: mode === 'local' }"
              :disabled="!selectedId"
              @click="focusNode(selectedId)"
            >Local</button>
          </div>
        </section>

        <section class="panel-section">
          <h2>Filter</h2>
          <div class="filter-chips">
            <button
              v-for="filter in filters"
              :key="filter.id"
              type="button"
              class="chip"
              :class="{ active: sectionFilter === filter.id }"
              @click="setSectionFilter(filter.id)"
            >{{ filter.label }}</button>
          </div>
        </section>

        <section v-if="mapNodes.length" class="panel-section map-list">
          <h2>Maps</h2>
          <button
            v-for="map in mapNodes"
            :key="map.id"
            type="button"
            class="map-list-item"
            :class="{ active: selectedId === map.id }"
            @click="focusNode(map.id)"
          >
            <span class="map-dot" aria-hidden="true"></span>
            <span class="map-name">{{ map.title }}</span>
            <span class="map-count">{{ map.degree }}</span>
          </button>
        </section>

        <section class="panel-section legend">
          <h2>Legend</h2>
          <div class="legend-row"><span class="swatch map"></span> Map</div>
          <div class="legend-row"><span class="swatch til"></span> TIL</div>
          <div class="legend-row"><span class="swatch article"></span> Article</div>
          <div class="legend-row"><span class="swatch course"></span> Course</div>
        </section>
      </aside>

      <div ref="graphMain" class="map-canvas">
        <div class="canvas-toolbar">
          <button type="button" title="Fit graph" aria-label="Fit graph" @click="fitToContent()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
            </svg>
          </button>
          <button type="button" title="Zoom in" aria-label="Zoom in" @click="zoomBy(1.35)">+</button>
          <button type="button" title="Zoom out" aria-label="Zoom out" @click="zoomBy(1 / 1.35)">−</button>
        </div>

        <div v-if="mode === 'local' && selectedNode" class="local-bar">
          <button type="button" class="back-link" @click="showAll">← Garden</button>
          <span class="local-title">{{ selectedNode.title }}</span>
          <div class="depth-toggle">
            <button type="button" :class="{ active: depth === 1 }" @click="setDepth(1)">1 hop</button>
            <button type="button" :class="{ active: depth === 2 }" @click="setDepth(2)">2 hops</button>
          </div>
        </div>

        <svg ref="svg" class="map-svg" role="img" aria-label="Graph of notes and maps"></svg>

        <div v-if="!loading && visibleCount === 0" class="canvas-empty">
          No notes in this view. Try clearing the filter.
        </div>

        <div
          v-if="hoveredNode"
          class="graph-tooltip"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >
          <strong>{{ hoveredNode.title }}</strong>
          <span>{{ sectionLabel(hoveredNode) }} · {{ hoveredNode.degree }} link{{ hoveredNode.degree === 1 ? '' : 's' }}</span>
          <span v-if="hoveredNode.maps?.length" class="tooltip-maps">in {{ hoveredNode.maps.join(', ') }}</span>
        </div>

        <div class="canvas-hint">
          Drag to pan · Scroll to zoom · Hover for titles · Double-click to focus
        </div>
      </div>

      <aside v-if="stackedNodes.length" class="map-detail">
        <div v-if="stackedNodes.length > 1" class="stack-note">
          {{ stackedNodes.length - 1 }} more open below
        </div>

        <article
          v-for="(node, index) in stackedNodes"
          :key="node.id"
          class="detail-card"
          :class="{ 'is-back': index > 0 }"
        >
          <div class="detail-card-header">
            <span class="detail-kind">{{ sectionLabel(node) }}</span>
            <div class="detail-actions">
              <button type="button" class="detail-action" @click="focusNode(node.id)">Focus</button>
              <a v-if="node.type === 'article'" class="detail-action" :href="`/posts/${node.id}`">Open</a>
              <button type="button" class="detail-close" aria-label="Close" @click="removeFromStack(index)">×</button>
            </div>
          </div>

          <GraphPostViewer
            v-if="node.type === 'article'"
            :post="node"
            :linkedPosts="node.linkedPosts || []"
            :seriesPosts="node.seriesPosts || []"
            :maps="node.maps || []"
            :backlinks="node.backlinks || []"
            inline-navigation
            @open-post="selectNode($event, { focus: true })"
          />

          <div v-else class="detail-thought" v-html="node.content"></div>
        </article>
      </aside>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3'
import Fuse from 'fuse.js'
import GraphPostViewer from '../Components/GraphPostViewer.vue'
import { useDarkMode } from '@/Composables/useDarkMode'
import { useGraphData } from '@/Composables/useGraphData'

export default {
  name: 'Graph',
  components: { GraphPostViewer },
  setup() {
    const { isDark } = useDarkMode()
    const graphUtils = useGraphData()
    return { isDark, graphUtils }
  },
  data() {
    return {
      allNodes: [],
      links: [],
      stats: { notes: 0, maps: 0, links: 0, isolated: 0 },
      nodeById: {},
      filters: [
        { id: 'all', label: 'All' },
        { id: 'maps', label: 'Maps' },
        { id: 'til', label: 'TIL' },
        { id: 'articles', label: 'Articles' },
        { id: 'courses', label: 'Courses' },
      ],
      mode: 'all',
      selectedId: null,
      depth: 1,
      sectionFilter: 'all',
      search: '',
      searchResults: [],
      hoveredNode: null,
      tooltip: { x: 0, y: 0 },
      stackedNodes: [],
      loading: true,
      visibleCount: 0,
      width: 0,
      height: 0,
      currentK: 1,
      fuse: null,
      simulation: null,
      zoom: null,
      svgSel: null,
      container: null,
      nodeSel: null,
      linkSel: null,
      labelSel: null,
      labelBgSel: null,
      colors: {},
      resizeObserver: null,
      fitTimer: null,
    }
  },
  computed: {
    isDarkMode() {
      return this.isDark
    },
    mapNodes() {
      return this.allNodes
        .filter((node) => node.is_map)
        .sort((a, b) => b.degree - a.degree)
    },
    selectedNode() {
      return this.selectedId ? this.nodeById[this.selectedId] : null
    },
  },
  watch: {
    search(value) {
      if (!this.fuse || !value.trim()) {
        this.searchResults = []
        return
      }
      this.searchResults = this.fuse.search(value).slice(0, 8).map((result) => result.item)
    },
    isDarkMode() {
      if (this.svgSel) this.rebuild()
    },
    stackedNodes() {
      this.refitAfterLayout()
    },
  },
  async mounted() {
    await this.loadGraphData()
    this.applyUrlState()
    this.$nextTick(() => {
      this.initGraph()
      this.observeResize()
    })
    window.addEventListener('popstate', this.handlePopState)
  },
  beforeUnmount() {
    window.removeEventListener('popstate', this.handlePopState)
    this.resizeObserver?.disconnect()
    this.simulation?.stop()
    if (this.fitTimer) clearTimeout(this.fitTimer)
  },
  methods: {
    sectionLabel(node) {
      return this.graphUtils.sectionLabel(node)
    },
    async loadGraphData() {
      try {
        const response = await fetch('/data/graph')
        if (!response.ok) throw new Error(`Graph request failed: ${response.status}`)
        const data = await response.json()

        this.allNodes = data.nodes || []
        this.stats = data.stats || this.stats
        this.nodeById = Object.fromEntries(this.allNodes.map((node) => [node.id, node]))
        this.links = (data.connections || []).map((link) => ({
          source: link.source,
          target: link.target,
          type: link.type,
          weight: link.weight || 1,
        }))
        this.fuse = new Fuse(this.allNodes, {
          keys: ['title', 'description', 'tags'],
          threshold: 0.34,
          ignoreLocation: true,
        })
      } catch (error) {
        console.error('Failed to load graph data:', error)
      } finally {
        this.loading = false
      }
    },
    applyUrlState() {
      const params = new URLSearchParams(window.location.search)
      const node = params.get('node')

      if (node && this.nodeById[node]) {
        this.mode = 'local'
        this.selectedId = node
        this.openPost(node)
      }
    },
    syncUrl() {
      const url = new URL(window.location.href)
      url.search = ''
      if (this.mode === 'local' && this.selectedId) {
        url.searchParams.set('node', this.selectedId)
      }
      window.history.replaceState({}, '', url)
    },
    handlePopState() {
      const params = new URLSearchParams(window.location.search)
      this.selectedId = params.get('node') || null
      this.mode = this.selectedId ? 'local' : 'all'
      if (this.selectedId) this.openPost(this.selectedId)
      this.rebuild()
    },
    refitAfterLayout() {
      this.$nextTick(() => {
        setTimeout(() => {
          const rect = this.$refs.svg?.getBoundingClientRect()
          if (!rect?.width) return
          this.width = rect.width
          this.height = rect.height
          this.fitToContent(false)
        }, 120)
      })
    },
    observeResize() {
      const element = this.$refs.graphMain
      if (!element) return

      this.resizeObserver = new ResizeObserver(() => this.handleResize())
      this.resizeObserver.observe(element)
    },
    handleResize() {
      const element = this.$refs.graphMain
      if (!element || !this.svgSel) return

      const width = element.clientWidth
      const height = element.clientHeight
      if (!width || !height) return

      this.width = width
      this.height = height
      this.svgSel.attr('viewBox', `0 0 ${width} ${height}`)
      this.simulation
        ?.force('center', d3.forceCenter(width / 2, height / 2))
        .alpha(0.25)
        .restart()

      if (this.fitTimer) clearTimeout(this.fitTimer)
      this.fitTimer = setTimeout(() => this.fitToContent(false), 220)
    },
    initGraph() {
      const element = this.$refs.graphMain
      this.width = element.clientWidth
      this.height = element.clientHeight

      this.svgSel = d3
        .select(this.$refs.svg)
        .attr('viewBox', `0 0 ${this.width} ${this.height}`)

      this.zoom = d3
        .zoom()
        .scaleExtent([0.25, 4])
        .on('zoom', (event) => {
          this.container?.attr('transform', event.transform)
          this.currentK = event.transform.k
          this.updateLabelVisibility(event.transform.k)
        })

      this.svgSel.call(this.zoom).on('click', (event) => {
        if (event.target.tagName === 'svg') this.clearSelection()
      })

      this.rebuild()
    },
    rebuild() {
      if (!this.svgSel) return

      const rect = this.$refs.svg?.getBoundingClientRect()
      if (rect?.width) this.width = rect.width
      if (rect?.height) this.height = rect.height

      const { nodes, links } = this.buildVisibleGraph()
      this.visibleCount = nodes.length
      this.simulation?.stop()
      this.container?.selectAll('*').remove()
      if (this.fitTimer) clearTimeout(this.fitTimer)

      this.colors = {
        ink: this.cssVar('ink'),
        coral: this.cssVar('coral'),
        border: this.cssVar('warm-border'),
        muted: this.cssVar('warm-muted'),
        surface: this.cssVar('warm-surface'),
      }

      if (!nodes.length) return

      if (this.mode === 'local') {
        nodes.forEach((node) => {
          node.x = this.width / 2 + (Math.random() - 0.5) * 90
          node.y = this.height / 2 + (Math.random() - 0.5) * 90
        })
      } else {
        const maps = nodes
          .filter((node) => node.is_map)
          .sort((a, b) => a.title.localeCompare(b.title))
        const spread = Math.min(this.width, this.height) * 0.335

        maps.forEach((node, index) => {
          const angle = -Math.PI / 2 + (index / maps.length) * Math.PI * 2
          node.x = this.width / 2 + Math.cos(angle) * spread
          node.y = this.height / 2 + Math.sin(angle) * spread
          node.fx = node.x
          node.fy = node.y
        })

        nodes
          .filter((node) => !node.is_map)
          .forEach((node) => {
            node.x = this.width / 2 + (Math.random() - 0.5) * 90
            node.y = this.height / 2 + (Math.random() - 0.5) * 90
          })
      }

      this.container = this.svgSel.append('g').attr('class', 'graph-layer')

      this.linkSel = this.container
        .append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', (link) => {
          const source = this.nodeById[this.linkId(link.source)]
          const target = this.nodeById[this.linkId(link.target)]
          return source?.is_map || target?.is_map ? this.colors.coral : this.colors.border
        })
        .attr('stroke-width', (link) => {
          const source = this.nodeById[this.linkId(link.source)]
          const target = this.nodeById[this.linkId(link.target)]
          return source?.is_map || target?.is_map ? 1.4 : 1
        })
        .attr('stroke-opacity', (link) => {
          const source = this.nodeById[this.linkId(link.source)]
          const target = this.nodeById[this.linkId(link.target)]
          return source?.is_map || target?.is_map ? 0.38 : 0.24
        })

      this.nodeSel = this.container
        .append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .attr('class', 'graph-node')
        .style('cursor', 'pointer')
        .call(
          d3
            .drag()
            .on('start', (event, node) => {
              if (!event.active) this.simulation.alphaTarget(0.2).restart()
              node.fx = node.x
              node.fy = node.y
            })
            .on('drag', (event, node) => {
              node.fx = event.x
              node.fy = event.y
            })
            .on('end', (event, node) => {
              if (!event.active) this.simulation.alphaTarget(0)
              if (!node.is_map) {
                node.fx = null
                node.fy = null
              }
            }),
        )
        .on('click', (event, node) => {
          event.stopPropagation()
          this.selectNode(node.id)
        })
        .on('dblclick', (event, node) => {
          event.stopPropagation()
          this.focusNode(node.id)
        })
        .on('mouseenter', (event, node) => this.handleHover(event, node))
        .on('mousemove', (event) => this.moveTooltip(event))
        .on('mouseleave', () => this.handleHoverOut())

      this.nodeSel
        .append('circle')
        .attr('r', (node) => this.graphUtils.nodeRadius(node))
        .attr('fill', (node) => this.graphUtils.nodeColor(node))
        .attr('stroke', (node) =>
          node.is_map ? this.colors.coral : this.colors.border,
        )
        .attr('stroke-width', (node) => (node.is_map ? 2.4 : 1.2))
        .attr('stroke-opacity', (node) => (node.is_map ? 0.9 : 0.75))

      const mapLabelNodes = nodes.filter((node) => node.is_map)
      this.labelBgSel = this.container
        .append('g')
        .attr('class', 'label-bgs')
        .selectAll('rect')
        .data(mapLabelNodes)
        .join('rect')
        .attr('rx', 9)
        .attr('ry', 9)
        .attr('height', 20)
        .attr('width', (node) => this.mapLabelWidth(node))
        .attr('fill', this.colors.surface)
        .attr('fill-opacity', 0.94)
        .attr('stroke', this.colors.border)
        .attr('stroke-width', 1)
        .attr('opacity', 1)

      this.labelSel = this.container
        .append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .attr('class', 'graph-label')
        .attr('text-anchor', 'middle')
        .style('font-size', (node) => (node.is_map ? '12px' : '11.5px'))
        .style('font-weight', (node) => (node.is_map ? '700' : '600'))
        .style('fill', this.colors.ink)
        .style('paint-order', 'stroke')
        .style('stroke', this.cssVar('cream'))
        .style('stroke-width', '4px')
        .style('pointer-events', 'none')
        .text((node) => this.graphUtils.truncate(node.title, node.is_map ? 30 : 30))
        .attr('opacity', (node) => (this.labelVisible(node, this.currentK) ? 1 : 0))

      let settled = false

      this.simulation = d3
        .forceSimulation(nodes)
        .force(
          'link',
          d3
            .forceLink(links)
            .id((node) => node.id)
            .distance((link) => {
              const source = this.nodeById[this.linkId(link.source)]
              const target = this.nodeById[this.linkId(link.target)]
              return source?.is_map || target?.is_map ? 82 : 40
            })
            .strength(0.62),
        )
        .force('charge', d3.forceManyBody().strength((node) => (node.is_map ? -320 : -70)))
        .force('center', d3.forceCenter(this.width / 2, this.height / 2))
        .force(
          'collision',
          d3.forceCollide().radius((node) => this.graphUtils.nodeRadius(node) + 7),
        )
        .force('x', d3.forceX(this.width / 2).strength(0.045))
        .force('y', d3.forceY(this.height / 2).strength(0.045))
        .alphaDecay(0.04)
        .on('end', () => this.fitToContent(false))
        .on('tick', () => {
          this.linkSel
            .attr('x1', (link) => link.source.x)
            .attr('y1', (link) => link.source.y)
            .attr('x2', (link) => link.target.x)
            .attr('y2', (link) => link.target.y)

          this.nodeSel.attr('transform', (node) => `translate(${node.x},${node.y})`)

          this.labelSel
            .attr('x', (node) => node.x + this.labelPosition(node).x)
            .attr('y', (node) => node.y + this.labelPosition(node).y)

          this.labelBgSel
            .attr('x', (node) => node.x - this.mapLabelWidth(node) / 2)
            .attr('y', (node) => node.y + this.graphUtils.nodeRadius(node) + 5)

          if (!settled && this.simulation.alpha() < 0.04) {
            settled = true
            this.fitToContent(false)
          }
        })

      this.applySelectionStyles()

      this.fitTimer = setTimeout(() => this.fitToContent(false), 900)
    },
    buildVisibleGraph() {
      const mapIds = new Set(this.allNodes.filter((node) => node.is_map).map((node) => node.id))
      const ids = new Set()

      if (this.mode === 'local' && this.selectedId && this.nodeById[this.selectedId]) {
        this.graphUtils
          .neighborhood(this.selectedId, this.depth, this.links)
          .forEach((id) => ids.add(id))
      } else if (this.sectionFilter === 'maps') {
        mapIds.forEach((id) => ids.add(id))
      } else if (this.sectionFilter !== 'all') {
        mapIds.forEach((id) => ids.add(id))
        this.allNodes.forEach((node) => {
          if (this.matchesSection(node)) ids.add(node.id)
        })
      } else {
        this.allNodes.forEach((node) => ids.add(node.id))
      }

      const nodes = [...ids]
        .map((id) => this.nodeById[id])
        .filter(Boolean)
        .map((node) => ({ ...node }))

      const links = this.links
        .filter((link) => ids.has(this.linkId(link.source)) && ids.has(this.linkId(link.target)))
        .map((link) => ({
          ...link,
          source: this.linkId(link.source),
          target: this.linkId(link.target),
        }))

      return { nodes, links }
    },
    matchesSection(node) {
      if (this.sectionFilter === 'til') return node.section === 'til'
      if (this.sectionFilter === 'articles') return node.section === 'published' && !node.is_map
      if (this.sectionFilter === 'courses') return node.folder === 'courses'
      return true
    },
    linkId(endpoint) {
      return endpoint?.id || endpoint
    },
    mapLabelWidth(node) {
      return Math.max(68, Math.min(224, node.title.length * 6.6 + 20))
    },
    labelPosition(node) {
      return {
        x: 0,
        y: this.graphUtils.nodeRadius(node) + (node.is_map ? 18 : 14),
        anchor: 'middle',
      }
    },
    labelVisible(node) {
      if (node.is_map) return true
      return node.id === this.selectedId || node.id === this.hoveredNode?.id
    },
    updateLabelVisibility(scale) {
      if (!this.labelSel) return
      this.labelSel.attr('opacity', (node) => (this.labelVisible(node, scale) ? 1 : 0))
    },
    handleHover(event, node) {
      this.hoveredNode = node
      this.moveTooltip(event)

      const neighbors = this.graphUtils.neighborsOf(node.id, this.links)
      this.nodeSel?.attr('opacity', (item) => (neighbors.has(item.id) ? 1 : 0.14))
      this.labelSel?.attr('opacity', (item) => (neighbors.has(item.id) ? 1 : 0.05))
      this.labelBgSel?.attr('opacity', (item) => (neighbors.has(item.id) ? 1 : 0.04))
      this.linkSel?.attr('stroke-opacity', (link) => {
        const source = this.linkId(link.source)
        const target = this.linkId(link.target)
        return source === node.id || target === node.id ? 0.85 : 0.04
      })
      this.nodeSel
        ?.select('circle')
        .attr('stroke', (item) =>
          item.id === node.id ? this.colors.ink : item.is_map ? this.colors.coral : this.colors.border,
        )
        .attr('stroke-width', (item) => (item.id === node.id ? 2.8 : item.is_map ? 2.4 : 1.2))
    },
    moveTooltip(event) {
      const rect = this.$refs.graphMain.getBoundingClientRect()
      this.tooltip = {
        x: event.clientX - rect.left + 14,
        y: event.clientY - rect.top + 14,
      }
    },
    handleHoverOut() {
      this.hoveredNode = null
      this.applySelectionStyles()
      this.updateLabelVisibility(this.currentK)
    },
    applySelectionStyles() {
      this.nodeSel?.attr('opacity', 1)
      this.labelSel?.attr('opacity', (node) =>
        this.labelVisible(node, this.currentK) ? 1 : 0,
      )
      this.labelBgSel?.attr('opacity', 1)
      this.linkSel?.attr('stroke-opacity', (link) => {
        const source = this.nodeById[this.linkId(link.source)]
        const target = this.nodeById[this.linkId(link.target)]
        return source?.is_map || target?.is_map ? 0.38 : 0.24
      })
      this.nodeSel
        ?.select('circle')
        .attr('stroke', (node) =>
          node.id === this.selectedId
            ? this.colors.ink
            : node.is_map
              ? this.colors.coral
              : this.colors.border,
        )
        .attr('stroke-width', (node) =>
          node.id === this.selectedId ? 3 : node.is_map ? 2.4 : 1.2,
        )
    },
    clearSelection() {
      this.selectedId = null
      this.stackedNodes = []
      if (this.mode === 'local') this.mode = 'all'
      this.syncUrl()
      this.rebuild()
    },
    selectNode(id, { focus = false } = {}) {
      if (!this.nodeById[id]) {
        window.location.href = `/posts/${id}`
        return
      }

      this.selectedId = id
      this.openPost(id)

      if (focus || this.mode === 'local') {
        this.mode = 'local'
        this.depth = Math.max(1, this.depth)
        this.sectionFilter = 'all'
        this.syncUrl()
        this.rebuild()
      } else {
        this.applySelectionStyles()
      }
    },
    focusNode(id) {
      if (!id || !this.nodeById[id]) return

      this.selectedId = id
      this.mode = 'local'
      this.depth = 1
      this.sectionFilter = 'all'
      this.search = ''
      this.syncUrl()
      this.openPost(id)
      this.rebuild()
    },
    showAll() {
      this.mode = 'all'
      this.selectedId = null
      this.sectionFilter = 'all'
      this.syncUrl()
      this.rebuild()
    },
    setSectionFilter(id) {
      this.sectionFilter = id
      if (this.mode === 'local') this.mode = 'all'
      this.selectedId = null
      this.syncUrl()
      this.rebuild()
    },
    setDepth(depth) {
      this.depth = depth
      this.rebuild()
    },
    focusFirstResult() {
      if (this.searchResults.length) this.focusNode(this.searchResults[0].id)
    },
    async openPost(id) {
      const existing = this.stackedNodes.findIndex((node) => node.id === id)
      if (existing > -1) {
        const [node] = this.stackedNodes.splice(existing, 1)
        this.stackedNodes.unshift(node)
        return
      }

      const node = this.nodeById[id]
      if (!node) return

      try {
        const response = await fetch(`/data/node/${node.type || 'article'}/${encodeURIComponent(id)}`)
        if (!response.ok) throw new Error(`Node request failed: ${response.status}`)
        const data = await response.json()
        this.stackedNodes.unshift(data)
        if (this.stackedNodes.length > 5) this.stackedNodes.pop()
      } catch (error) {
        console.error('Failed to load node:', error)
      }
    },
    removeFromStack(index) {
      this.stackedNodes.splice(index, 1)
      if (index === 0) {
        this.selectedId = this.stackedNodes[0]?.id || null
        this.applySelectionStyles()
      }
    },
    zoomBy(factor) {
      if (!this.svgSel) return
      this.svgSel.transition().duration(220).call(this.zoom.scaleBy, factor)
    },
    fitToContent(animate = true) {
      const nodes = this.simulation?.nodes() || []
      if (!nodes.length) return

      const rect = this.$refs.svg?.getBoundingClientRect()
      if (rect?.width) this.width = rect.width
      if (rect?.height) this.height = rect.height

      const bounds = nodes.reduce(
        (acc, node) => ({
          minX: Math.min(acc.minX, node.x),
          maxX: Math.max(acc.maxX, node.x),
          minY: Math.min(acc.minY, node.y),
          maxY: Math.max(acc.maxY, node.y),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      )

      const padding = 74
      const contentWidth = Math.max(bounds.maxX - bounds.minX, 1)
      const contentHeight = Math.max(bounds.maxY - bounds.minY, 1)
      const scale = Math.max(
        0.25,
        Math.min(
          (this.width - padding * 2) / contentWidth,
          (this.height - padding * 2) / contentHeight,
          this.mode === 'local' ? 1.8 : 1.15,
        ),
      )

      const transform = d3.zoomIdentity
        .translate(this.width / 2, this.height / 2)
        .scale(scale)
        .translate(-(bounds.minX + bounds.maxX) / 2, -(bounds.minY + bounds.maxY) / 2)

      const target = animate
        ? this.svgSel.transition().duration(550)
        : this.svgSel

      target.call(this.zoom.transform, transform)
    },
    cssVar(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()
    },
  },
}
</script>

<style scoped>
.garden-map {
  height: calc(100dvh - 4rem);
  min-height: 620px;
  display: flex;
  flex-direction: column;
  background: var(--color-cream);
  color: var(--color-ink);
}

.panel-brand {
  padding: 0.15rem 0.15rem 1rem;
  margin-bottom: 0.9rem;
  border-bottom: 1px solid var(--color-warm-border);
}

.eyebrow {
  margin: 0 0 0.25rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-coral);
}

.panel-brand h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 2rem;
  line-height: 0.95;
  letter-spacing: -0.04em;
}

.panel-lede {
  margin: 0.45rem 0 0;
  color: var(--color-warm-muted);
  font-size: 0.75rem;
  line-height: 1.45;
}

.panel-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
  margin: 0.8rem 0 0;
}

.panel-stats div {
  padding: 0.35rem 0.4rem;
  border: 1px solid var(--color-warm-border);
  border-radius: 0.4rem;
  background: var(--color-warm-surface);
}

.panel-stats dt {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-warm-muted);
}

.panel-stats dd {
  margin: 0.08rem 0 0;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1;
}

.garden-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.garden-panel {
  width: 252px;
  flex: 0 0 252px;
  overflow-y: auto;
  padding: 1rem;
  border-right: 1px solid var(--color-warm-border);
  background: var(--color-cream);
}

.search-wrap {
  position: relative;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--color-warm-border);
  border-radius: 0.6rem;
  background: var(--color-warm-surface);
  color: var(--color-warm-muted);
}

.search-box:focus-within {
  border-color: var(--color-ink);
}

.search-box input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  font-size: 0.85rem;
}

.search-box input::-webkit-search-cancel-button {
  display: none;
}

.search-clear {
  border: 0;
  background: none;
  color: var(--color-warm-muted);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}

.search-results {
  position: absolute;
  z-index: 30;
  top: calc(100% + 0.4rem);
  left: 0;
  right: 0;
  padding: 0.35rem;
  border: 1px solid var(--color-warm-border);
  border-radius: 0.6rem;
  background: var(--color-warm-surface);
  box-shadow: 0 12px 30px color-mix(in srgb, var(--color-ink) 12%, transparent);
}

.search-result {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  width: 100%;
  padding: 0.5rem 0.55rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
}

.search-result:hover {
  background: color-mix(in srgb, var(--color-coral) 8%, transparent);
}

.search-result-title {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.25;
}

.search-result-meta {
  font-size: 0.68rem;
  color: var(--color-warm-muted);
}

.search-empty {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--color-warm-muted);
}

.panel-section {
  margin-top: 1.35rem;
}

.panel-section h2 {
  margin: 0 0 0.55rem;
  font-family: var(--font-body);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--color-warm-muted);
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 0.2rem;
  border: 1px solid var(--color-warm-border);
  border-radius: 0.55rem;
  background: var(--color-warm-surface);
}

.segmented.two-up {
  grid-template-columns: repeat(2, 1fr);
}

.segmented button {
  padding: 0.4rem 0.25rem;
  border: 0;
  border-radius: 0.35rem;
  background: transparent;
  color: var(--color-warm-muted);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.segmented button.active {
  background: var(--color-ink);
  color: var(--color-cream);
}

.segmented button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chip {
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--color-warm-border);
  border-radius: 999px;
  background: var(--color-warm-surface);
  color: var(--color-warm-muted);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.chip:hover {
  border-color: var(--color-ink);
  color: var(--color-ink);
}

.chip.active {
  border-color: var(--color-coral);
  background: color-mix(in srgb, var(--color-coral) 12%, transparent);
  color: var(--color-ink);
}

.check-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.65rem;
  font-size: 0.75rem;
  color: var(--color-warm-muted);
  cursor: pointer;
}

.check-row input {
  accent-color: var(--color-coral);
}

.map-list {
  padding-top: 1.1rem;
  border-top: 1px solid var(--color-warm-border);
}

.map-list-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.38rem 0.45rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  font-size: 0.78rem;
  text-align: left;
  cursor: pointer;
}

.map-list-item:hover,
.map-list-item.active {
  background: color-mix(in srgb, var(--color-coral) 10%, transparent);
}

.map-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--color-coral);
}

.map-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-count {
  font-size: 0.68rem;
  color: var(--color-warm-muted);
}

.legend {
  padding-top: 1.1rem;
  border-top: 1px solid var(--color-warm-border);
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.35rem;
  font-size: 0.72rem;
  color: var(--color-warm-muted);
}

.swatch {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.swatch.map { background: var(--color-coral); }
.swatch.til { background: var(--color-sky); }
.swatch.article { background: var(--color-mint); }
.swatch.course { background: var(--color-mustard); }

.map-canvas {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--color-warm-surface) 75%, transparent), transparent 62%),
    var(--color-cream);
}

.graph-layer {
  animation: garden-fade 0.28s ease both;
}

@keyframes garden-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.map-svg {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
}

.map-svg:active {
  cursor: grabbing;
}

.canvas-toolbar {
  position: absolute;
  z-index: 10;
  top: 1rem;
  right: 1rem;
  display: flex;
  overflow: hidden;
  border: 1px solid var(--color-warm-border);
  border-radius: 0.55rem;
  background: var(--color-warm-surface);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--color-ink) 6%, transparent);
}

.canvas-toolbar button {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-right: 1px solid var(--color-warm-border);
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
}

.canvas-toolbar button:last-child {
  border-right: 0;
}

.canvas-toolbar button:hover {
  background: color-mix(in srgb, var(--color-coral) 8%, transparent);
}

.local-bar {
  position: absolute;
  z-index: 10;
  top: 1rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: calc(100% - 8rem);
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--color-warm-border);
  border-radius: 0.55rem;
  background: color-mix(in srgb, var(--color-warm-surface) 92%, transparent);
  backdrop-filter: blur(8px);
}

.back-link {
  border: 0;
  background: none;
  color: var(--color-coral);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.local-title {
  overflow: hidden;
  color: var(--color-ink);
  font-size: 0.78rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.depth-toggle {
  display: flex;
  gap: 0.15rem;
  padding-left: 0.55rem;
  border-left: 1px solid var(--color-warm-border);
}

.depth-toggle button {
  padding: 0.18rem 0.4rem;
  border: 0;
  border-radius: 0.3rem;
  background: transparent;
  color: var(--color-warm-muted);
  font: inherit;
  font-size: 0.66rem;
  font-weight: 600;
  cursor: pointer;
}

.depth-toggle button.active {
  background: var(--color-ink);
  color: var(--color-cream);
}

.canvas-hint {
  position: absolute;
  right: 1rem;
  bottom: 0.8rem;
  color: var(--color-warm-muted);
  font-size: 0.65rem;
  letter-spacing: 0.02em;
  pointer-events: none;
}

.canvas-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--color-warm-muted);
  font-size: 0.9rem;
}

.graph-tooltip {
  position: absolute;
  z-index: 40;
  display: flex;
  flex-direction: column;
  max-width: 260px;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--color-warm-border);
  border-radius: 0.5rem;
  background: var(--color-warm-surface);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--color-ink) 12%, transparent);
  pointer-events: none;
}

.graph-tooltip strong {
  font-size: 0.78rem;
  line-height: 1.3;
}

.graph-tooltip span {
  margin-top: 0.15rem;
  color: color-mix(in srgb, var(--color-ink) 72%, transparent);
  font-size: 0.7rem;
}

.graph-tooltip .tooltip-maps {
  color: var(--color-coral);
}

.map-detail {
  width: min(460px, 42vw);
  flex: 0 0 min(460px, 42vw);
  overflow-y: auto;
  padding: 1rem;
  border-left: 1px solid var(--color-warm-border);
  background: var(--color-warm-surface);
}

.stack-note {
  margin-bottom: 0.6rem;
  color: var(--color-warm-muted);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.detail-card {
  padding-bottom: 1.5rem;
  animation: detail-in 0.24s ease both;
  border-bottom: 1px solid var(--color-warm-border);
}

.detail-card + .detail-card {
  margin-top: 1.25rem;
}

.detail-card.is-back {
  opacity: 0.86;
}

.detail-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.detail-kind {
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-coral) 12%, transparent);
  color: var(--color-coral);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.detail-action,
.detail-close {
  border: 1px solid var(--color-warm-border);
  border-radius: 0.35rem;
  background: transparent;
  color: var(--color-warm-muted);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.detail-action {
  padding: 0.2rem 0.45rem;
}

.detail-close {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 1rem;
  line-height: 1;
}

.detail-action:hover,
.detail-close:hover {
  border-color: var(--color-ink);
  color: var(--color-ink);
}

.detail-thought {
  color: var(--color-ink);
  font-size: 0.9rem;
  line-height: 1.65;
}

@keyframes detail-in {
  from { transform: translateY(4px); }
  to { transform: translateY(0); }
}

@media (max-width: 1100px) {
  .garden-panel {
    width: 228px;
    flex-basis: 228px;
  }

  .map-detail {
    width: min(420px, 46vw);
    flex-basis: min(420px, 46vw);
  }
}

@media (max-width: 900px) {
  .garden-map {
    height: auto;
    min-height: calc(100dvh - 4rem);
  }

  .garden-panel {
    padding: 0.85rem;
  }

  .panel-lede {
    display: none;
  }

  .garden-body {
    flex-direction: column;
  }

  .garden-panel {
    width: 100%;
    flex: 0 0 auto;
    max-height: none;
    border-right: 0;
    border-bottom: 1px solid var(--color-warm-border);
  }

  .map-list,
  .legend {
    display: none;
  }

  .map-canvas {
    height: 58vh;
    min-height: 390px;
    flex: 0 0 auto;
  }

  .map-detail {
    position: static;
    width: 100%;
    flex: 0 0 auto;
    max-height: none;
    border-top: 1px solid var(--color-warm-border);
    border-left: 0;
    box-shadow: none;
  }

  .canvas-hint {
    display: none;
  }
}

@media (max-width: 560px) {
  .local-bar {
    right: 1rem;
    max-width: none;
  }

  .local-title {
    display: none;
  }
}
</style>
