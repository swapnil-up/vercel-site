#!/usr/bin/env node

/**
 * Automatically generate vercel.json with rewrites for all presentations
 * Run this before building: node generate-vercel-config.js
 */

const fs = require('fs');
const path = require('path');

// Find all .md files except slides.md
const presentations = fs.readdirSync('.')
  .filter(file => file.endsWith('.md') && file !== 'slides.md')
  .map(file => path.basename(file, '.md'));

console.log('📊 Found presentations:', presentations);

// Generate vercel config
const config = {
  outputDirectory: 'dist',
  cleanUrls: false,
  trailingSlash: false,
  rewrites: [
    // Add a rewrite for each presentation
    ...presentations.map(name => ({
      source: `/${name}/:path*`,
      destination: `/${name}/index.html`
    })),
    // Catch-all for the index (must be last!)
    {
      source: '/:path*',
      destination: '/index.html'
    }
  ]
};

// Write to file
fs.writeFileSync('vercel.json', JSON.stringify(config, null, 2));

console.log('✅ Generated vercel.json with', presentations.length, 'presentation rewrites');
console.log('📝 vercel.json created/updated');