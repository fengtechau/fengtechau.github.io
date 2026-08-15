import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

const LS_THEME = 'fengtech.theme';
const THEME_ATTR = 'data-theme';
const THEME_COLOR_META = 'meta[name="theme-color"]';

/**
 * Global color theme series:
 * - `light` — the default brand design (all pages, including the metronome)
 * - `dark` — dark variant of the same tokens
 * - `auto` — follows the OS `prefers-color-scheme` setting
 *
 * The resolved theme is written to `<html data-theme="…">`, which every
 * CSS token override keys off, and the choice is persisted to localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.readSavedMode());
  readonly resolved = signal<ResolvedTheme>('light');

  private readonly media: MediaQueryList | undefined;

  constructor() {
    this.media = this.resolveMediaQuery();
    this.media?.addEventListener?.('change', this.onSystemThemeChange);
    this.apply(this.mode());
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    this.writeSavedMode(mode);
    this.apply(mode);
  }

  /** The effective theme for the current mode + OS preference. */
  resolve(mode: ThemeMode): ResolvedTheme {
    if (mode === 'auto') {
      return this.media?.matches ? 'dark' : 'light';
    }
    return mode;
  }

  private apply(mode: ThemeMode): void {
    const resolved = this.resolve(mode);
    this.resolved.set(resolved);
    document.documentElement.setAttribute(THEME_ATTR, resolved);
    document
      .querySelector(THEME_COLOR_META)
      ?.setAttribute('content', resolved === 'dark' ? '#0d1420' : '#2d6ae3');
  }

  private readonly onSystemThemeChange = (): void => {
    if (this.mode() === 'auto') {
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
