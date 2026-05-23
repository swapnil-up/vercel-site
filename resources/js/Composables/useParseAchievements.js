export function parseAchievements(text) {
  const lines = text.trim().split('\n')
  const result = []
  const stack = []

  for (const line of lines) {
    const match = line.match(/^(\s*)(.+)$/)
    if (!match) continue

    const indent = match[1].length
    const title = match[2].trim()

    const item = {
      title,
      children: []
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= indent) {
      stack.pop()
    }

    if (stack.length === 0) {
      result.push(item)
    } else {
      stack[stack.length - 1].item.children.push(item)
    }

    stack.push({ level: indent, item })
  }

  return result
}
