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
├── app/                   # Laravel app
│   ├── Console/Commands/ # Artisan commands
│   └── Models/           # Eloquent models
├── config/content.php     # Article source manifest
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
php artisan posts:import [paths...] [--source=<name>] [--prune] [--dry-run]
```

Run with no arguments to import every source listed in `config/content.php`.

**Features:**
- **Idempotent**: Safe to run multiple times - uses slug for deduplication
- **Configured sources**: TIL, Obsidian `published`, and Obsidian `coding notes` (publish-only)
- **Automatic Graph Integration**: Creates graph nodes and connections automatically
- **Wikilink Processing**: Converts `[[slug]]` to internal links and creates graph edges
- **Smart Link Resolution**: Handles title-based matching and partial slug matching
- **Portable source keys**: `source_path` stores `til/...` / `published/...`, never absolute paths
- **Duplicate-slug protection**: Aborts before writing if two sources claim the same slug

**Graph Integration:**
- Creates nodes in the `thoughts` table for each imported post
- Creates connections in the `connections` table based on wikilinks
- Updates existing nodes when posts are modified
- Removes connections when wikilinks are removed
- Cleans up orphaned connections automatically

**Example:**
```bash
# Import every configured source
php artisan posts:import

# Import one source
php artisan posts:import --source=til

# Ad-hoc import
php artisan posts:import ./tech

# Preview without writing
php artisan posts:import --dry-run

# Push DB-only posts into the Obsidian published folder
php artisan posts:export --db-only --dir=../obsidian-vault/published --only-missing
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
| `/graph` | Interactive digital-garden map with local backlinks |
| `/tracker` | Achievement tracker |
| `/about` | About page |
| `/now` | Now page (current focus) |
| `/tools/sketch` | Drawing tool |
| `/tools/whisper` | In-browser voice transcription via whisper.cpp WASM |
| `/tools/emom-timer` | EMOM timer |
| `/tools/bill-splitter` | Bill splitter |
| `/tools/rantim` | Random timer |

## Features

### Blog Posts

- Markdown with YAML frontmatter
- Wikilink support: `[[slug]]` or `[[display text|slug]]`
- Tags and series support
- Draft support

### Knowledge Graph / Garden Map

- **Maps of content**: `published/maps/*.md` (tagged `moc`) are graph hubs. Notes link to them with `[[Title|slug]]`.
- **Two views**: Garden (all notes, default) and Local (one node plus 1–2 hops).
- **Search and filters**: Search by title, description, or tag; filter by Maps, TIL, Articles, or Courses.
- **Backlinks**: Post pages show **Appears in** maps and **Linked from** notes, plus an **Open in graph** link.
- **Interactive features**: Hover to highlight neighbors, drag to pan, scroll to zoom, click for the reading sidebar, double-click to focus.
- **Readable defaults**: Map labels stay visible; note titles appear in ink on hover or selection. Map hubs are laid out on a stable ring in Garden view.
- **Data storage**: Nodes come from `posts` (plus `thoughts`), edges from `connections`.
- **Feed and index**: MOCs are excluded from `/feed` and shown in a separate section on `/posts`.

### Tools

A collection of useful tools accessible via `/tools/*`:
- **Sketch**: Canvas drawing tool
- **Whisper**: In-browser speech-to-text via whisper.cpp WASM — record mic or upload audio, exports TXT/JSON with or without timestamps
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
