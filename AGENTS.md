# AGENTS.md - Agent Instructions for vercel-site

This is a personal site built with VILT stack (Vue 3 + Laravel + Inertia + Tailwind 4), deployed serverless on Vercel with SQLite database.

## Setup

First-time setup:
```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm install
npm run dev
```

Then use `php artisan serve` or your preferred Laravel local server.

## Project Structure

```
vercel-site/
├── app/
│   ├── Console/Commands/ImportContent.php  # Import command: content:import
│   ├── Console/Commands/ExportContent.php  # Export command: content:export
│   ├── Http/Controllers/BookController.php # Books index + detail
│   └── Models/Post.php, Book.php           # Content models
├── config/content.php   # Content source manifest (posts + books)
├── database/database.sqlite             # SQLite database
├── docs/dulna-jaam.md   # Immersive homepage plan + progress log (keep updated)
├── graph/              # Graph data (JSON files for connections/thoughts)
├── posts/              # Backup-only markdown exports (gitignored, never imported)
├── public/achievements.txt  # Tracker data source
├── resources/js/
│   ├── Pages/         # Vue pages (Components, Tools, Posts, Books subdirs)
│   ├── Components/Journey/  # Scroll-scene homepage, stops, HUD, mascot
│   └── Composables/  # Vue composables
├── routes/web.php     # All routes
├── scripts/         # Deprecated scripts (ignore)
├── slides/          # Standalone slides app (ignore)
└── tech/            # Test articles folder
```

## Content Flow (read this first)

The blog "articles" on the site are rows in the `posts` table. They are **not** the `articles` table (that table belongs to the separate Nepal News pipeline and is unused by the main site). Books are a separate `books` content type with their own pages; they do not enter the knowledge graph or the posts table.

- **Source of truth**: markdown in the source folders. `config/content.php` lists every source, its portable prefix, tag, and filters. The SQLite DB is a derived artifact that is committed and bundled into the Vercel deploy.
- **Sources (Oct 2026)**:
  - `til` → `/home/swap/github/coding-problems/learning-notes/TIL` (116 posts, whole folder published)
  - `published` → `/home/swap/github/obsidian-vault/published` (whole folder published, including `maps/`)
  - `notes` → `/home/swap/github/obsidian-vault/coding notes` (future notes; only `publish: true` files import)
  - `books` → `/home/swap/github/obsidian-vault/books` (book notes; `type: books`, one markdown file per book)
- **Maps of content (MOCs)**: `published/maps/*.md` are published posts tagged `moc`. They link to notes with `[[Title|slug]]` and act as graph hubs. The graph, post pages, and Writing index treat them separately; `/feed` omits them.
- **Portable source paths**: `posts.source_path` and `books.source_path` store `til/...`, `published/...`, `notes/...`, or `books/...`, never absolute paths. The DB is valid on any device with the same sibling-repo layout.
- **Single import command**: `php artisan content:import` imports every configured source (posts and books). `--source=notes` or `--source=books` targets one. Explicit paths still work for ad-hoc post imports.
- **Flow**: edit markdown in a source folder → `php artisan content:import` → verify → commit `database/database.sqlite` → deploy. Commit the source markdown in its own repo separately.
- **DB-only posts**: `php artisan content:export --type=posts --db-only --dir=../obsidian-vault/published --only-missing` adds posts that have no canonical source to the Obsidian `published/` folder without overwriting existing files. `posts/` is backup-only.
- **Don't lose content**: `--prune` only considers rows whose portable source prefix matches the imported source(s), so importing one source cannot delete another source's posts or books.
- **Missing directory**: if a source folder is gone, `content:import` warns and skips it; the other sources still import.
- **Re-importing a source refreshes existing rows**: slug is the identity, so title/content/date/tags are overwritten from the file. Tags include the configured source tag, frontmatter tags, and subfolder names. Dates fall back to a body `Date: YYYY-MM-DD` line when frontmatter has no `date`.
- **Slug collisions abort**: the same slug coming from two sources (or hijacking another source's post) stops the import before any writes.
- **Import also rebuilds derived data**: it re-processes wikilinks for all posts and syncs `thoughts`/`connections`. Book thoughts are rendered too, but books never create graph nodes.
- **Books are separate**: `/books` lists them, `/books/{slug}` shows the note. Fields: title, author, recommendation source, thoughts, status, dates, cover URL, tags, and a JSON `stats` block for KOReader numbers. Books are omitted from `/feed`, the Writing index, the graph, and the homepage.
- **Tests**: `php artisan test --filter='ImportPostsTest|ExportPostsTest|ImportBooksTest|ExportBooksTest|BookControllerTest'` covers manifest imports, publish filtering, portable keys, collisions, scoped pruning, additive exports, and book pages.

## Multi-device workflow
```bash
git pull
php artisan content:import
php artisan test --filter='ImportPostsTest|ExportPostsTest|ImportBooksTest|ExportBooksTest|BookControllerTest'
git add database/database.sqlite
git commit -m "content: import"
git push
```
If two devices both import, the SQLite binaries cannot merge. Recovery: pull, discard the local DB change, re-run `content:import`, and commit once. Never resolve a DB conflict by hand.

## Key Commands

All commands should be run from project root.

### Content Import (Primary)
```bash
php artisan content:import [paths...] [--source=<name>] [--prune] [--dry-run]
```
- **Idempotent**: Safe to run multiple times - uses slug for deduplication
- **Configured sources**: No arguments imports every source in `config/content.php` (posts and books)
- **Source filter**: `--source=til` (repeatable) imports only the named source(s)
- **Symlink Support**: Follows symlinked directories; `.git`, `.obsidian`, `.trash`, `.stversions` are ignored
- **Publish filter**: sources with `require_publish` skip files lacking `publish: true`
- **Automatic Graph Integration**: Creates graph nodes and connections automatically
- **Wikilink Processing**: Converts `[[slug]]` to internal links and creates graph edges
- **Smart Link Resolution**: Handles title-based matching and partial slug matching
- **Data Updates**: Updates existing posts, books, nodes, and connections when files change
- **Prune Option**: `--prune` removes orphaned posts/books only within the imported source prefix(es)
- **Dry run**: `--dry-run` reports what would be imported without writing
- **Dates & Tags**: Falls back to a body `Date: YYYY-MM-DD` line; adds the configured source tag (e.g. `TIL`) and subfolder names
- **Cleanup**: Removes orphaned connections automatically
- Arguments:
  - `[paths...]` - Optional directories for ad-hoc post imports (bypasses the manifest)
  - `--source` - A configured source name from `config/content.php` (e.g. `notes`, `books`)


### Content Export
```bash
php artisan content:export [--dir=<path>] [--source=<prefix>] [--type=all] [--db-only] [--only-missing] [--dry-run]
```
- **Reverse of import**: Writes DB posts and books back to markdown files with YAML frontmatter
- **Content preserved**: Exports raw wikilink content (not HTML), preserving `[[slug]]` syntax
- **Idempotent**: Skips files that haven't changed (compares against existing content)
- **--type**: `posts`, `books`, or `all` (default). Book exports use their configured source path unless `--dir` is given
- **Default post directory**: `posts/` (backup-only, gitignored)
- **--source**: Only export rows under a portable prefix (e.g. `published`, `books`); preserves subfolders
- **--db-only**: Only export posts with no canonical source (`source_path` null or `posts/...`)
- **--only-missing**: Additive sync — never overwrites files already in the target folder
- **--dry-run**: Preview which files would be written
- **Push DB-only posts to Obsidian**: `php artisan content:export --type=posts --db-only --dir=../obsidian-vault/published --only-missing`

### Database Seeding
```bash
# Old content seeder (deprecated - seeds articles/thoughts/connections tables)
php artisan db:seed --class=ContentSeeder

# Content seeding for quotes
php artisan db:seed --class=QuotesSeeder
```

### Frontend
```bash
# Dev server with hot reload
npm run dev

# Production build
npm run build
```

## Database

- SQLite at `database/database.sqlite`
- Tables:
  - `posts` - Primary article table (use this)
  - `articles` - Old articles table (legacy)
  - `thoughts` - Graph thoughts (includes imported posts)
  - `connections` - Graph connections (auto-created from wikilinks)
  - `quotes` - Random quotes

## Routes

Key routes in `routes/web.php`:
- `/` - Immersive "Dulna Jaam" homepage (`?static=1` for the flat fallback)
- `/posts` - List all posts
- `/posts/{slug}` - Single post
- `/posts/tag/{tag}` - Posts by tag
- `/graph` - Graph visualization
- `/tracker` - Achievement tracker
- `/tools/*` - Various tools
- `/whisper` - Voice transcription (planned)

## Wikilink Syntax

In markdown, use `[[slug]]` or `[[display text|slug]]` to link between posts. The import command processes these into proper links.

## Maps of Content (MOCs)

- A MOC is a normal post in `published/maps/` with `tags: [moc, ...]`.
- Link to notes with `[[Title|slug]]`; the importer resolves the slug after the pipe.
- The graph uses MOC posts as coral hubs. A note's maps come from incoming links, so adding a MOC is enough to make a note discoverable; do not edit TIL source files.
- Post pages show **Appears in** (maps) and **Linked from** (ordinary backlinks). `/graph?node=<slug>` opens a note in the local graph.
- The Writing index shows maps in a separate section, and `/feed` excludes them.

## Tracker

The tracker at `/tracker` reads from `public/achievements.txt` - a plain text file with indentation-based hierarchy.

## Notes

- Slides app in `/slides` is separate - ignore for site work
- Scripts in `/scripts/` are deprecated
- `tech/` folder contains test articles
- Whisper tool not yet implemented
- Navbar shows: Home, WIP (posts), Graph, About, Now
- Graph visualization features:
  - Adaptive force simulation based on node count
  - Interactive hover effects highlighting connections
  - Dynamic node sizing based on connection count
  - Smart focus on clicked nodes with surrounding context
  - Enhanced zoom controls with adaptive range
  - Rich post viewing with tags, series navigation, and related posts
  - Smart link handling - internal links open in sidebar
  - Tag highlighting - click tags to highlight related nodes

## Common Tasks

### Cross-device sync workflow
```bash
# On device A: write/edit markdown, then load it into the local DB
php artisan content:import
# Commit the source markdown in its own repo, then commit database/database.sqlite here
# On device B: pull this repo — the DB already contains the content
```

### Export DB back to files (e.g., after manual DB edits)
```bash
php artisan content:export --type=posts --dir=./posts
```

### Add an article source
1. Add an entry to `config/content.php` with `path`, `prefix`, `tag`, and optional `require_publish`/`exclude`.
2. Run `php artisan content:import --source=<name>` (or just `content:import` for everything).
3. Commit `database/database.sqlite`.

### Add a book
1. Create a markdown file in `../obsidian-vault/books/` (one file per book).
2. Add frontmatter and write your thoughts in the body:
```md
---
title: The Phoenix Project
author: Gene Kim
slug: the-phoenix-project
status: finished          # want | reading | finished | abandoned
started: 2026-10-01
finished: 2026-10-14
cover: https://example.com/cover.jpg
tags: [engineering, fiction]
recommended_by: A colleague at work
stats:                    # paste from KOReader
  total_read_time: 28440  # seconds
  read_pages: 380
  total_pages: 400
  sessions: 14
  highlights: 23
  notes: 5
  reading_days: 12
---

What I thought about it.
```
3. Run `php artisan content:import --source=books`.
4. Commit `database/database.sqlite`.

### Check existing books
```bash
php artisan tinker
>>> App\Models\Book::all()
```

### Check existing posts
```bash
php artisan tinker
>>> App\Models\Post::all()
```

### Verify graph integration
```bash
php artisan tinker
>>> App\Models\Thought::count()  # Should match post count
>>> App\Models\Connection::count()  # Should show connections
```

### Add a new tool
1. Create Vue component in `resources/js/Pages/Tools/`
2. Add route in `routes/web.php`
3. Add link (optional) somewhere on site