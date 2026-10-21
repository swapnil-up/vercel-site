# Dependency Report — vercel-site

Updated: 2026-10-21 (post-upgrade)

## Status

All direct npm and Composer dependencies are current. `npm outdated` and
`composer outdated --direct` return nothing.

| Check | Result |
|---|---|
| `npm audit` | 0 vulnerabilities |
| `composer audit` | 0 advisories |
| `npm run build` | passes |
| `npm test` | 61 tests pass |
| `php artisan test` | 26 tests pass |
| Local HTTP smoke test | `/`, `/posts`, `/graph`, `/tracker`, `/about`, `/now`, `/posts/tag/TIL` all 200 |
| Config/route cache | both compile and clear successfully |

## Removed

- `@xenova/transformers` — unused; source of most npm criticals.
- `lucide-react` — unused React library in a Vue app.
- `autoprefixer` — no PostCSS config; Tailwind 4 handles prefixes.
- `postcss` — no PostCSS config.
- `@tailwindcss/typography` — not registered; `.prose-content` is hand-written.
- Six stale `vendor/` packages not present in `composer.lock` (including
  `dompdf`) were removed by Composer.

## Added / moved

- Added `vue@^3.5.44` as a direct dependency. It was only present through
  hoisting before and was below the XSS-fixed version.
- Moved `@vitejs/plugin-vue` from `dependencies` to `devDependencies`.

## Major upgrades

| Package | Before | After |
|---|---:|---:|
| Laravel | 12.1.1 | 13.38.0 |
| Inertia (PHP) | 2.0.1 | 3.5.1 |
| Inertia (Vue) | 2.0.4 | 3.9.1 |
| Tinker | 2.10.1 | 3.0.2 |
| PHPUnit | 11.5.12 | 12.5.40 |
| Vite | 6.2.0 | 8.3.4 |
| `laravel-vite-plugin` | 1.2.0 | 3.2.0 |
| `@vitejs/plugin-vue` | 5.2.1 | 6.0.10 |
| Vitest | 4.1.9 | 5.0.5 |
| concurrently | 9.1.2 | 10.0.6 |
| Tailwind CSS | 4.0.12 | 4.3.3 |
| three | 0.180.0 | 0.186.1 |

Patch/minor updates also landed for Guzzle, CommonMark, Symfony, Ziggy,
Parsedown, Pail, Pint, Sail, Collision, Mockery, and Faker.

## Compatibility changes

- `config/inertia.php` was published because Inertia 3 expects page components
  under `resources/js/pages` by default. The path is now
  `resource_path('js/Pages')`.
- SSR is disabled by default in the new config (`INERTIA_SSR_ENABLED=false`).
  The site does not run an SSR service.
- PHP requirement raised to `^8.3` (required by Laravel 13 and PHPUnit 12).
  Local PHP, CI, and the Vercel runtime all use PHP 8.3.
- Vercel runtime bumped from `vercel-php@0.7.1` to `vercel-php@0.7.4`
  (PHP 8.3, modern Node autodetection).
- Node engine set to `24.x`, matching the local Node 24.8 runtime and the
  versions required by Vite 8 / Vitest 5.

## Remaining notes

- Vite warns that the `three` bundle is over 500 kB. This is pre-existing and
  not a correctness issue; split it only if load size becomes a concern.
- The Vercel deploy itself was not run locally. A preview deploy is the last
  verification step.
- `database/database.sqlite` was already modified before this upgrade; it was
  not touched by the dependency work.
