# FengTech — Company Website & Free Tools

The FengTech (Sydney) company site plus three free web tools, built with
**Angular 22**:

- **Home** — who we are, what we do and how to get in touch (`/home`).
- **IP Tools** — your current public IP address and location (`/ip`).
- **Case Converter** — text conversion between 8 formats (`/texttools`).
- **Metronome** — an accurate practice metronome for musicians (`/metronome`).

---

## Prerequisites

| Tool    | Version                    | Note                          |
| ------- | -------------------------- | ----------------------------- |
| Node.js | 20.19+, 22.12+ or 24+      | Required by Angular CLI 22    |
| npm     | 11+                        |                               |

## Getting started

```bash
npm install
npm start          # dev server at http://localhost:4200
```

## Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `npm start`       | Dev server with live reload                |
| `npm run build`   | Production build → `dist/root/browser`     |
| `npm test`        | Unit tests (Vitest, 61 tests)              |
| `npm run lint`    | ESLint (angular-eslint, strict templates)  |
| `npm run format`  | Prettier write                             |
| `npm run format:check` | Prettier check (CI)                   |

## Deploy (GitHub Pages)

```bash
npm run build
npx angular-cli-ghpages --dir=dist/root/browser
```

> The site is served from the custom domain in `CNAME`
> (`www.fengtech.com.au`), so asset paths are absolute (`/assets/...`).

---

## Architecture

```
src/app/
├── app.config.ts            # Router, HTTP, i18n providers
├── app.routes.ts            # Lazy-loaded feature routes
├── app.component.*          # App shell: header/nav/footer
├── core/
│   └── services/            # Theme + document title services
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
│       └── metronome.component.*      # UI
└── shared/
    └── ui/modal/            # Reusable accessible modal
```

### Conventions

- **Standalone components** only; all feature pages are lazy-loaded.
- **Signals** for state (with `OnPush` change detection).
- **Strict TypeScript** + strict template checks (`strictTemplates`).
- **Global design tokens** in `src/styles.scss` — colours, spacing, radii,
  shadows, focus rings and the shared button system. No CSS framework.
- **Brand assets only**: the company logo variants (light/dark header,
  contact) and the photos under `assets/images/About/` used on the home
  page. The site adds its own background patterns and FontAwesome icons —
  no stock imagery.

### Colour theme

A switcher in the header offers **Light** (default), **Dark** and **Auto**
(follows the OS preference). The choice is saved in `localStorage`
(`fengtech.theme`) and applied to `<html data-theme="…">` before first paint,
so there is no flash on reload. Every page — metronome included — consumes
the same tokens.

### Metronome timing model

- A lightweight interval (25 ms) keeps clicks scheduled
  `max(0.15 s, 2.5 × step)` ahead on the **Web Audio clock**, so playback
  is sample-accurate and immune to `setInterval` jitter.
- Visual highlights are queued with their audio timestamps and flushed
  only when the clock reaches them — UI and sound stay in sync.
- Scheduled clicks belong to a transport *generation*; stop, restart and
  BPM/meter/subdivision changes bump the generation and cancel stale clips
  (no overlaps, no ghost notes).
- Background-throttled tabs re-anchor silently instead of bursting
  missed clicks.
- Mobile: optional **Wake Lock** keeps the screen on while practising,
  plus fullscreen mode.

### Metronome features

| Area            | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| BPM             | 20–300 via slider, ± buttons (long-press acceleration), direct input, tempo chips |
| Tap tempo       | Button or `T` key; averages recent taps                                  |
| Time signatures | 1/4 2/4 3/4 4/4 5/4 · 6/8 7/8 8/8 9/8 12/8                               |
| Subdivisions    | Quarter, eighth, triplet, sixteenth (per-beat grid)                      |
| Accents         | Downbeat + group accents (3+3, 3+3+2, 2+2+3, …) for x/8 meters           |
| Sounds          | Classic, woodblock, beep, pulse + master volume                          |
| Visual feedback | Beat LEDs, per-cell flash, pulse animation on the play button            |
| Patterns        | Save / overwrite / save-as / delete BPM+signature+grid presets           |
| Keyboard        | `Space` play/pause · `↑/↓` ±1 BPM · `Shift+↑/↓` ±10 BPM · `T` tap       |
| Practice timer  | Stopwatch with start / pause / reset                                     |

## Verification

See [docs/METRONOME-CHECKLIST.md](docs/METRONOME-CHECKLIST.md) for the
metronome acceptance checklist (120 BPM / 5-minute stability test, rapid
BPM/signature switching, mobile behaviour).
