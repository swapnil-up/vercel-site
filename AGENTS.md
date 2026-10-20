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
│   ├── Console/Commands/ImportPosts.php  # Import command: posts:import
│   ├── Console/Commands/ExportPosts.php  # Export command: posts:export
│   └── Models/Post.php                  # Post model
├── config/content.php   # Article source manifest (paths, prefixes, tags, filters)
├── database/database.sqlite             # SQLite database
├── graph/              # Graph data (JSON files for connections/thoughts)
├── posts/              # Backup-only markdown exports (gitignored, never imported)
├── public/achievements.txt  # Tracker data source
├── resources/js/
│   ├── Pages/         # Vue pages (Components, Tools, Posts subdirs)
│   └── Composables/  # Vue composables
├── routes/web.php     # All routes
├── scripts/         # Deprecated scripts (ignore)
├── slides/          # Standalone slides app (ignore)
└── tech/            # Test articles folder
```

## Content Flow (read this first)

The blog "articles" on the site are rows in the `posts` table. They are **not** the `articles` table (that table belongs to the separate Nepal News pipeline and is unused by the main site).

- **Source of truth**: markdown in the source folders. `config/content.php` lists every source, its portable prefix, tag, and filters. The SQLite DB is a derived artifact that is committed and bundled into the Vercel deploy.
- **Sources (Oct 2026)**:
  - `til` → `/home/swap/github/coding-problems/learning-notes/TIL` (116 posts, whole folder published)
  - `published` → `/home/swap/github/obsidian-vault/published` (32 posts, whole folder published)
  - `notes` → `/home/swap/github/obsidian-vault/coding notes` (future notes; only `publish: true` files import)
- **Portable source paths**: `posts.source_path` stores `til/...`, `published/...`, or `notes/...`, never absolute paths. The DB is valid on any device with the same sibling-repo layout.
- **Single import command**: `php artisan posts:import` imports every configured source. `--source=notes` targets one. Explicit paths still work for ad-hoc imports.
- **Flow**: edit markdown in a source folder → `php artisan posts:import` → verify → commit `database/database.sqlite` → deploy. Commit the source markdown in its own repo separately.
- **DB-only posts**: `php artisan posts:export --db-only --dir=../obsidian-vault/published --only-missing` adds posts that have no canonical source to the Obsidian `published/` folder without overwriting existing files. `posts/` is backup-only.
- **Don't lose posts**: `--prune` only considers posts whose portable source prefix matches the imported source(s), so importing one source cannot delete another source's posts.
- **Missing directory**: if a source folder is gone, `posts:import` warns and skips it; the other sources still import.
- **Re-importing a source refreshes existing rows**: slug is the identity, so title/content/date/tags are overwritten from the file. Tags include the configured source tag, frontmatter tags, and subfolder names. Dates fall back to a body `Date: YYYY-MM-DD` line when frontmatter has no `date`.
- **Slug collisions abort**: the same slug coming from two sources (or hijacking another source's post) stops the import before any writes.
- **Import also rebuilds derived data**: it re-processes wikilinks for all posts and syncs `thoughts`/`connections`.
- **Tests**: `php artisan test --filter='ImportPostsTest|ExportPostsTest'` covers manifest imports, publish filtering, portable keys, collisions, scoped pruning, and additive exports.

## Multi-device workflow
```bash
git pull
php artisan posts:import
php artisan test --filter='ImportPostsTest|ExportPostsTest'
git add database/database.sqlite
git commit -m "content: import"
git push
```
If two devices both import, the SQLite binaries cannot merge. Recovery: pull, discard the local DB change, re-run `posts:import`, and commit once. Never resolve a DB conflict by hand.

## Key Commands

All commands should be run from project root.

### Posts Import (Primary)
```bash
php artisan posts:import [paths...] [--source=<name>] [--prune] [--dry-run]
```
- **Idempotent**: Safe to run multiple times - uses slug for deduplication
- **Configured sources**: No arguments imports every source in `config/content.php`
- **Source filter**: `--source=til` (repeatable) imports only the named source(s)
- **Symlink Support**: Follows symlinked directories; `.git`, `.obsidian`, `.trash`, `.stversions` are ignored
- **Publish filter**: sources with `require_publish` skip files lacking `publish: true`
- **Automatic Graph Integration**: Creates graph nodes and connections automatically
- **Wikilink Processing**: Converts `[[slug]]` to internal links and creates graph edges
- **Smart Link Resolution**: Handles title-based matching and partial slug matching
- **Data Updates**: Updates existing posts, nodes, and connections when files change
- **Prune Option**: `--prune` removes orphaned posts only within the imported source prefix(es)
- **Dry run**: `--dry-run` reports what would be imported without writing
- **Dates & Tags**: Falls back to a body `Date: YYYY-MM-DD` line; adds the configured source tag (e.g. `TIL`) and subfolder names
- **Cleanup**: Removes orphaned connections automatically
- Arguments:
  - `[paths...]` - Optional directories for ad-hoc imports (bypasses the manifest)
  - `--source` - A configured source name from `config/content.php`


### Posts Export
```bash
php artisan posts:export [--dir=<path>] [--source=<prefix>] [--db-only] [--only-missing] [--dry-run]
```
- **Reverse of import**: Writes DB posts back to markdown files with YAML frontmatter
- **Content preserved**: Exports raw wikilink content (not HTML), preserving `[[slug]]` syntax
- **Idempotent**: Skips files that haven't changed (compares against existing content)
- **Default directory**: `posts/` (backup-only, gitignored)
- **--source**: Only export posts under a portable prefix (e.g. `published`); preserves subfolders
- **--db-only**: Only export posts with no canonical source (`source_path` null or `posts/...`)
- **--only-missing**: Additive sync — never overwrites files already in the target folder
- **--dry-run**: Preview which files would be written
- **Push DB-only posts to Obsidian**: `php artisan posts:export --db-only --dir=../obsidian-vault/published --only-missing`

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
- `/posts` - List all posts
- `/posts/{slug}` - Single post
- `/posts/tag/{tag}` - Posts by tag
- `/graph` - Graph visualization
- `/tracker` - Achievement tracker
- `/tools/*` - Various tools
- `/whisper` - Voice transcription (planned)

## Wikilink Syntax

In markdown, use `[[slug]]` or `[[display text|slug]]` to link between posts. The import command processes these into proper links.

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
php artisan posts:import
# Commit the source markdown in its own repo, then commit database/database.sqlite here
# On device B: pull this repo — the DB already contains the content
```

### Export DB back to files (e.g., after manual DB edits)
```bash
php artisan posts:export --dir=./posts
```

### Add an article source
1. Add an entry to `config/content.php` with `path`, `prefix`, `tag`, and optional `require_publish`/`exclude`.
2. Run `php artisan posts:import --source=<name>` (or just `posts:import` for everything).
3. Commit `database/database.sqlite`.

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