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
        <div class="node-content" v-html="node.content"></div>
        <div v-if="isShortContent(node.content)" class="content-spacer"></div>
      </div>
    </div>
    
    <div class="graph-main" ref="graphMain">
      <div class="graph-controls">
        <button @click="resetZoom" class="control-btn">Reset View</button>
        <button @click="zoomIn" class="control-btn">Zoom In</button>
        <button @click="zoomOut" class="control-btn">Zoom Out</button>
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

export default {
  name: 'Graph',
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

      this.zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
          this.container.attr("transform", event.transform);
        });

      this.svg.call(this.zoom);

      this.simulation = d3.forceSimulation(this.nodes)
        .force('link', d3.forceLink(this.links).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(this.width / 2, this.height / 2))
        .force('collision', d3.forceCollide().radius(d => (d.size || 8) + 3));
      
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
        .attr('r', d => d.size || 8)
        .style('fill', d => this.getNodeColor(d.type))
        .style('stroke', this.isDarkMode ? '#333' : '#fff')
        .style('stroke-width', 2)
        .style('cursor', 'pointer')
        .call(d3.drag()
          .on('start', this.dragStarted)
          .on('drag', this.dragged)
          .on('end', this.dragEnded))
        .on('click', this.handleNodeClick);
      
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
      this.simulation
        .force('link', d3.forceLink(this.links).id(d => d.id).distance(60))
        .force('charge', d3.forceManyBody().strength(-150));
      
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
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      const scale = Math.min(
        (this.width * 0.8) / contentWidth,
        (this.height * 0.8) / contentHeight,
        1
      );

      const transform = d3.zoomIdentity
        .translate(this.width / 2, this.height / 2)
        .scale(scale)
        .translate(-centerX, -centerY);

      this.svg.call(this.zoom.transform, transform);
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
    
    addToStack(nodeData) {
      if (this.stackedNodes.find(n => n.id === nodeData.id)) return;
      
      this.stackedNodes.unshift(nodeData);
    },
    
    centerOnNode(nodeId) {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return;

      const transform = d3.zoomIdentity
        .translate(this.width / 2, this.height / 2)
        .scale(1)
        .translate(-node.x, -node.y);

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
  width: 60vw;
  max-width: 800px;
  min-width: 500px;
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
  padding: 1rem;
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
  margin-bottom: 1rem;
  z-index: 100;
}

.dark-mode .stack-indicator {
  background: #1d4ed8;
}

.stacked-node {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  margin-bottom: 1rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  position: relative;
  transition: all 0.3s ease;
  height: calc(100vh - 8rem);
  overflow-y: auto;
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
  padding: 1rem;
  line-height: 1.6;
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
