# FENG TECH — Website & Tools

Company site and free web tools built with **Angular 22**:

- **Home** — company landing page (services, about, contact).
- **IP Tools** — current public IP + location lookup (`/ip`).
- **Case Converter** — text case conversion between 8 formats (`/texttools`).
- **Metronome** — sample-accurate practice metronome (`/metronome`).

---

## Prerequisites

| Tool      | Version          | Note                                        |
| --------- | ---------------- | ------------------------------------------- |
| Node.js   | >= 24.15 (or 26) | Required by Angular CLI 22                  |
| npm       | >= 11            |                                             |

## Getting started

```bash
npm install
npm start          # dev server at http://localhost:4200
```

## Scripts

| Command            | Description                                  |
| ------------------ | -------------------------------------------- |
| `npm start`        | Dev server with live reload                  |
| `npm run build`    | Production build → `dist/root/browser`       |
| `npm test`         | Unit tests (Vitest, 56 tests)                |
| `npm run lint`     | ESLint (angular-eslint, strict templates)    |
| `npm run format`   | Prettier write                               |
| `npm run format:check` | Prettier check (CI)                      |

## Deploy (GitHub Pages)

```bash
npm run build
npx angular-cli-ghpages --dir=dist/root/browser
```

> The site is served from the custom domain configured in `CNAME`
> (`www.fengtech.com.au`), so asset paths are absolute (`/assets/...`).

---

## Architecture

```
src/app/
├── app.config.ts            # Router, HTTP, i18n providers
├── app.routes.ts            # Lazy-loaded feature routes
├── app.component.*          # App shell: header/nav/footer
├── core/
│   └── services/            # Cross-cutting services (titles)
├── features/
│   ├── home/                # Landing page
│   ├── ip/                  # IP lookup (component + service)
│   ├── tools/               # Case converter (component + pure util)
│   └── metronome/           # Metronome feature
│       ├── metronome.models.ts        # Domain types & constants
│       ├── metronome.utils.ts         # Pure, unit-tested helpers
│       ├── metronome-audio.service.ts # Web Audio click synthesis
│       ├── metronome-storage.service.ts # localStorage persistence
│       ├── metronome.service.ts       # State + scheduling engine
│       └── metronome.component.*      # UI (dark instrument panel)
└── shared/
    └── ui/modal/            # Reusable accessible modal
```

### Conventions

- **Standalone components** only; all features are lazy-loaded.
- **Signals everywhere** (state, computed, effects); Angular 22's default
  `OnPush` change detection.
- **Strict TypeScript** (`strict`, `noImplicitOverride`,
  `noPropertyAccessFromIndexSignature`, …) + strict template checks.
- **ESLint** (angular-eslint) + **Prettier** enforced via `npm run lint`
  and `npm run format:check`.
- **Design tokens** in `src/styles.scss`: colors, spacing, radii,
  shadows, focus rings, button system — no CSS framework dependency.

### Metronome timing model

- A lightweight interval (25 ms) keeps clicks scheduled
  `max(0.15 s, 2.5 × step)` ahead on the **Web Audio clock**, so playback
  is sample-accurate and immune to `setInterval` jitter.
- Visual highlights are queued with their audio timestamps and flushed
  only when the clock reaches them — UI and sound stay in sync.
- Every scheduled click belongs to a transport *generation*; stop,
  restart, BPM/meter/subdivision changes bump the generation and
  hard-cancel stale clips (no overlaps, no ghost notes).
- Background-throttled tabs re-anchor silently instead of bursting
  missed clicks.
- Mobile: optional **Wake Lock** keeps the screen on while practicing,
  plus fullscreen mode.

### Metronome features

| Area              | Details                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| BPM               | 20–300 via slider, ± buttons (long-press acceleration), direct input, tempo chips |
| Tap tempo         | Button or `T` key; averages the last taps                               |
| Time signatures   | 1/4 2/4 3/4 4/4 5/4 · 6/8 7/8 8/8 9/8 12/8                             |
| Subdivisions      | Quarter, eighth, triplet, sixteenth (per-beat grid)                     |
| Accents           | Downbeat + group accents (3+3, 3+3+2, 2+2+3, …) for x/8 meters          |
| Sounds            | Classic, woodblock, beep, pulse + master volume                         |
| Visual feedback   | Beat LEDs, per-cell flash, pulse animation on the play button           |
| Patterns          | Save / overwrite / save-as / delete BPM+signature+grid presets          |
| Keyboard          | `Space` play/pause · `↑/↓` ±1 BPM · `Shift+↑/↓` ±10 BPM · `T` tap       |
| Practice timer    | Stopwatch with start / pause / reset                                    |

---

## Key changes in this release

- **Angular 21 → 22** (`@angular/*` 22.1, CLI 22.1.4, TypeScript 6.0,
  zone.js 0.16); migrated the Karma test target to **Vitest**.
- **Removed unused dependencies**: Angular Material, Angular CDK,
  @angular/animations, Bootstrap, @popperjs/core (initial bundle dropped
  from ~894 kB to ~443 kB raw, ~117 kB transferred).
- **Restructured** into `core / features / shared` with standalone
  components and `provideRouter` (no NgModules).
- **Metronome rewrite**: drift-free Web Audio scheduling, overlap-safe
  transport, background-throttle recovery, wake lock, fullscreen, tap
  tempo, triplets, 10 time signatures, 4 click sounds, volume, saved
  patterns, keyboard shortcuts.
- **Unified design system**: global tokens (color/typography/spacing/
  radius/shadow), app shell with header + footer, accessible modal,
  loading/error/empty states, `prefers-reduced-motion` support.
- **Quality gates**: ESLint + Prettier, 56 unit tests, strict templates.

## Verification

See [docs/METRONOME-CHECKLIST.md](docs/METRONOME-CHECKLIST.md) for the
metronome acceptance checklist (120 BPM / 5-minute stability test,
rapid BPM/signature switching, mobile behavior).
