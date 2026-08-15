# Metronome — Verification Checklist

How to verify the metronome against the acceptance criteria defined for
this release. Run the app with `npm start` and open `/metronome`.

## Automated verification (already run in CI-style checks)

| Check                                   | Result                                  |
| --------------------------------------- | --------------------------------------- |
| 120 BPM, 4/4, 16ths — 15 s playhead probe | avg step 124.93 ms vs 125 ms target (deviation **-0.06%**) |
| Rapid start/stop ×10, BPM 20↔300 swings, 6 signature changes while playing | no page errors, state consistent |
| 40 structural UI checks (shell, grid, modals, keyboard, a11y, mobile overflow) | all passed |
| 13 theme checks (light/dark unification, persistence, auto mode, post-switch playback) | all passed |
| `npm run build` / `lint` / `test` / `format:check` | all green (61 unit tests) |

Screenshots are committed under `docs/screenshots/`
(`01-home-desktop.png` … `10-home-dark.png`).

## 8. Color series (theme) checks

- [ ] Default (light) series: the metronome page background, cards,
      text, buttons and borders share the exact same tone as the rest
      of the site — no dark navy panel remains.
- [ ] Header theme switcher: Light / Dark / Auto buttons reflect the
      current series; pressing one restyles every page instantly.
- [ ] Dark series: all pages (home, IP, tools, metronome) switch
      together; no leftover hardcoded light or orange elements.
- [ ] Reload keeps the chosen series (stored in `localStorage`); a hard
      refresh shows no light flash before paint.
- [ ] Auto follows the OS preference and reacts to changes.
- [ ] Metronome playback, tap tempo, modals and stopwatch behave
      identically in both series.

## 1. Timing accuracy (P0)

- [ ] Set **120 BPM, 4/4, sixteenth subdivision** and start.
- [ ] Run continuously for **5 minutes**.
- [ ] **Expected:** no perceivable drift or unsteadiness. Each beat lands
      evenly; the LED / grid highlight stays in sync with the click.
- [ ] Compare against an external reference (phone metronome / watch) if
      available: within the 5 minutes there should be no audible flam.

## 2. Rapid adjustments (P0)

- [ ] While playing, drag the BPM slider from 20 → 300 → 20 quickly.
- [ ] While playing, switch time signatures rapidly:
      4/4 → 7/8 → 3/4 → 12/8 → 1/4.
- [ ] While playing, toggle subdivisions (quarter / eighth / triplet /
      sixteenth) repeatedly.
- [ ] Toggle Start/Stop 10 times in quick succession.
- [ ] **Expected:** no clicks/pops, no overlapping or ghost notes, no
      freeze or crash; the bar restarts cleanly on each transport reset.

## 3. Features

- [ ] **BPM input:** type 150 in the number field — the slider, chips and
      playback update live; typing `10` clamps to 20, `999` clamps to 300.
- [ ] **± buttons:** long-press accelerates; releasing stops the repeat.
- [ ] **Tap tempo:** tap 4× at roughly 120 BPM (button or `T` key) — the
      tempo converges to ~120 and playback follows.
- [ ] **Tempo chips:** Largo/Adagio/… set the marked BPM.
- [ ] **Time signatures:** all 10 options produce the correct number of
      beats; 7/8 defaults to grouping 2+2+3 with accents on beats 1, 3, 5.
- [ ] **Subdivisions:** grid shows 1/2/3/4 rows per beat for
      quarter/eighth/triplet/sixteenth; triplet grid plays true triplets.
- [ ] **Accent first beat:** toggle off — the downbeat loses its emphasis
      but the rhythm continues.
- [ ] **Sounds:** classic / woodblock / beep / pulse are clearly distinct;
      volume slider changes loudness without clicks.
- [ ] **Pattern grid:** click cells to mute/unmute; muted steps stay
      silent while the highlight still passes over them.
- [ ] **Patterns:** Save As "Warm-up" → change settings → reload the
      pattern → everything (BPM, signature, subdivision, grid, sound)
      restores. Overwrite and Delete work; deleting shows a confirmation.
- [ ] **Keyboard:** `Space` toggles play, `↑/↓` ±1 BPM,
      `Shift+↑/↓` ±10 BPM, `T` taps. Keys are ignored while typing in
      inputs.
- [ ] **Practice timer:** start/pause/reset behaves like a stopwatch and
      survives transport start/stop.

## 4. Visual / UX

- [ ] Play button pulses while running; beat LEDs advance with the click;
      the active grid cell flashes in sync with the sound.
- [ ] EN / 中文 switch updates all labels instantly and persists on reload.
- [ ] Settings (BPM, signature, subdivision, sound, volume) persist after
      a page reload.
- [ ] Fullscreen button enters/exits fullscreen; ESC and the button both
      work.
- [ ] Keep-screen-awake toggle (mobile) requests the Wake Lock and
      releases it on stop.
- [ ] Narrow viewport (< 640 px): controls stack vertically, grid scrolls
      horizontally, nothing overflows.

## 5. Mobile / background (P0)

- [ ] On a phone, start the metronome with "Keep screen awake" enabled,
      then lock the screen: playback continues steadily.
- [ ] Without the wake lock, background the tab for ~30 s and return:
      playback resumes in time (no burst of missed clicks).

## 6. Accessibility

- [ ] Tab through every control — focus ring is visible; buttons,
      sliders, selects and switches are reachable by keyboard.
- [ ] Grid cells expose `aria-pressed` and a meaningful label
      ("Beat 1, step e, muted").
- [ ] Modals trap Escape/backdrop close and announce their title via
      `aria-label`.
- [ ] With "reduce motion" enabled in the OS, pulse animations are
      minimized.

## 7. Non-regression

- [ ] Home, IP Tools and Case Converter pages load and work as before
      (IP shows data or a retry state; converter copies text).
- [ ] `npm run build`, `npm run lint`, `npm test` all pass.
