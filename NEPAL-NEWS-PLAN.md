# Nepal News AI Aggregator

## Overview

A public news aggregator at `/nepal-news` that scrapes English-language Nepali news sources daily, processes them with AI (Groq free tier), and serves a browsable archive.

## Current Status

✅ **Working:**
- KPost RSS scraping (40 articles fetched)
- Groq AI processing (summarize, categorize, extract entities/keywords)
- `articles` table with enriched data
- Routes: `/nepal-news`, `/nepal-news/{id}`, `/nepal-news/api`
- Vue frontend pages (Index.vue, Show.vue)
- Vercel cron config (`/api/nepal-news/cron` at 00:15 UTC daily)
- Rate limit handling with retry + exponential backoff

⚠️ **Deferred:**
- THT RSS — blocked by Cloudflare anti-bot
- myRepublica — RSS blocked by CloudFront (403), HTML scraping deferred
- Adding more sources (e.g., Republica, Setopati) in future

## Architecture

```
Vercel Cron (daily 6am NPT = 00:15 UTC)
       │
       ▼
php artisan nepal:scrape
       │
       ├── Parse RSS (KPost) → SimpleXML
       ├── Dedup by URL
       │
       ▼
   SQLite: articles table (raw)
       │
       ▼
php artisan nepal:process
       │
       ├── Groq compound-mini: summarize + categorize + extract
       ├── 2s sleep between calls (rate limit safety)
       ├── Retry up to 3x on rate limit errors
       │
       ▼
   SQLite: articles table (enriched)
       │
       ▼
Routes: /nepal-news (public page)
```

## Database Schema

```sql
CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    source_url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    body TEXT,
    published_at DATETIME,
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- AI-enriched
    summary TEXT,
    category TEXT,          -- politics|business|sports|culture|health|technology|world|other
    sentiment TEXT,         -- positive|negative|neutral|mixed
    entities_json TEXT,     -- JSON array of {type, name}
    keywords_json TEXT,     -- JSON array of strings
    importance_score INTEGER, -- 1-10
    processed_at DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Commands

### `nepal:scrape`
```bash
php artisan nepal:scrape
```
- Fetches KPost RSS feed via SimpleXML
- Deduplicates by `source_url`
- Stores raw articles in `articles` table

### `nepal:process`
```bash
php artisan nepal:process [--limit=50]
```
- Queries unprocessed articles
- For each, calls Groq API (`groq/compound-mini`) for:
  - 150-word summary
  - Category classification
  - Sentiment analysis
  - Entity extraction (people, orgs, locations)
  - Keyword extraction (3-8)
  - Importance scoring (1-10)
- Retries up to 3x on rate limit errors with exponential backoff
- 2s sleep between successful calls

## Groq Free Tier

| Metric | Limit | Used (daily) |
|---|---|---|
| Requests/day | varies | ~40 |
| Tokens/day | 500,000 | ~80,000 |
| TPM | 8,000-12,000 | managed via 2s sleep |

## Routes

- `GET /nepal-news` — Card grid with category/source/date filters
- `GET /nepal-news/{id}` — Article detail with AI summary
- `GET /nepal-news/api` — JSON API for programmatic access

## Cron Endpoint

`/api/nepal-news/cron` → runs `nepal:scrape` + `nepal:process`

Schedule: `15 0 * * *` (00:15 UTC = 06:00 NPT)

Requires `CRON_SECRET` env var for authentication.

## Files

### Created
- `database/migrations/2026_08_25_000001_create_articles_table.php`
- `app/Models/Article.php`
- `app/Console/Commands/NepalScrape.php`
- `app/Console/Commands/NepalProcess.php`
- `app/Http/Controllers/NepalNewsController.php`
- `resources/js/Pages/NepalNews/Index.vue`
- `resources/js/Pages/NepalNews/Show.vue`
- `api/nepal-news-cron.php`

### Modified
- `routes/web.php` — added Nepal news routes
- `vercel.json` — added cron config + cron function route
- `.env.example` — added `GROQ_API_KEY`

## To Deploy

1. Set `GROQ_API_KEY` in Vercel environment variables
2. Set `CRON_SECRET` in Vercel environment variables
3. Commit and push
4. Vercel will automatically set up the daily cron job

## Dependencies

No new packages — uses PHP's built-in `SimpleXML` and Laravel's `Http` facade.
