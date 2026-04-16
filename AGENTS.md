# AGENTS.md - Agent Instructions for vercel-site

This is an older personal site built with VILT stack (Vue 3 + Laravel + Inertia + Tailwind 4), deployed serverless on Vercel with SQLite database.

## Project Structure

```
vercel-site/
├── articles/           # Old article storage (markdown files with frontmatter)
├── app/
│   ├── Console/Commands/ImportPosts.php  # Primary command: posts:import
│   └── Models/Post.php                  # New post model
├── database/database.sqlite             # SQLite database
├── graph/              # Graph data (JSON files for connections/thoughts)
├── public/achievements.txt  # Tracker data source
├── resources/js/
│   ├── Pages/         # Vue pages (Components, Tools, Posts subdirs)
│   └── Composables/  # Vue composables
├── routes/web.php     # All routes
├── scripts/         # Deprecated scripts (ignore)
├── slides/          # Standalone slides app (ignore)
└── tech/            # Test articles folder
```

## Key Commands

All commands should be run from project root.

### Posts Import (Primary)
```bash
php artisan posts:import <path>
```
- **Idempotent**: Safe to run multiple times - uses slug for deduplication
- **Automatic Graph Integration**: Creates graph nodes and connections automatically
- **Wikilink Processing**: Converts `[[slug]]` to internal links and creates graph edges
- **Smart Link Resolution**: Handles title-based matching and partial slug matching
- **Multi-source Support**: Import from multiple directories at once
- **Data Updates**: Updates existing posts, nodes, and connections when files change
- **Cleanup**: Removes orphaned connections automatically
- Arguments:
  - `<path>` - Directory to scan for .md files (recursive)
  - Supports multiple import sources

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

### Import articles from a new source
```bash
php artisan posts:import ./path/to/articles
```

This will:
1. Import markdown files with frontmatter
2. Create/update posts in the database
3. Process wikilinks and create internal links
4. Create graph nodes for each post
5. Create graph connections based on wikilinks
6. Update the graph visualization automatically

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