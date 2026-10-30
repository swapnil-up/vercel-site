# Dulna Jaam — immersive homepage

> Working log for the scroll-driven Kathmandu-at-dusk homepage. Update this file
> after every work block so a compacted context can resume from here.

## Concept

Replace the current `/` homepage with a scroll-driven walk through a stylized
Kathmandu at dusk. Each landmark is a real section of the site. All art is
hand-built SVG; all motion is CSS + a small JS scroll engine.

- **Name:** Dulna Jaam
- **Mascot:** Blobby, a plush lavender Kathmandu street pup (`Mascot.vue`)
- **Tech:** Vue 3 + Inertia + Tailwind 4, no new dependencies
- **Theme:** theme-aware. Light = golden hour, dark = deeper twilight.
- **Sound:** synthesized street hum + sparse chimes, off by default, HUD toggle

## The walk (stops)

| # | id | Scene | Section |
|---|----|-------|---------|
| 1 | `ghar` | Courtyard, marigolds, doorway | Intro / name |
| 2 | `chiya` | Chiya pasal, steam, stools | About |
| 3 | `writing` | Pustak / news stall | Latest posts |
| 4 | `graph` | Walled garden, floating notes | Graph teaser → `/graph` |
| 5 | `tracker` | Prayer-flag courtyard + bells | Quote wall + random quote |
| 6 | `tools` | Gadget bazaar windows | Tools → `/tools` |
| 7 | `rooftop` | Laundry, radio, water tank | Thamel rooftop + Now |
| 8 | `night` | Valley overlook, city lights | Swayambhu finale / contact |

## Architecture

- `resources/js/Pages/Index.vue` — the journey page. `defineOptions({ layout: JourneyLayout })`.
  Stops live on a horizontal world track (`width: worldWidth * 100vw`) moved by
  `--dj-camera`; each stop is a world object with its own `span`/`gap`.
- `resources/js/Layouts/JourneyLayout.vue` — minimal shell (no navbar/footer).
- `resources/js/Components/Journey/` — `Scene.vue`, `Sky.vue`, `Valley.vue`,
  `City.vue`, `Street.vue` (shared facades only — no shop signs), `Weather.vue`,
  `Foreground.vue`, `Mascot.vue`, `StopScene.vue` (per-stop SVG landmark),
  `Hud.vue`, `StopPanel.vue` (world-positioned paper with scroll-linked
  focus, crossfade and inert/accessibility gating).
- `resources/js/Components/Journey/stops/` — one component per stop.
- `resources/js/Components/Journey/StaticHome.vue` — calm vertical fallback
  (used for `?static=1` and `prefers-reduced-motion`), includes Navbar/Footer.
- `resources/js/Composables/useJourney.js` — scroll → target camera → damped
  rAF follow (`camera`, smoothed `speed`, `moving`/`running` hysteresis,
  `facing`, fractional `position`, active place), keyboard + swipe nav, deep
  links.
- `resources/js/Composables/useAmbience.js` — click-to-start Web Audio street
  hum + sparse chimes (no audio assets), HUD toggle.
- `resources/js/Utils/journeyMath.js` (+ `.test.js`) — pure math (world layout,
  camera/stop mapping, damping, gait rate, motion hysteresis, facing), Vitest.
- `resources/js/Data/journey.js` — stops (with `span`/`gap` pacing), copy,
  featured tools, quips.
- `app/Http/Controllers/HomeController.php` — latest posts, now, random quote,
  meta for `/`.
- `resources/css/app.css` — journey design tokens + shared keyframes.

### World-track engine

- Every place is one viewport wide (`span: 1`, `gap: 0`), so each landmark and
  paper slides fully across the screen while the next enters from the right.
  `journeyLayout` turns those into `x0` positions, world width and anchors.
- The camera is a damped follow: scroll sets a target, `damp()` moves toward it
  at ~60fps until settled. Dog gait, HUD position and scene progress all read
  the damped camera, never raw scroll.
- Root height is `worldWidth * 100svh`, so the walk is ~8 screens and every
  place gets roughly one screen of continuous travel.
- Each place is a 100vw frame. Papers ride the world track and fade near the
  midpoint via `panelFocus()` so they never cross the mascot lane at full
  opacity or pop on at an anchor.
- Blobby stays in a fixed screen lane (`18vw`, `20vw` on mobile) while the
  world pans under him, Yakku-style. Panels start at a `27vw` content lane so
  left/right/centre papers never sit under the dog.
- Camera speed is low-passed and drives the dog's Web Animations
  `playbackRate` (`speed / 0.45`, clamped `0.2..2.6`), so cadence follows real
  travel distance instead of moonwalking. Walk/run states and facing use
  separate enter/leave thresholds, so the dog only turns while moving.
- Legs animate as diagonal pairs (near-front with far-back), with a half-cycle
  offset; the torso bobs at twice the step rate, the tail/ears follow, and the
  run pose adds a forward lean.
- Scene depth pans at different rates (valley 8%, city 18%, street 36%,
  foreground 52%); weather speed reacts to camera velocity via `--dj-v`.

### Stop scenery

- Each stop renders one `StopScene.vue` landmark in the lower-left, ahead of its
  paper: `ghar` house, `chiya` pasal, `writing` Pustak Pasal, `graph` note
  garden, `tracker` Gumba courtyard, `tools` gadget bazaar, `rooftop` Thamel
  laundry and radio, `night` Swayambhu valley overlook.
- Landmarks are self-contained SVG groups keyed off `stop` with per-scene
  washes, small loops (steam, sway, flicker, blinking bulbs, prayer flags,
  fireflies) and a clay shadow that ties them to the street.
- Only the active stop's scene animates (`active` prop); offscreen scenes pause
  via `animation-play-state`, and reduced-motion users get the static fallback.
- Desktop places the scene at `min(54vw, 780px)` from the left with a
  `clamp(58px, 10.5vh, 136px)` bottom offset; mobile widens it to
  `min(112vw, 620px)` so the landmark still reads behind the paper.
- Material pass: every landmark now uses three-tone materials (lit/base/shade)
  from `--lm-*` tokens, SVG patterns for brick/wood/metal/paper, atmospheric
  haze + cast/contact shadows, rim light, and Newari detail (torana, lattice,
  chaitya, prayer wheels, brass fixtures, pegboard tools, tank ribs, moon and
  layered hills). All stop panels align right so the landmark keeps the left
  two-thirds of the stage.
- Motion is selective: flags wave, steam animates only on steam paths, laundry
  sways with clothespins, prayer wheels/bells/lamps loop, and offscreen scenes
  pause. Scoped CSS keyframes keep the `lm-` prefix so tests and docs can match
  them.
- Responsive QA at `1440x900`, `1024x900`, `800x900`, `721x900` and `390x844`
  in light and dark themes; mobile panels become full-width above the scene.

### Fallbacks / QA hooks

- `/?static=1` forces the vertical page.
- `prefers-reduced-motion: reduce` forces the vertical page.
- `#<stop-id>` and `?at=<stop-id>` deep-link to a stop.
- Keyboard: ← → ↑ ↓ Space Shift+Space PageUp PageDown Home End.
- Touch: swipe up/down (native scroll) or sideways (left/right) to travel.

### Layout note

`app.js` forces `AppLayout` for pages without a layout, so `Index.vue` declares a
truthy `JourneyLayout` (not `null`) to opt out. Meta/SEO still comes from the
route via `app.blade.php`.

## Progress

- [x] Plan + decisions
- [x] HomeController + route (`/` → `HomeController::class`)
- [x] journeyMath + tests (94 Vitest cases)
- [x] useJourney engine (scroll, keyboard, deep links)
- [x] JourneyLayout + Index page
- [x] Scene art (sky, valley, city, street, weather, prayer flags)
- [x] Mascot (Blobby-dog, 5 poses, quips)
- [x] HUD + stop panels + 8 stops
- [x] StaticHome fallback (`?static=1`, reduced motion, `?motion=1`)
- [x] CSS tokens + responsive polish
- [x] Build + tests + docs update
- [x] Dark-mode HUD fix (`--dj-hud-*` fixed tokens, not theme-inverting cream)
- [x] Visual QA: desktop light/dark, mobile 390×844, static fallback, deep links
- [x] Mid-city depth pass: taller skyline behind shorter street facades
- [x] Ambience toggle: synthesized hum + occasional chimes, off by default
- [x] Tracker stop shows all categories (counts include zeros, muted) — superseded by the quote wall
- [x] Fixed `Certificated` → `Certificates` in `public/achievements.txt`
- [x] World-track rework (Yakku-inspired pacing):
   - Stops are world objects with `span`/`gap`; the camera pans between them
     instead of fading fixed pages over one screen.
   - Damped camera (`damp`, rAF until settle) with velocity; first/last stops
     sit at the scroll ends and deep links target stop anchors.
   - `StopPanel` uses one-time `seen` reveal plus `here` choreography and
     staggered content; panels no longer scrub x/y/fade from scroll.
   - Dog lean and dust speed react to camera velocity; gait cadence is
     playback-rate driven.
   - New `Foreground.vue` near layer, stronger depth separation, velocity-
     reactive petal/firefly durations, longer root height for pacing.
   - HUD progress now follows fractional place position along one continuous rail.
- [x] Yakku-style mascot movement:
  - Blobby is pinned to a fixed screen lane while the world pans beneath him;
    stop papers shift to a `27vw` content lane.
  - Camera speed drives gait `playbackRate`; diagonal leg pairs, torso bob,
    tail/ear secondary motion, walk/run hysteresis and facing-at-rest.
  - Fixed-lane QA at `1440x900`, `800x900`, `721x900` and `390x844`: panels
    clear the dog and the quip bubble stays on screen.
- [x] Per-stop landmark scenery:
  - New `StopScene.vue` puts a distinct SVG landmark at every stop (house,
    chiya pasal, bookstall, note garden, gumba, gadget bazaar, rooftop, valley
    overlook) instead of reusing generic shop signs.
  - Generic awnings/signs/steam removed from `Street.vue`; shared facades,
    windows, flags and pots remain.
  - Scenes animate only while their stop is active; desktop and mobile layouts
    QA'd at all 8 stops.
  - Full art-direction pass: three-tone `--lm-*` materials, patterned brick,
    wood, metal and paper, haze/cast/contact shadows, rim light, and richer
    Newari detail across all eight landmarks. Panels all align right; the scene
    keeps the left two-thirds. Verified at 1440/1024/800/721/390 widths and in
    both themes.
- [x] Polish pass — discoverability + walking mascot:
  - Animated scroll cue ("Scroll to walk / or tap here to follow Blobby") that
    disappears once the walk starts.
  - Prominent "Next stop · <label> →" HUD pill (final stop becomes "End of the
    walk · Back to Ghar"), segmented 8-stop progress bar.
  - Scroll-linked page drift/fade, film grain, fluttering flags, window flicker,
    chiya/momo steam.
  - Keyboard ↑/↓ and horizontal swipe support; mobile hint now "swipe up to walk".
  - Stop pages are embedded in the journey rather than a separate route (the
    first cross-fade/drift version was superseded by the world-track rework).

- [x] Continuous-street pass:
  - Every place now owns a 100vw world segment (`span: 1`, `gap: 0`) so
    landmarks pass continuously instead of stacking.
  - Root height is `worldWidth * 100svh` (~8 screens); panels use scroll-linked
    `panelFocus()` crossfades and the HUD is a subtle continuous place rail.
  - Hero papers no longer pop at anchor boundaries; `seenThrough` removed.
  - Puppy redesigned as a plush lavender pup: bigger head, floppy ears, blush,
    tongue, sparkle eyes, curled tail, blink/ear-twitch/tongue idle motion.
  - `Tero` → Thamel and `Raat` → Swayambhu labels/signs.
  - Gumba achievements paper replaced by a random quote wall with an
    `exclude` query on `/data/quote/random`.
  - Tracker links removed from Navbar/Footer; `/tracker` and its sitemap entry
    remain available by direct URL.
  - Static homepage mirrors the new quote wall and names.

### Verified

- `php artisan test` — 29 passed, 168 assertions.
- `npx vitest run` — 94 passed.
- Material-pass QA: all 8 scenes at 1440×900, 1024×900, 800×900, 721×900 and
  390×844 (light/dark), no runtime errors.
- `npm run build` — succeeds (only Vite chunk-size warning).
- Screenshots captured via headless Chromium + CDP for: all 8 stop landmarks at
  1440×900, mobile scenes at 390×844, ghar, chiya, graph, night, a mid-walk gap,
  mobile tools, static home, plus keyboard travel and dog trot/gait checks.
- Note: initial headless screenshots came back blank; that was a capture
  artifact, confirmed fine via CDP `Page.captureScreenshot`.

### Remaining polish ideas

- Ambience is synthesized; consider a recorded chiya-pasal bed later if a
  pleasant, licensed clip turns up.
- Panning speeds differ per layer (valley 8%, city 18%, street 36%, foreground
  52%); check on ultrawide.
- The continuous pace is ~one screen per place; raise the 100svh multiplier if
  short viewports feel too brisk.
- Consider a recorded chiya-pasal ambience bed if a licensed clip turns up.
- `/tracker` still reads `public/achievements.txt` directly and remains available
  by URL.
