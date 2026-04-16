<template>
  <div class="graph-container" :class="{ 'dark-mode': isDarkMode }">
    <div class="graph-sidebar" v-if="stackedNodes.length > 0">
      <div class="stack-indicator" v-if="stackedNodes.length > 1">
        {{ stackedNodes.length - 1 }} more article{{ stackedNodes.length > 2 ? 's' : '' }} below
      </div>
      
      <div 
        v-for="(node, index) in stackedNodes" 
        :key="node.id"
        class="stacked-node"
        :class="{ 'is-short': isShortContent(node.content) }"
        :style="{ 
          zIndex: 1000 - index,
          transform: `translateY(${index * 8}px)`,
          opacity: index === 0 ? 1 : 0.95
        }"
      >
        <div class="node-header">
          <h3 @click="centerOnNode(node.id)" class="clickable-heading">{{ node.title }}</h3>
          <button @click="removeFromStack(index)" class="close-btn">×</button>
        </div>
        
        <!-- Use GraphPostViewer for article nodes -->
        <GraphPostViewer
          v-if="node.type === 'article'"
          :post="node"
          :linkedPosts="node.linkedPosts || []"
          :seriesPosts="node.seriesPosts || []"
          @open-post="handleOpenPost"
          @highlight-tag="handleHighlightTag"
        />
        
        <!-- Simple content for non-article nodes -->
        <div v-else class="node-content" v-html="node.content"></div>
        
        <div v-if="isShortContent(node.content)" class="content-spacer"></div>
      </div>
    </div>
    
    <div class="graph-main" ref="graphMain">
      <div class="graph-controls">
        <button @click="resetZoom" class="control-btn">Reset View</button>
        <button @click="zoomIn" class="control-btn">Zoom In</button>
        <button @click="zoomOut" class="control-btn">Zoom Out</button>
        <button @click="fitToContent" class="control-btn">Fit All</button>
        <button @click="toggleDarkMode" class="control-btn dark-toggle">
          {{ isDarkMode ? '☀️' : '🌙' }}
        </button>
      </div>
      <svg ref="svg" class="graph-svg"></svg>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import GraphPostViewer from '../Components/GraphPostViewer.vue';

export default {
  name: 'Graph',
  components: {
    GraphPostViewer
  },
  data() {
    return {
      nodes: [],
      links: [],
      stackedNodes: [],
      simulation: null,
      zoom: null,
      svg: null,
      container: null,
      width: 0,
      height: 0,
      isDarkMode: false
    }
  },
  
  async mounted() {
    await this.loadGraphData();
    this.initializeGraph();
    window.addEventListener('resize', this.handleResize);
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  },
  
  methods: {
    async loadGraphData() {
      try {
        const response = await fetch('/data/graph');
        const data = await response.json();
        
        this.nodes = data.nodes;
        this.links = data.connections.map(conn => ({
          source: conn.source,
          target: conn.target,
          type: conn.type,
          weight: conn.weight || 1
        }));
      } catch (error) {
        console.error('Failed to load graph data:', error);
      }
    },
    
    initializeGraph() {
      const container = this.$refs.graphMain;
      this.width = container.clientWidth;
      this.height = container.clientHeight;
      
      this.svg = d3.select(this.$refs.svg);
      this.svg
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${this.width} ${this.height}`);
      
      this.container = this.svg.append("g").attr("class", "graph-container");

      // Adaptive zoom scale based on node count
      const maxScale = Math.max(4, Math.min(10, this.nodes.length / 10));
      const minScale = Math.max(0.05, Math.min(0.1, 100 / this.nodes.length));

      this.zoom = d3.zoom()
        .scaleExtent([minScale, maxScale])
        .on("zoom", (event) => {
          this.container.attr("transform", event.transform);
        });

      this.svg.call(this.zoom);

      // Adaptive force parameters based on node count
      const nodeCount = this.nodes.length;
      const linkDistance = Math.max(30, Math.min(80, 400 / Math.sqrt(nodeCount)));
      const chargeStrength = Math.max(-800, Math.min(-100, -50 * Math.sqrt(nodeCount)));
      const collisionRadius = Math.max(5, Math.min(15, 100 / Math.sqrt(nodeCount)));

      this.simulation = d3.forceSimulation(this.nodes)
        .force('link', d3.forceLink(this.links).id(d => d.id).distance(linkDistance))
        .force('charge', d3.forceManyBody().strength(chargeStrength))
        .force('center', d3.forceCenter(this.width / 2, this.height / 2))
        .force('collision', d3.forceCollide().radius(d => (d.size || 8) + collisionRadius))
        .force('x', d3.forceX().strength(0.05)) // Add gentle x-centering force
        .force('y', d3.forceY().strength(0.05)); // Add gentle y-centering force
      
      const link = this.container.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(this.links)
        .join('line')
        .attr('class', 'graph-link')
        .style('stroke', this.isDarkMode ? '#666' : '#999')
        .style('stroke-opacity', 0.6)
        .style('stroke-width', d => Math.sqrt(d.weight) * 2);
      
      const node = this.container.append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(this.nodes)
        .join('circle')
        .attr('class', 'graph-node')
        .attr('r', d => this.calculateNodeSize(d))
        .style('fill', d => this.getNodeColor(d.type))
        .style('stroke', this.isDarkMode ? '#333' : '#fff')
        .style('stroke-width', 2)
        .style('cursor', 'pointer')
        .call(d3.drag()
          .on('start', this.dragStarted)
          .on('drag', this.dragged)
          .on('end', this.dragEnded))
        .on('click', this.handleNodeClick)
        .on('mouseover', this.handleNodeHover)
        .on('mouseout', this.handleNodeHoverOut);
      
      const label = this.container.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(this.nodes)
        .join('text')
        .text(d => d.title)
        .style('font-size', '12px')
        .style('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .style('fill', this.isDarkMode ? '#e5e7eb' : '#333')
        .attr('dy', d => (d.size || 8) + 15);
      
      this.simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        
        node
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);
        
        label
          .attr('x', d => d.x)
          .attr('y', d => d.y);
      });

      this.$nextTick(() => {
        this.fitToContent();
      });
    },

    resetZoom() {
      // Adaptive force parameters for reset
      const nodeCount = this.nodes.length;
      const linkDistance = Math.max(30, Math.min(80, 400 / Math.sqrt(nodeCount)));
      const chargeStrength = Math.max(-800, Math.min(-100, -50 * Math.sqrt(nodeCount)));
      
      this.simulation
        .force('link', d3.forceLink(this.links).id(d => d.id).distance(linkDistance))
        .force('charge', d3.forceManyBody().strength(chargeStrength));
      
      this.simulation.alpha(0.5).restart();
      
      setTimeout(() => {
        this.fitToContent();
      }, 500);
    },

    zoomIn() {
      this.svg.transition().duration(300).call(
        this.zoom.scaleBy, 1.5
      );
    },

    zoomOut() {
      this.svg.transition().duration(300).call(
        this.zoom.scaleBy, 1 / 1.5
      );
    },

    fitToContent() {
      if (this.nodes.length === 0) return;
      
      // Restart simulation with fresh parameters
      const nodeCount = this.nodes.length;
      const linkDistance = Math.max(30, Math.min(80, 400 / Math.sqrt(nodeCount)));
      const chargeStrength = Math.max(-800, Math.min(-100, -50 * Math.sqrt(nodeCount)));
      const collisionRadius = Math.max(5, Math.min(15, 100 / Math.sqrt(nodeCount)));

      this.simulation
        .force('link', d3.forceLink(this.links).id(d => d.id).distance(linkDistance))
        .force('charge', d3.forceManyBody().strength(chargeStrength))
        .force('collision', d3.forceCollide().radius(d => (d.size || 8) + collisionRadius))
        .alpha(1) // Reset alpha to restart simulation
        .restart();
      
      // Wait for simulation to settle, then fit to content
      setTimeout(() => {
        const bounds = this.nodes.reduce((acc, node) => {
          return {
            minX: Math.min(acc.minX, node.x || 0),
            maxX: Math.max(acc.maxX, node.x || 0),
            minY: Math.min(acc.minY, node.y || 0),
            maxY: Math.max(acc.maxY, node.y || 0)
          };
        }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

        const contentWidth = bounds.maxX - bounds.minX;
        const contentHeight = bounds.maxY - bounds.minY;
        
        const padding = Math.max(50, this.nodes.length * 2);
        
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;

        const scale = Math.min(
          (this.width - padding * 2) / Math.max(contentWidth, 100),
          (this.height - padding * 2) / Math.max(contentHeight, 100),
          1
        );

        const transform = d3.zoomIdentity
          .translate(this.width / 2, this.height / 2)
          .scale(scale)
          .translate(-centerX, -centerY);

        this.svg.transition()
          .duration(750)
          .call(this.zoom.transform, transform);
      }, 1000); // Wait 1 second for simulation to settle
    },

    handleResize() {
      const container = this.$refs.graphMain;
      this.width = container.clientWidth;
      this.height = container.clientHeight;
      
      this.svg.attr('viewBox', `0 0 ${this.width} ${this.height}`);
      
      this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
      this.simulation.alpha(0.3).restart();
    },
    
    getNodeColor(type) {
      const colors = {
        'article': '#3b82f6',
        'thought': '#10b981', 
        'prediction': '#f59e0b',
        'reflection': '#8b5cf6'
      };
      return colors[type] || '#6b7280';
    },
    
    calculateNodeSize(node) {
      // Calculate node size based on connections and type
      const connectionCount = this.links.filter(
        link => link.source.id === node.id || link.target.id === node.id
      ).length;
      
      const baseSize = node.type === 'article' ? 8 : 5;
      const sizeMultiplier = Math.min(2, 1 + connectionCount * 0.1);
      
      return baseSize * sizeMultiplier;
    },
    
    async handleNodeClick(event, d) {
      if (event.defaultPrevented) return;
      
      try {
        let response;
        if (d.type === 'article') {
          response = await fetch(`/data/node/article/${d.id}`);
        } else if (d.type === 'thought') {
          response = await fetch(`/data/node/thought/${d.id.replace('thought_', '')}`);
        }
        
        if (response && response.ok) {
          const nodeData = await response.json();
          this.addToStack(nodeData);
        }
      } catch (error) {
        console.error('Failed to load node:', error);
      }
    },

    handleNodeHover(event, d) {
      // Highlight connected nodes and links
      const connectedNodeIds = new Set([d.id]);
      const connectedLinkIndices = new Set();

      this.links.forEach((link, index) => {
        if (link.source.id === d.id || link.target.id === d.id) {
          connectedLinkIndices.add(index);
          connectedNodeIds.add(link.source.id);
          connectedNodeIds.add(link.target.id);
        }
      });

      // Dim all nodes and links first
      this.container.selectAll('.graph-node')
        .style('opacity', 0.3);
      
      this.container.selectAll('.graph-link')
        .style('opacity', 0.1);

      // Highlight connected nodes and links
      this.container.selectAll('.graph-node')
        .filter(node => connectedNodeIds.has(node.id))
        .style('opacity', 1)
        .style('stroke-width', 4);

      this.container.selectAll('.graph-link')
        .filter((link, index) => connectedLinkIndices.has(index))
        .style('opacity', 1)
        .style('stroke-width', d => Math.sqrt(d.weight) * 3);
    },

    handleNodeHoverOut() {
      // Reset all nodes and links to normal
      this.container.selectAll('.graph-node')
        .style('opacity', 1)
        .style('stroke-width', 2);

      this.container.selectAll('.graph-link')
        .style('opacity', 0.6)
        .style('stroke-width', d => Math.sqrt(d.weight) * 2);
    },
    
    addToStack(nodeData) {
      if (this.stackedNodes.find(n => n.id === nodeData.id)) return;
      
      this.stackedNodes.unshift(nodeData);
    },
    
    centerOnNode(nodeId) {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return;

      // Find connected nodes to keep in view
      const connectedNodeIds = new Set([nodeId]);
      this.links.forEach(link => {
        if (link.source.id === nodeId) connectedNodeIds.add(link.target.id);
        if (link.target.id === nodeId) connectedNodeIds.add(link.source.id);
      });

      const connectedNodes = this.nodes.filter(n => connectedNodeIds.has(n.id));
      
      // Calculate bounds of connected nodes
      const bounds = connectedNodes.reduce((acc, n) => {
        return {
          minX: Math.min(acc.minX, n.x || 0),
          maxX: Math.max(acc.maxX, n.x || 0),
          minY: Math.min(acc.minY, n.y || 0),
          maxY: Math.max(acc.maxY, n.y || 0)
        };
      }, { minX: node.x, maxX: node.x, minY: node.y, maxY: node.y });

      const contentWidth = bounds.maxX - bounds.minX;
      const contentHeight = bounds.maxY - bounds.minY;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      // Calculate scale to show connected nodes with some context
      const padding = 100;
      const scale = Math.min(
        (this.width - padding * 2) / Math.max(contentWidth, 100),
        (this.height - padding * 2) / Math.max(contentHeight, 100),
        2 // Allow zooming in up to 2x for focus
      );

      const transform = d3.zoomIdentity
        .translate(this.width / 2, this.height / 2)
        .scale(scale)
        .translate(-centerX, -centerY);

      this.svg.transition()
        .duration(750)
        .call(this.zoom.transform, transform);
    },
    
    removeFromStack(index) {
      this.stackedNodes.splice(index, 1);
    },
    
    dragStarted(event, d) {
      if (!event.active) this.simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    },
    
    dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    },
    
    dragEnded(event, d) {
      if (!event.active) this.simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    },
    
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
      this.updateGraphColors();
    },

    async handleOpenPost(slug) {
      try {
        const response = await fetch(`/data/node/article/${slug}`);
        if (response && response.ok) {
          const nodeData = await response.json();
          this.addToStack(nodeData);
        }
      } catch (error) {
        console.error('Failed to load post:', error);
      }
    },

    handleHighlightTag(tag) {
      // Find all nodes with the specified tag
      const taggedNodeIds = new Set();
      this.nodes.forEach(node => {
        if (node.tags && Array.isArray(node.tags) && node.tags.includes(tag)) {
          taggedNodeIds.add(node.id);
        }
      });

      if (taggedNodeIds.size === 0) {
        // No nodes found with this tag, reset highlighting
        this.resetNodeHighlighting();
        return;
      }

      // Highlight nodes with the tag and dim others
      this.container.selectAll('.graph-node')
        .style('opacity', node => taggedNodeIds.has(node.id) ? 1 : 0.2)
        .style('stroke-width', node => taggedNodeIds.has(node.id) ? 4 : 2);

      // Highlight links between tagged nodes
      this.container.selectAll('.graph-link')
        .style('opacity', link => 
          (taggedNodeIds.has(link.source.id) && taggedNodeIds.has(link.target.id)) ? 1 : 0.1
        )
        .style('stroke-width', link => 
          (taggedNodeIds.has(link.source.id) && taggedNodeIds.has(link.target.id)) ? 
          Math.sqrt(link.weight) * 3 : Math.sqrt(link.weight) * 2
        );

      // Highlight labels for tagged nodes
      this.container.selectAll('.labels text')
        .style('opacity', node => taggedNodeIds.has(node.id) ? 1 : 0.2);

      // Show a message about the highlighting
      this.$nextTick(() => {
        const message = `Found ${taggedNodeIds.size} posts with tag "${tag}"`;
        console.log(message);
      });
    },

    resetNodeHighlighting() {
      this.container.selectAll('.graph-node')
        .style('opacity', 1)
        .style('stroke-width', 2);

      this.container.selectAll('.graph-link')
        .style('opacity', 0.6)
        .style('stroke-width', d => Math.sqrt(d.weight) * 2);

      this.container.selectAll('.labels text')
        .style('opacity', 1);
    },

    isShortContent(content) {
      const textLength = content ? content.replace(/<[^>]*>/g, '').length : 0;
      return textLength < 200;
    },

    updateGraphColors() {
      if (!this.container) return;
      
      this.container.selectAll('.graph-link')
        .style('stroke', this.isDarkMode ? '#666' : '#999');
      
      this.container.selectAll('.graph-node')
        .style('stroke', this.isDarkMode ? '#333' : '#fff');
      
      this.container.selectAll('.labels text')
        .style('fill', this.isDarkMode ? '#e5e7eb' : '#333');
    }
  }
}
</script>

<style scoped>
.graph-container {
  display: flex;
  height: 100vh;
  transition: background-color 0.3s ease;
}

.graph-container.dark-mode {
  background-color: #1f2937;
  color: #e5e7eb;
}

.graph-main {
  flex: 1;
  position: relative;
  min-height: 0;
}

.graph-controls {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 10;
  display: flex;
  gap: 0.5rem;
}

.control-btn {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.dark-mode .control-btn {
  background: #374151;
  border-color: #4b5563;
  color: #e5e7eb;
}

.control-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.dark-mode .control-btn:hover {
  background: #4b5563;
  border-color: #6b7280;
}

.dark-toggle {
  min-width: 2.5rem;
}

.graph-sidebar {
  width: 50vw;
  max-width: 700px;
  min-width: 400px;
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
  padding: 0;
  overflow-y: auto;
  height: 100vh;
  position: relative;
}

.dark-mode .graph-sidebar {
  background: #111827;
  border-left-color: #374151;
}

.stack-indicator {
  position: sticky;
  top: 0;
  background: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  text-align: center;
  margin: 1rem;
  z-index: 100;
}

.dark-mode .stack-indicator {
  background: #1d4ed8;
}

.stacked-node {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  margin: 0 1rem 1rem 1rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  position: relative;
  transition: all 0.3s ease;
  max-height: calc(100vh - 8rem);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.dark-mode .stacked-node {
  background: #1f2937;
  border-color: #374151;
}

.stacked-node.is-short {
  height: auto;
  min-height: 300px;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  background: inherit;
  z-index: 10;
}

.dark-mode .node-header {
  border-bottom-color: #374151;
}

.node-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.node-header h3.clickable-heading {
  cursor: pointer;
}

.clickable-heading {
  cursor: pointer;
  transition: color 0.2s ease;
}

.clickable-heading:hover {
  color: #3b82f6;
}

.dark-mode .clickable-heading:hover {
  color: #60a5fa;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  color: #374151;
  background: #f3f4f6;
}

.dark-mode .close-btn {
  color: #9ca3af;
}

.dark-mode .close-btn:hover {
  color: #e5e7eb;
  background: #374151;
}

.node-content {
  padding: 0;
  line-height: 1.6;
  flex: 1;
  overflow-y: auto;
}

.content-spacer {
  height: 200px;
}

.graph-svg {
  width: 100%;
  height: 100%;
  background: #fafafa;
  cursor: grab;
}

.dark-mode .graph-svg {
  background: #0f172a;
}

.graph-svg:active {
  cursor: grabbing;
}

.graph-node:hover {
  stroke-width: 3px;
  filter: brightness(1.1);
}

.graph-link {
  transition: stroke-opacity 0.2s;
}
</style>
