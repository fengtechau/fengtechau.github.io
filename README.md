# FengTech — Company Website & Free Tools

The FengTech (Sydney) company site plus three free web tools, built with
**Angular 22**:

- **Home** — landing page: hero + stats, "why choose us", free tools and a
  contact call-to-action (`/home`).
- **Services** — six offerings (web, AI, data, cloud, computers, support)
  with imagery + the four-step "how we work" (`/services`).
- **About** — company story and FAQs (`/about`).
- **Contact** — email, phone and how to reach us (`/contact`).
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
| `npm test`        | Unit tests (Vitest, 80 tests)              |
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
│   ├── home/                # Landing page (hero, why, tools, CTA)
│   ├── services/            # Six services + how-we-work
│   ├── about/               # Company story + FAQ
│   ├── contact/             # Contact details
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
- **Brand assets + free stock imagery**: the company logo variants
  (light/dark header, contact) and the photos under `assets/images/About/`
  are local; the service / "why us" / "how we work" sections use free
  [Pexels](https://www.pexels.com) photos hot-linked from `images.pexels.com`
  (free for commercial use, no attribution required).

### Colour theme

A switcher in the header offers **Light** (default), **Dark** and **Auto**.
**Auto** follows the day/night cycle in the *browser's time zone* (06:00–18:00
light, otherwise dark) instead of the OS preference, and falls back to
`prefers-color-scheme` when the local hour can't be resolved. The choice is
saved in `localStorage` (`fengtech.theme`) and applied to
`<html data-theme="…">` before first paint, so there is no flash on reload.
An open tab re-checks the time every minute (and on tab focus) so it flips at
dawn/dusk. Every page — metronome included — consumes the same tokens.

### Language

The default UI language follows the browser's language preference
(`navigator.languages`): Chinese-prefixed browsers get **中文**, everything
else gets English. A language switcher (EN / 中文) in the header overrides it
and is persisted to `localStorage` (`fengtech.lang`). The whole site —
shell, home, IP tools, case converter and metronome — is bilingual, and
`<html lang="…">` stays in sync. Translations are loaded before first paint
(via an `APP_INITIALIZER`) so no raw keys ever flash.

### Embedded mode

FengTech is embedded as a live preview on sethfengli.com. When the app detects
it is running inside an `<iframe>`, the shell hides its header and footer so
the content reads as a clean panel rather than a "site inside a site". The
day/night theme and language still resolve independently inside the frame.

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
