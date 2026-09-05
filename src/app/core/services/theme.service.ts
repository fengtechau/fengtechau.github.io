import { Injectable, signal } from '@angular/core';

import { detectTimeZone, resolveThemeByTime } from './theme-clock';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

const LS_THEME = 'fengtech.theme';
const THEME_ATTR = 'data-theme';
const THEME_COLOR_META = 'meta[name="theme-color"]';
const AUTO_CHECK_MS = 60_000;

/**
 * Global color theme series:
 * - `light` — the default brand design (all pages, including the metronome)
 * - `dark` — dark variant of the same tokens
 * - `auto` — follows the day/night cycle in the *browser's time zone*
 *   (06:00–18:00 light, otherwise dark), falling back to the OS
 *   `prefers-color-scheme` setting when the local hour can't be resolved.
 *
 * The resolved theme is written to `<html data-theme="…">`, which every
 * CSS token override keys off, and the choice is persisted to localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readSavedMode());
  readonly resolved = signal<ResolvedTheme>('light');

  private readonly media: MediaQueryList | undefined;
  private readonly timeZone: string | undefined;
  private autoTimer: number | undefined;

  constructor() {
    this.media = this.resolveMediaQuery();
    this.timeZone = detectTimeZone();
    this.media?.addEventListener?.('change', this.onSystemThemeChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.apply(this.mode());
    this.startAutoCheck();
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    this.writeSavedMode(mode);
    this.apply(mode);
  }

  /**
   * The effective theme for the current mode + local time/OS preference.
   * `now` and `timeZone` are injectable for deterministic testing.
   */
  resolve(
    mode: ThemeMode,
    now: Date = new Date(),
    timeZone = this.timeZone,
  ): ResolvedTheme {
    return mode === 'auto' ? this.resolveAuto(now, timeZone) : mode;
  }

  /** Stops background timers/listeners. Used by tests; the app singleton never calls it. */
  destroy(): void {
    this.stopAutoCheck();
    this.media?.removeEventListener?.('change', this.onSystemThemeChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private resolveAuto(now: Date, timeZone?: string): ResolvedTheme {
    const byTime = resolveThemeByTime(now, timeZone);
    if (byTime) {
      return byTime;
    }
    return this.media?.matches ? 'dark' : 'light';
  }

  private apply(mode: ThemeMode): void {
    const resolved = this.resolve(mode);
    this.resolved.set(resolved);
    document.documentElement.setAttribute(THEME_ATTR, resolved);
    document
      .querySelector(THEME_COLOR_META)
      ?.setAttribute('content', resolved === 'dark' ? '#0d1420' : '#2d6ae3');
  }

  /** Re-resolves "auto" once a minute so an open tab flips at dawn/dusk. */
  private startAutoCheck(): void {
    this.autoTimer = window.setInterval(() => {
      if (this.mode() === 'auto') {
        this.apply('auto');
      }
    }, AUTO_CHECK_MS);
  }

  private stopAutoCheck(): void {
    if (this.autoTimer !== undefined) {
      window.clearInterval(this.autoTimer);
      this.autoTimer = undefined;
    }
  }

  private readonly onSystemThemeChange = (): void => {
    if (this.mode() === 'auto') {
      this.apply('auto');
    }
  };

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.mode() === 'auto') {
      this.apply('auto');
    }
  };

  private readSavedMode(): ThemeMode {
    try {
      const saved = localStorage.getItem(LS_THEME);
      return saved === 'dark' || saved === 'auto' ? saved : 'light';
    } catch {
      return 'light';
    }
  }

  private writeSavedMode(mode: ThemeMode): void {
    try {
      localStorage.setItem(LS_THEME, mode);
    } catch {
      // Private mode — the theme still applies for this session.
    }
  }

  private resolveMediaQuery(): MediaQueryList | undefined {
    try {
      return typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : undefined;
    } catch {
      return undefined;
    }
  }
}
