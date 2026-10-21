export function useGraphData() {
  const sectionColors = {
    til: 'var(--color-sky)',
    published: 'var(--color-mint)',
    thought: 'var(--color-mustard)',
    other: 'var(--color-warm-muted)',
  }

  function nodeColor(node) {
    if (node.is_map) return 'var(--color-coral)'
    if (node.folder === 'courses') return 'var(--color-mustard)'
    return sectionColors[node.section] || sectionColors.other
  }

  function nodeRadius(node) {
    if (node.is_map) {
      return Math.min(20, 8.5 + Math.sqrt(node.degree || 0) * 1.6)
    }

    if (!node.degree) return 3.4

    return Math.min(10.5, 3.6 + Math.sqrt(node.degree) * 1.15)
  }

  function nodeLabel(node) {
    if (node.is_map) return node.title
    return node.title
  }

  function sectionLabel(node) {
    if (node.is_map) return 'Map'
    if (node.folder === 'courses') return 'Course'
    if (node.section === 'til') return 'TIL'
    if (node.section === 'published') return 'Article'
    if (node.section === 'thought') return 'Thought'
    return 'Note'
  }

  function truncate(text, length = 32) {
    if (!text) return ''
    return text.length > length ? `${text.slice(0, length - 1)}…` : text
  }

  function neighborsOf(id, links) {
    const ids = new Set([id])

    links.forEach((link) => {
      const source = link.source?.id || link.source
      const target = link.target?.id || link.target

      if (source === id) ids.add(target)
      if (target === id) ids.add(source)
    })

    return ids
  }

  function neighborhood(id, depth, links) {
    const visited = new Set([id])
    let frontier = new Set([id])

    for (let step = 0; step < depth; step += 1) {
      const next = new Set()

      links.forEach((link) => {
        const source = link.source?.id || link.source
        const target = link.target?.id || link.target

        if (frontier.has(source) && !visited.has(target)) next.add(target)
        if (frontier.has(target) && !visited.has(source)) next.add(source)
      })

      next.forEach((nodeId) => visited.add(nodeId))
      frontier = next
    }

    return visited
  }

  function isMapNode(node) {
    return Boolean(node?.is_map)
  }

  return {
    nodeColor,
    nodeRadius,
    nodeLabel,
    sectionLabel,
    truncate,
    neighborsOf,
    neighborhood,
    isMapNode,
  }
}
