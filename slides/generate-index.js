#!/usr/bin/env node

/**
 * Automatically generate slides.md index with all presentations
 * Run this before building: node generate-index.js
 */

const fs = require('fs');
const path = require('path');

// Find all .md files except slides.md
const presentations = fs.readdirSync('.')
  .filter(file => file.endsWith('.md') && file !== 'slides.md')
  .map(file => {
    const name = path.basename(file, '.md');
    
    // Try to extract title from the markdown file
    const content = fs.readFileSync(file, 'utf-8');
    const titleMatch = content.match(/^title:\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1] : formatTitle(name);
    
    return { name, title, file };
  });

console.log('📊 Found presentations:', presentations.map(p => p.name));

// Format slug into readable title (fallback)
function formatTitle(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Generate the index markdown
const indexContent = `---
theme: seriph
background: https://source.unsplash.com/featured/?code,minimal
class: text-center
highlighter: shiki
title: Swapnil's Presentations
---

# My Presentations Library

A collection of thoughts on code and philosophy.

---

# Available Decks

${presentations.map(p => `- [${p.title}](/${p.name}/)`).join('\n')}

---
layout: center
---

Check back often for new slides.
`;

// Write to slides.md
fs.writeFileSync('slides.md', indexContent);

console.log('✅ Generated slides.md with', presentations.length, 'presentations');
console.log('📝 slides.md created/updated');