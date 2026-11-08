# Dulna Jaam — chaptered homepage hero

> Working log for the homepage. The immersive walk is now a short, escapable
> hero above a conventional, navigable homepage. Update this file after every
> work block so a compacted context can resume from here.

## Concept

A stylized Kathmandu at dusk introduces the site, then hands off to a normal
homepage. The walk is a **feature, not the navigation**: five chapters, each a
real part of the site with a plain label and a destination link.

- **Name:** Dulna Jaam
- **Mascot:** Blobby, a plush lavender Kathmandu street pup (`Mascot.vue`)
- **Tech:** Vue 3 + Inertia + Tailwind 4 + **GSAP ScrollTrigger + Lenis**
- **Theme:** theme-aware. Light = golden hour, dark = deeper twilight.
- **Sound:** synthesized warm drone + sparse bells (no audio assets), off by
  default, navbar toggle.

## Page anatomy (`/`)

```
<Navbar>          solid sticky nav: real links + active state + ambience + theme
<HeroJourney>     pinned 100svh scene, 5 scroll-scrubbed chapters
  ├─ Scene        shared sky/valley/city/street background (parallax via --dj-p)
  ├─ StopScene    one landmark per chapter, crossfaded
  ├─ chapter paper (+ its stop component: Ghar/Writing/Graph/Tools/Night)
  ├─ Mascot       Blobby, idle/sniff/sit per chapter, clickable quips
  ├─ ChapterRail  5 labelled chapter buttons + progress fill
  ├─ ChapterMenu  "Chapters" overlay: chapter → in-hero jump + destination link
  └─ skip link    "Skip the walk ↓" → #home-content
<HomeSections>    Latest writing · Featured tools · Graph + quote · Now
<Footer>
```

Chapters (`resources/js/Data/journey.js`):

| # | id | Scene | Destination |
|---|----|-------|-------------|
| 1 | `ghar` | courtyard | About |
| 2 | `writing` | Pustak Pasal bookstall | Writing / Books |
| 3 | `graph` | Bari note garden | Graph |
| 4 | `tools` | Bazaar gadget stalls | Tools |
| 5 | `night` | Swayambhu overlook | Now |

## Architecture

- `resources/js/Pages/Index.vue` — renders `HeroJourney` + `HomeSections`. No
  custom layout: `app.js` defaults pages to `AppLayout` (Navbar + Footer), so the
  homepage now has working site navigation.
- `resources/js/Components/Home/HeroJourney.vue` — the pinned hero. Owns the
  scene stack, the chapter papers, the rail, the menu and the skip link.
  `enabled=false` (`?static=1` / reduced motion) renders it as a calm,
  non-pinned block instead of hijacking scroll.
- `resources/js/Components/Home/HomeSections.vue` — the conventional homepage
  below the hero, reusing the shared `dj-*` content styles.
- `resources/js/Components/Home/ChapterRail.vue` / `ChapterMenu.vue` — the
  legible, labelled chapter navigation (replaces the old anonymous dot rail).
- `resources/js/Composables/useScrollStory.js` — the whole motion engine:
  one Lenis instance (driven by GSAP's ticker, `autoRaf: false`) + one
  ScrollTrigger pin. Returns `activeIndex`, `progress`, `goTo/next/prev`.
  Scoped to the hero and torn down on unmount, so smooth scroll never leaks onto
  `/graph`, `/tools`, and the rest of the site.
- `resources/js/Utils/chapterProgress.js` (+ `.test.js`) — pure helpers
  (`chapterFromProgress`, `progressForChapter`, `clamp`), Vitest.
- `resources/js/Components/Journey/` — the scene art: `Scene.vue` (sky, valley,
  city, street, weather, foreground), `StopScene.vue` (per-chapter landmark),
  `Mascot.vue`, and `stops/*` (the chapter content papers).
- `resources/js/Data/journey.js` — chapters (with `scene`, `href`, `cta`), quips,
  featured tools, socials.
- `resources/js/Composables/useAmbience.js` — synthesized drone + bells.
- `app/Http/Controllers/HomeController.php` — latest posts, now, random quote,
  graph stats for `/`.
- `resources/css/app.css` — `dj-*` design tokens, `--site-nav-h`, shared content
  styles.

### How the motion works

- A single `ScrollTrigger` pins the hero for `(chapters - 1)` viewport heights,
  `scrub`, `anticipatePin`. It reports a 0..1 `progress`; the active chapter is
  `round(progress * (chapters - 1))`.
- Chapter swaps are a CSS crossfade driven by `activeIndex` (landmarks and
  papers), not scroll-scrubbed opacity — simpler and no `inert`-gated reading.
  Non-active papers are `inert`, so keyboard/tab only reaches the current one;
  the rail and menu provide navigation.
- `--dj-p` (chapter progress) drives the background's subtle parallax and the
  golden-hour → twilight sky shift. `--dj-v` is fixed at 0.
- The hero tucks under the sticky navbar via `margin-top: calc(var(--site-nav-h)
  * -1)` so the full scene (and the bottom rail) fit the viewport.
- Keyboard: ← → ↑ ↓ Space Shift+Space PageUp PageDown Home End (handled in
  `useScrollStory`, which also stops native scroll fighting Lenis).

### Fallbacks / QA hooks

- `/?static=1` forces the calm page.
- `prefers-reduced-motion: reduce` forces the calm page (no Lenis, no pin).
- `?motion=1` forces motion even under reduced-motion.
- The "Skip the walk" link and `#home-content` jump past the hero.

## Progress

- [x] Research pass: scrolljacking pitfalls (NN/g), long-scroll nav best
      practice, GSAP ScrollTrigger + Lenis patterns used by award sites.
- [x] Decision: chaptered hero + real homepage; GSAP + Lenis; keep Blobby,
      simplify art; solid sticky navbar; 5 chapters; nicer ambience.
- [x] Deps: `gsap` 3.15, `lenis` 1.3.
- [x] Data + pure helpers (`chapterProgress.js` + tests).
- [x] `useScrollStory` engine (Lenis + pin + keyboard).
- [x] `HeroJourney` + `ChapterRail` + `ChapterMenu` + `HomeSections`.
- [x] Navbar: real links + active state + ambience toggle.
- [x] Ambience rebuilt as warm drone + bells (no more noise/hiss).
- [x] Mascot decoupled from velocity math.
- [x] Retired `useJourney`, `journeyMath`, `Hud`, `StopPanel`, `StaticHome`,
      `JourneyLayout`.
- [x] Verified: 67 Vitest cases pass; `npm run build` clean; headless Chromium
      smoke test (desktop/mobile/dark/static/reduced/menu/nav/graph/keyboard)
      with **no console or page errors**.

### Verified

- `npx vitest run` — 67 passed.
- `npm run build` — succeeds (Vite chunk-size warning only).
- Headless checks: desktop 1440×900 and mobile 390×844 (rail fully visible,
  chapters crossfade, pinned), dark theme, `?static=1`, reduced-motion (no rail,
  no Lenis), Chapter menu open/close, navbar navigation + active state, `/graph`
  free of Lenis, keyboard ArrowDown advances a chapter.

### Remaining polish ideas

- The mobile rail truncates long labels ("Pustak Pas…"); consider shorter mobile
  labels or a 2-line wrap.
- Ambience is synthesized; a recorded, licensed Kathmandu-dusk bed could replace
  it later.
- Weather/foreground particles run continuously in the hero; could pause when the
  hero is off-screen.
- Consider `prefers-reduced-motion` also hiding the rail on the static page (it
  already does — the rail only renders when motion is enabled).
