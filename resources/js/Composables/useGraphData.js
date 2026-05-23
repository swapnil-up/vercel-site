export function useGraphData() {
  function computeFolderNodes(nodes) {
    const folderMap = new Map()
    const folderLinks = []

    nodes.forEach(node => {
      if (!node.folders || node.folders.length < 2) return
      const topFolder = node.folders[node.folders.length - 1]
      if (!folderMap.has(topFolder)) {
        folderMap.set(topFolder, [])
      }
      folderMap.get(topFolder).push(node.id)
    })

    const folderNodes = []
    folderMap.forEach((nodeIds, folder) => {
      const folderNodeId = `folder:${folder}`
      folderNodes.push({
        id: folderNodeId,
        title: folder,
        type: 'folder',
        size: 14,
        tags: [folder],
      })
      nodeIds.forEach(nodeId => {
        folderLinks.push({
          source: folderNodeId,
          target: nodeId,
          type: 'folder',
          weight: 1,
        })
      })
    })

    return { folderNodes, folderLinks }
  }

  function computeTagNodes(nodes) {
    const tagMap = new Map()
    const tagLinks = []

    nodes.forEach(node => {
      if (!node.tags || node.tags.length === 0) return
      node.tags.forEach(tag => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, [])
        }
        tagMap.get(tag).push(node)
      })
    })

    const tagNodes = []
    tagMap.forEach((connectedNodes, tag) => {
      const tagNodeId = `tag:${tag}`
      let sumX = 0, sumY = 0, count = 0
      connectedNodes.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
          sumX += node.x
          sumY += node.y
          count++
        }
      })
      const cx = count > 0 ? sumX / count : 500
      const cy = count > 0 ? sumY / count : 500

      tagNodes.push({
        id: tagNodeId,
        title: tag,
        type: 'tag',
        size: 6,
        tags: [tag],
        x: cx, y: cy,
        fx: cx, fy: cy,
      })

      connectedNodes.forEach(node => {
        tagLinks.push({
          source: tagNodeId,
          target: node.id,
          type: 'tag',
          weight: 1,
        })
      })
    })

    return { tagNodes, tagLinks }
  }

  function getNodeColor(type) {
    const colors = {
      article: 'var(--color-sky)',
      thought: 'var(--color-mint)',
      prediction: 'var(--color-mustard)',
      reflection: 'var(--color-sky)',
      tag: 'var(--color-mint)',
      folder: 'var(--color-coral)',
    }
    return colors[type] || 'var(--color-warm-muted)'
  }

  function calculateNodeSize(node, links) {
    const connectionCount = links.filter(
      link => link.source.id === node.id || link.target.id === node.id
    ).length
    const baseSize = node.type === 'article' ? 8 : 5
    const sizeMultiplier = Math.min(2, 1 + connectionCount * 0.1)
    return baseSize * sizeMultiplier
  }

  function getNodeFillColor(node) {
    if (node.type === 'tag') return 'var(--color-mint)'
    if (node.type === 'folder') return 'var(--color-coral)'
    return getNodeColor(node.type)
  }

  return {
    computeFolderNodes,
    computeTagNodes,
    getNodeColor,
    calculateNodeSize,
    getNodeFillColor,
  }
}
