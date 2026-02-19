#!/bin/bash

set -e  # Exit on any error

echo "🚀 Building all Slidev presentations..."

# Clean dist directory
rm -rf dist
mkdir -p dist

# Find all markdown files except slides.md (the index)
PRESENTATIONS=$(find . -maxdepth 1 -name "*.md" ! -name "slides.md" -type f)

# Check if we have any presentations
if [ -z "$PRESENTATIONS" ]; then
    echo "⚠️  No presentation files found (*.md except slides.md)"
    exit 1
fi

# Build the index first
echo "📋 Building index (slides.md)..."
npx slidev build slides.md --out dist

# Build each presentation
for file in $PRESENTATIONS; do
    # Get filename without extension
    filename=$(basename "$file" .md)
    
    echo "📊 Building: $filename"
    
    # Build with proper base path
    npx slidev build "$file" \
        --base "/$filename/" \
        --out "dist/$filename"
    
    echo "✅ Built: $filename"
done

echo ""
echo "🎉 All presentations built successfully!"
echo ""
echo "📁 Structure:"
echo "   dist/"
echo "   ├── index.html (your index)"
for file in $PRESENTATIONS; do
    filename=$(basename "$file" .md)
    echo "   └── $filename/ (presentation)"
done
echo ""
echo "🧪 Test locally: npm run preview"