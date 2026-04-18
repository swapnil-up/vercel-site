# vercel-site

A personal blog and digital garden built with VILT stack (Vue 3 + Laravel + Inertia + Tailwind 4), deployed serverless on Vercel with SQLite database.

## Stack

- **Frontend**: Vue 3 + Inertia.js + Tailwind 4
- **Backend**: Laravel (serverless via Vercel)
- **Database**: SQLite (bundled with deployment)
- **Visualization**: D3.js for graph, Three.js for 3D

## Project Structure

```
vercel-site/
├── articles/              # Original article markdown files
├── app/                   # Laravel app
│   ├── Console/Commands/ # Artisan commands
│   └── Models/           # Eloquent models
├── database/
│   └── database.sqlite   # SQLite database
├── graph/                 # Graph data (thoughts, connections)
├── public/
│   └── achievements.txt  # Achievement tracker data
├── resources/js/
│   ├── Pages/           # Inertia pages
│   │   ├── Posts/      # Blog post pages
│   │   └── Tools/      # Tool pages
│   └── Components/     # Reusable Vue components
├── routes/web.php       # All routes
├── slides/              # Standalone presentation app (separate)
└── tech/                # Test articles
```

## Getting Started

### Prerequisites

- PHP 8.2+
- Node.js 22.x
- Composer
- SQLite support in PHP

### Setup

```bash
# Install PHP dependencies
composer install

# Install Node dependencies
npm install

# Run dev server
npm run dev
```

## Commands

### Import Posts (Primary)

Import markdown articles with YAML frontmatter:

```bash
php artisan posts:import <path>
```

**Features:**
- **Idempotent**: Safe to run multiple times - uses slug for deduplication
- **Automatic Graph Integration**: Creates graph nodes and connections automatically
- **Wikilink Processing**: Converts `[[slug]]` to internal links and creates graph edges
- **Smart Link Resolution**: Handles title-based matching and partial slug matching
- **Multi-source Support**: Import from multiple directories at once

**Graph Integration:**
- Creates nodes in the `thoughts` table for each imported post
- Creates connections in the `connections` table based on wikilinks
- Updates existing nodes when posts are modified
- Removes connections when wikilinks are removed
- Cleans up orphaned connections automatically

**Example:**
```bash
# Import from articles folder
php artisan posts:import ./articles

# Import from tech folder
php artisan posts:import ./tech

# Import from multiple sources
php artisan posts:import ./articles ./tech ./other-source
```

### Database Seeding

```bash
# Seed quotes
php artisan db:seed --class=QuotesSeeder
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with random quote |
| `/posts` | List all blog posts |
| `/posts/{slug}` | Single post view |
| `/posts/tag/{tag}` | Posts filtered by tag |
| `/graph` | Interactive knowledge graph |
| `/tracker` | Achievement tracker |
| `/about` | About page |
| `/now` | Now page (current focus) |
| `/tools/sketch` | Drawing tool |
| `/tools/whisper` | Voice transcription (WIP) |
| `/tools/emom-timer` | EMOM timer |
| `/tools/bill-splitter` | Bill splitter |
| `/tools/rantim` | Random timer |

## Features

### Blog Posts

- Markdown with YAML frontmatter
- Wikilink support: `[[slug]]` or `[[display text|slug]]`
- Tags and series support
- Draft support

### Knowledge Graph

- **Automatic Integration**: Graph nodes and edges created automatically during import
- **Rich Post Viewing**: Click any article node to view full post with tags, series navigation, and related posts
- **Interactive Features**: 
  - Hover to highlight connected nodes and links
  - Click node titles to focus while keeping connected nodes visible
  - Click tags to highlight all posts with that tag
  - Dynamic node sizing based on connection count
- **Enhanced Controls**: 
  - Adaptive zoom range (0.05x to 10x)
  - "Fit All" button restarts simulation and fits content
  - Smooth transitions and animations
- **Smart Link Handling**: 
  - Internal post links open in graph sidebar (add to stack)
  - Tag clicks highlight related nodes in the graph
  - Series navigation opens posts in sidebar
- **Data Storage**: Nodes in `thoughts` table, connections in `connections` table
- **Link Types**: Supports mentions, references, and custom connection types

### Tools

A collection of useful tools accessible via `/tools/*`:
- **Sketch**: Canvas drawing tool
- **Whisper**: Voice-to-text (planned)
- **EMOM Timer**: Interval training timer
- **Bill Splitter**: Split bills with friends
- **RanTim**: Random timer

### Achievement Tracker

Reads from `public/achievements.txt` - a plain text file with indentation-based hierarchy. Automatically displays nested achievements.

## Database Schema

### Posts Table (Primary)

```sql
posts (
    id, slug, title, content, content_html, description,
    tags (array), series, series_order, internal_links (array),
    published_date, content_updated_at, is_draft, source_path
)
```

### Legacy Tables

- `articles` - Old article storage
- `thoughts` - Graph thoughts
- `connections` - Graph connections
- `quotes` - Random quotes

## Wikilink Syntax

In your markdown files, use:

- `[[slug]]` - Link to post by slug
- `[[display text|slug]]` - Link with custom text

The import command automatically converts these to proper links.

## Deployment

Deployed on Vercel as a serverless PHP application. SQLite database is bundled with the deployment.

### vercel.json Configuration

The project uses a custom `vercel.json` that routes all requests through the Laravel index.

## Development

```bash
# Watch mode
npm run dev

# Build for production
npm run build
```

## Slides App

The `/slides` directory contains a separate presentation app. It has its own `package.json` and deploys to `slides.swapnilupadhyay.com.np`. Ignore for main site work.

## Scripts (Deprecated)

The `/scripts` directory contains legacy scripts. Use the `posts:import` command instead.

## License

MIT
