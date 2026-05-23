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
        <button 
          @click="toggleTagEdges" 
          class="control-btn"
          :class="{ 'active': showTagEdges }"
        >
          Tags
        </button>
      </div>
      <svg ref="svg" class="graph-svg"></svg>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import GraphPostViewer from '../Components/GraphPostViewer.vue';
import { useDarkMode } from '@/Composables/useDarkMode';

export default {
  name: 'Graph',
  components: {
    GraphPostViewer
  },
  setup() {
    const { isDark } = useDarkMode();
    return { isDark };
  },
  data() {
    return {
      nodes: [],
      links: [],
      folderNodes: [],
      folderLinks: [],
      tagNodes: [],
      tagLinks: [],
      stackedNodes: [],
      simulation: null,
      zoom: null,
      svg: null,
      container: null,
      width: 0,
      height: 0,
      showTagEdges: false,
      selectedTag: null
    }
  },
  computed: {
    isDarkMode() {
      return this.isDark;
    }
  },
  watch: {
    isDarkMode() {
      this.updateGraphColors();
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
        this.computeFolderNodes();
        this.computeTagNodes();
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

      this.svg.call(this.zoom)
        .on('click', (event) => {
          // Only reset if clicking directly on svg background (not on a node)
          if (event.target.tagName === 'svg') {
            this.resetNodeHighlighting();
            this.stackedNodes = [];
          }
        });

// Force parameters — weaker charge keeps nodes closer
    const nodeCount = this.nodes.length;
    const linkDistance = Math.max(25, Math.min(70, 350 / Math.sqrt(nodeCount)));
    const chargeStrength = Math.max(-300, Math.min(-50, -15 * Math.sqrt(nodeCount)));
    const collisionRadius = Math.max(4, Math.min(12, 80 / Math.sqrt(nodeCount)));

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
        .style('stroke', this.isDarkMode ? 'var(--color-warm-muted)' : 'var(--color-warm-border)')
        .style('stroke-opacity', 0.6)
        .style('stroke-width', d => Math.sqrt(d.weight) * 2);
      
      // Folder links (hub nodes to articles)
      const folderLinkGroup = this.container.append('g')
        .attr('class', 'folder-links');
      folderLinkGroup.selectAll('line')
        .data(this.folderLinks)
        .join('line')
        .attr('class', 'folder-link')
        .style('stroke', 'var(--color-coral)')
        .style('stroke-opacity', 0.35)
        .style('stroke-width', 1.5);
      
      // Folder nodes (always visible, hub nodes)
      const folderNodeGroup = this.container.append('g')
        .attr('class', 'folder-nodes');
      
const folderNodeCircles = folderNodeGroup
        .selectAll('circle')
        .data(this.folderNodes)
        .join('circle')
        .attr('class', 'folder-node')
        .attr('r', 14)
        .style('fill', 'var(--color-coral)')
        .style('stroke', this.isDarkMode ? 'var(--color-warm-muted)' : 'var(--color-cream)')
        .style('stroke-width', 2)

      // Tag nodes
      const tagNodeGroup = this.container.append('g')
        .attr('class', 'tag-nodes');
      tagNodeGroup.selectAll('circle')
        .data(this.tagNodes)
        .join('circle')
        .attr('class', 'tag-node')
        .attr('r', 12)
        .style('fill', 'var(--color-mint)')
        .style('stroke', this.isDarkMode ? 'var(--color-warm-muted)' : 'var(--color-cream)')
        .style('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('click', this.handleTagNodeClick);
      
      const tagNodeLabels = tagNodeGroup
        .selectAll('text')
        .data(this.tagNodes)
        .join('text')
        .text(d => d.title)
        .style('font-size', '10px')
        .style('font-weight', '700')
        .style('text-anchor', 'middle')
        .style('fill', 'var(--color-ink)')
        .style('pointer-events', 'none')
        .attr('dy', 4);
      
      // Tag links (from tag nodes to article nodes)
      const tagLinkGroup = this.container.append('g')
        .attr('class', 'tag-links')
        .style('display', 'none');
      
      const tagLinkLines = tagLinkGroup
        .selectAll('line')
        .data(this.tagLinks)
        .join('line')
        .attr('class', 'tag-link')
        .style('stroke', 'var(--color-mint)')
        .style('stroke-opacity', 0.4)
        .style('stroke-width', 1.5);
      
      const node = this.container.append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(this.nodes)
        .join('circle')
        .attr('class', 'graph-node')
        .attr('r', d => this.calculateNodeSize(d))
        .style('fill', d => this.getNodeFillColor(d))
        .style('stroke', this.isDarkMode ? 'var(--color-warm-muted)' : 'var(--color-cream)')
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
.style('fill', this.isDarkMode ? 'var(--color-warm-border)' : 'var(--color-warm-muted)')
.attr('dy', d => (d.size || 8) + 15);
      
      this.simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        
// Compute folder node positions as centroid of connected articles
    const folderPositions = new Map();
    this.folderNodes.forEach(folderNode => {
      const connectedArticleIds = this.folderLinks
        .filter(l => l.source === folderNode.id)
        .map(l => l.target);
      const connectedArticles = this.nodes.filter(n => connectedArticleIds.includes(n.id));
      if (connectedArticles.length > 0) {
        const sumX = connectedArticles.reduce((sum, n) => sum + (n.x || 0), 0);
        const sumY = connectedArticles.reduce((sum, n) => sum + (n.y || 0), 0);
        folderPositions.set(folderNode.id, {
          x: sumX / connectedArticles.length,
          y: sumY / connectedArticles.length
        });
      }
    });
    
    // Update folder node circle positions
    this.container.selectAll('.folder-node')
      .attr('cx', d => {
        const pos = folderPositions.get(d.id);
        return pos ? pos.x : d.x;
      })
      .attr('cy', d => {
        const pos = folderPositions.get(d.id);
        return pos ? pos.y : d.y;
      });
    
    // Update folder node label positions
    this.container.selectAll('.folder-nodes text')
      .attr('x', d => {
        const pos = folderPositions.get(d.id);
        return pos ? pos.x : d.x;
      })
      .attr('y', d => {
        const pos = folderPositions.get(d.id);
        return pos ? pos.y : d.y;
      });
    
    // Folder links (from folder node position to article position)
    this.container.selectAll('.folder-link')
      .attr('x1', d => {
        const pos = folderPositions.get(d.source);
        return pos ? pos.x : 0;
      })
      .attr('y1', d => {
        const pos = folderPositions.get(d.source);
        return pos ? pos.y : 0;
      })
      .attr('x2', d => {
        const targetNode = this.nodes.find(n => n.id === d.target);
        return targetNode ? (targetNode.x || 0) : 0;
      })
      .attr('y2', d => {
        const targetNode = this.nodes.find(n => n.id === d.target);
        return targetNode ? (targetNode.y || 0) : 0;
      });
    
    // Compute tag node positions as centroid of connected articles
    const tagPositions = new Map();
        this.tagNodes.forEach(tagNode => {
          const connectedArticleIds = this.tagLinks
            .filter(l => l.source === tagNode.id)
            .map(l => l.target);
          const connectedArticles = this.nodes.filter(n => connectedArticleIds.includes(n.id));
          if (connectedArticles.length > 0) {
            const sumX = connectedArticles.reduce((sum, n) => sum + (n.x || 0), 0);
            const sumY = connectedArticles.reduce((sum, n) => sum + (n.y || 0), 0);
            tagPositions.set(tagNode.id, {
              x: sumX / connectedArticles.length,
              y: sumY / connectedArticles.length
            });
          }
        });
        
        // Update tag node circle positions
        this.container.selectAll('.tag-node')
          .attr('cx', d => {
            const pos = tagPositions.get(d.id);
            return pos ? pos.x : d.x;
          })
          .attr('cy', d => {
            const pos = tagPositions.get(d.id);
            return pos ? pos.y : d.y;
          });
        
        // Update tag node label positions
        this.container.selectAll('.tag-nodes text')
          .attr('x', d => {
            const pos = tagPositions.get(d.id);
            return pos ? pos.x : d.x;
          })
          .attr('y', d => {
            const pos = tagPositions.get(d.id);
            return pos ? pos.y : d.y;
          });
        
        // Tag links (from tag node position to article position)
        this.container.selectAll('.tag-link line')
          .attr('x1', d => {
            const pos = tagPositions.get(d.source);
            return pos ? pos.x : 0;
          })
          .attr('y1', d => {
            const pos = tagPositions.get(d.source);
            return pos ? pos.y : 0;
          })
          .attr('x2', d => {
            const targetNode = this.nodes.find(n => n.id === d.target);
            return targetNode ? (targetNode.x || 0) : 0;
          })
          .attr('y2', d => {
            const targetNode = this.nodes.find(n => n.id === d.target);
            return targetNode ? (targetNode.y || 0) : 0;
          });
        
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
        'article': 'var(--color-sky)',
        'thought': 'var(--color-mint)', 
        'prediction': 'var(--color-mustard)',
        'reflection': 'var(--color-sky)',
        'tag': 'var(--color-mint)',
        'folder': 'var(--color-coral)'
      };
      return colors[type] || 'var(--color-warm-muted)';
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
    
computeFolderNodes() {
      const folderMap = new Map();
      const folderLinks = [];

      // Group nodes by their last folder, only if they have a nested path (> 1 folder level)
      this.nodes.forEach(node => {
        if (!node.folders || node.folders.length < 2) return;

        // Use the last folder as the hub (e.g., "TIL" for coding notes/TIL/posts)
        const topFolder = node.folders[node.folders.length - 1];
        if (!folderMap.has(topFolder)) {
          folderMap.set(topFolder, []);
        }
        folderMap.get(topFolder).push(node.id);
      });

      // Create virtual folder nodes and links
      const folderNodes = [];
      folderMap.forEach((nodeIds, folder) => {
        const folderNodeId = `folder:${folder}`;

        folderNodes.push({
          id: folderNodeId,
          title: folder,
          type: 'folder',
          size: 14,
          tags: [folder]
        });

        nodeIds.forEach(nodeId => {
          folderLinks.push({
            source: folderNodeId,
            target: nodeId,
            type: 'folder',
            weight: 1
          });
        });
      });

      this.folderNodes = folderNodes;
      this.folderLinks = folderLinks;
    },
    
    computeTagNodes() {
      const tagMap = new Map();
      const tagLinks = [];
      
      // Group nodes by their tags
      this.nodes.forEach(node => {
        if (!node.tags || node.tags.length === 0) return;
        
        node.tags.forEach(tag => {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, []);
          }
          tagMap.get(tag).push(node);
        });
      });
      
      // Create virtual tag nodes and links, positioning at centroid of connected articles
      const tagNodes = [];
      tagMap.forEach((connectedNodes, tag) => {
        const tagNodeId = `tag:${tag}`;
        
        // Calculate centroid of all connected article nodes
        let sumX = 0, sumY = 0, count = 0;
        connectedNodes.forEach(node => {
          if (node.x !== undefined && node.y !== undefined) {
            sumX += node.x;
            sumY += node.y;
            count++;
          }
        });
        
        // Default to center if no positioned nodes found yet
        const cx = count > 0 ? sumX / count : this.width / 2;
        const cy = count > 0 ? sumY / count : this.height / 2;
        
        tagNodes.push({
          id: tagNodeId,
          title: tag,
          type: 'tag',
          size: 6,
          tags: [tag],
          x: cx,
          y: cy,
          fx: cx, // Fix position so simulation doesn't move them
          fy: cy
        });
        
        connectedNodes.forEach(node => {
          tagLinks.push({
            source: tagNodeId,
            target: node.id,
            type: 'tag',
            weight: 1
          });
        });
      });
      
      this.tagNodes = tagNodes;
      this.tagLinks = tagLinks;
    },
    
    toggleTagEdges() {
      this.showTagEdges = !this.showTagEdges;
      
      if (!this.container) return;
      
      // Show/hide tag nodes and links
      this.container.selectAll('.tag-nodes').style('display', this.showTagEdges ? 'block' : 'none');
      this.container.selectAll('.tag-links').style('display', this.showTagEdges ? 'block' : 'none');
      
      // Color regular nodes based on whether they have tags
      this.container.selectAll('.graph-node')
        .style('fill', d => this.getNodeFillColor(d));
    },
    
    getNodeFillColor(node) {
      if (node.type === 'tag') {
        return 'var(--color-mint)';
      }
      if (node.type === 'folder') {
        return 'var(--color-coral)';
      }
      return this.getNodeColor(node.type);
    },
    
    async handleNodeClick(event, d) {
      if (event.defaultPrevented) return;
      
      // If tag mode is on and it's a virtual tag node, highlight connections
      if (this.showTagEdges && d.type === 'tag') {
        this.highlightTagConnections(d);
        return;
      }
      
      // Otherwise always open (even green articles with tags open as usual)
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
    
    highlightTagConnections(node) {
      // Find all nodes connected via tag links
      const connectedIds = new Set([node.id]);
      
      this.tagLinks.forEach(link => {
        if (link.source === node.id) {
          connectedIds.add(link.target);
        } else if (link.target === node.id) {
          connectedIds.add(link.source);
        }
      });
      
      // Dim all regular nodes, highlight connected
      this.container.selectAll('.graph-node')
        .style('opacity', n => connectedIds.has(n.id) ? 1 : 0.2)
        .style('stroke-width', n => connectedIds.has(n.id) ? 4 : 2)
        .style('stroke', n => connectedIds.has(n.id) ? 'var(--color-mint)' : (this.isDarkMode ? 'var(--color-warm-muted)' : 'var(--color-cream)'));
      
      // Highlight tag links (line elements)
      this.container.selectAll('.tag-link line')
        .style('opacity', link => 
          link.source === node.id || link.target === node.id ? 1 : 0.05
        )
        .style('stroke-width', link => 
          link.source === node.id || link.target === node.id ? 2.5 : 1
        );
      
      // Highlight tag nodes
      this.container.selectAll('.tag-node')
        .style('opacity', n => n.id === node.id ? 1 : 0.3)
        .style('stroke-width', n => n.id === node.id ? 4 : 2);
      
      // Dim regular links
      this.container.selectAll('.graph-link')
        .style('opacity', 0.1);
      
      // Dim regular labels
      this.container.selectAll('.labels text')
        .style('opacity', n => connectedIds.has(n.id) ? 1 : 0.2);
    },
    
    handleTagNodeClick(event, d) {
      if (event.defaultPrevented) return;
      event.stopPropagation();
      
      // Clicking a tag node highlights its connected articles
      this.highlightTagConnections(d);
    },
    
    handleFolderNodeClick(event, d) {
      if (event.defaultPrevented) return;
      event.stopPropagation();
      
      // Clicking a folder node highlights its connected articles
      this.highlightFolderConnections(d);
    },
    
    highlightFolderConnections(node) {
      // Find all nodes connected via folder links
      const connectedIds = new Set([node.id]);
      
      this.folderLinks.forEach(link => {
        if (link.source === node.id) {
          connectedIds.add(link.target);
        } else if (link.target === node.id) {
          connectedIds.add(link.source);
        }
      });
      
      // Dim all regular nodes, highlight connected
      this.container.selectAll('.graph-node')
        .style('opacity', n => connectedIds.has(n.id) ? 1 : 0.2)
        .style('stroke-width', n => connectedIds.has(n.id) ? 4 : 2)
        .style('stroke', n => connectedIds.has(n.id) ? 'var(--color-coral)' : (this.isDarkMode ? 'var(--color-warm-muted)' : 'var(--color-cream)'));
      
      // Highlight folder links
      this.container.selectAll('.folder-link')
        .style('opacity', link =>
          link.source === node.id || link.target === node.id ? 1 : 0.05
        )
        .style('stroke-width', link =>
          link.source === node.id || link.target === node.id ? 2.5 : 1.5
        );
      
      // Highlight folder nodes
      this.container.selectAll('.folder-node')
        .style('opacity', n => n.id === node.id ? 1 : 0.3)
        .style('stroke-width', n => n.id === node.id ? 4 : 2);
      
      // Dim wikilink edges
      this.container.selectAll('.graph-link')
        .style('opacity', 0.1);
      
      // Dim tag links if visible
      if (this.showTagEdges) {
        this.container.selectAll('.tag-link line')
          .style('opacity', 0.05);
      }
      
      // Dim labels
      this.container.selectAll('.labels text')
        .style('opacity', n => connectedIds.has(n.id) ? 1 : 0.2);
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
        .style('stroke', this.isDarkMode ? 'var(--color-warm-muted)' : 'var(--color-warm-border)');
      
      this.container.selectAll('.graph-node')
        .style('stroke', this.isDarkMode ? 'var(--color-warm-muted)' : 'var(--color-cream)');
      
      this.container.selectAll('.labels text')
        .style('fill', this.isDarkMode ? 'var(--color-warm-border)' : 'var(--color-warm-muted)');
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
  background-color: var(--color-cream);
  color: var(--color-ink);
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
  background: var(--color-warm-surface);
  border: 1px solid var(--color-warm-border);
  border-radius: 0.25rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--color-ink);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.dark-mode .control-btn {
  background: var(--color-warm-surface);
  border-color: var(--color-warm-border);
  color: var(--color-ink);
}

.control-btn:hover {
  background: var(--color-cream);
  border-color: var(--color-warm-muted);
}

.dark-mode .control-btn:hover {
  background: var(--color-warm-surface);
  border-color: var(--color-coral);
}

.graph-sidebar {
  width: 50vw;
  max-width: 700px;
  min-width: 400px;
  background: var(--color-warm-surface);
  border-left: 1px solid var(--color-warm-border);
  padding: 0;
  overflow-y: auto;
  height: 100vh;
  position: relative;
}

.dark-mode .graph-sidebar {
  background: var(--color-warm-surface);
  border-left-color: var(--color-warm-border);
}

.stack-indicator {
  position: sticky;
  top: 0;
  background: var(--color-sky);
  color: var(--color-cream);
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  text-align: center;
  margin: 1rem;
  z-index: 100;
}

.dark-mode .stack-indicator {
  background: var(--color-sky);
}

.stacked-node {
  background: var(--color-warm-surface);
  border: 1px solid var(--color-warm-border);
  border-radius: 0.25rem;
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
  background: var(--color-warm-surface);
  border-color: var(--color-warm-border);
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
  border-bottom: 1px solid var(--color-warm-border);
  position: sticky;
  top: 0;
  background: inherit;
  z-index: 10;
}

.dark-mode .node-header {
  border-bottom-color: var(--color-warm-border);
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
  color: var(--color-coral);
}

.dark-mode .clickable-heading:hover {
  color: var(--color-coral);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-warm-muted);
  padding: 0.25rem;
  border-radius: 0.125rem;
  transition: all 0.2s;
}

.close-btn:hover {
  color: var(--color-ink);
  background: var(--color-warm-border);
}

.dark-mode .close-btn {
  color: var(--color-warm-muted);
}

.dark-mode .close-btn:hover {
  color: var(--color-ink);
  background: var(--color-warm-border);
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
  background: transparent;
  cursor: grab;
}

.dark-mode .graph-svg {
  background: transparent;
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

.tag-link {
  pointer-events: none;
}

.tag-toggle {
  min-width: 3.5rem;
}

.tag-toggle.active {
  background-color: var(--color-mint);
  border-color: var(--color-mint);
  color: var(--color-ink);
}

.dark-mode .tag-toggle.active {
  background-color: var(--color-mint);
  border-color: var(--color-mint);
  color: var(--color-ink);
}
</style>
