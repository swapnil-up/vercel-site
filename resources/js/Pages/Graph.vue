<template>
  <div class="graph-container">
    <div class="graph-sidebar" v-if="stackedNodes.length > 0">
      <div 
        v-for="(node, index) in stackedNodes" 
        :key="node.id"
        class="stacked-node"
        :style="{ zIndex: 1000 + index }"
      >
        <div class="node-header">
          <h3>{{ node.title }}</h3>
          <button @click="removeFromStack(index)">×</button>
        </div>
        <div class="node-content" v-html="node.content"></div>
      </div>
    </div>
    
    <div class="graph-main">
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
      simulation: null
    }
  },
  
  async mounted() {
    await this.loadGraphData();
    this.initializeGraph();
  },
  
  methods: {
    async loadGraphData() {
      try {
        const response = await fetch('/api/graph');
        const data = await response.json();
        
        this.nodes = data.nodes;
        this.links = data.connections.map(conn => ({
          source: conn.from,
          target: conn.to,
          type: conn.type,
          weight: conn.weight || 1
        }));
      } catch (error) {
        console.error('Failed to load graph data:', error);
      }
    },
    
    initializeGraph() {
      const svg = d3.select(this.$refs.svg);
      const width = 800;
      const height = 600;
      
      svg.attr('width', width).attr('height', height);
      
      // Create simulation
      this.simulation = d3.forceSimulation(this.nodes)
        .force('link', d3.forceLink(this.links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));
      
      // Create links
      const link = svg.append('g')
        .selectAll('line')
        .data(this.links)
        .join('line')
        .attr('class', 'graph-link')
        .style('stroke', '#999')
        .style('stroke-opacity', 0.6)
        .style('stroke-width', d => Math.sqrt(d.weight) * 2);
      
      // Create nodes
      const node = svg.append('g')
        .selectAll('circle')
        .data(this.nodes)
        .join('circle')
        .attr('class', 'graph-node')
        .attr('r', d => d.size || 8)
        .style('fill', d => this.getNodeColor(d.type))
        .style('stroke', '#fff')
        .style('stroke-width', 2)
        .style('cursor', 'pointer')
        .call(d3.drag()
          .on('start', this.dragStarted)
          .on('drag', this.dragged)
          .on('end', this.dragEnded))
        .on('click', this.handleNodeClick);
      
      // Add labels
      const label = svg.append('g')
        .selectAll('text')
        .data(this.nodes)
        .join('text')
        .text(d => d.title)
        .style('font-size', '12px')
        .style('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .attr('dy', d => d.size + 15);
      
      // Update positions on tick
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
      // Prevent multiple clicks
      if (event.defaultPrevented) return;
      
      try {
        let response;
        if (d.type === 'article') {
          response = await fetch(`/api/node/article/${d.id}`);
        } else if (d.type === 'thought') {
          response = await fetch(`/api/thought/${d.id.replace('thought_', '')}`);
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
      // Don't add if already in stack
      if (this.stackedNodes.find(n => n.id === nodeData.id)) return;
      
      this.stackedNodes.push(nodeData);
    },
    
    removeFromStack(index) {
      this.stackedNodes.splice(index, 1);
    },
    
    // D3 drag handlers
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
    }
  }
}
</script>

<style scoped>
.graph-container {
  display: flex;
  height: 100vh;
}

.graph-main {
  flex: 1;
}

.graph-sidebar {
  width: 400px;
  background: #f8fafc;
  border-left: 1px solid #e2e8f0;
  overflow-y: auto;
  padding: 1rem;
}

.stacked-node {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.node-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.node-header button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}

.node-content {
  padding: 1rem;
}

.graph-svg {
  width: 100%;
  height: 100%;
  background: #fafafa;
}
</style>