import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeService } from './theme.service';

function stubMatchMedia(matchesDark: boolean) {
  const listeners = new Set<() => void>();
  const media = {
    matches: matchesDark,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    // Simulate an OS theme flip.
    flip: (next: boolean) => {
      (media as { matches: boolean }).matches = next;
      for (const cb of listeners) cb();
    },
  };
  vi.stubGlobal('window', { matchMedia: () => media });
  vi.stubGlobal('matchMedia', () => media);
  return media as typeof media & { flip: (next: boolean) => void };
}

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to the light theme', () => {
    stubMatchMedia(false);
    const service = new ThemeService();
    expect(service.mode()).toBe('light');
    expect(service.resolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('applies the dark theme to the document and persists it', () => {
    stubMatchMedia(false);
    const service = new ThemeService();
    service.setMode('dark');
    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('fengtech.theme')).toBe('dark');
  });

  it('restores the saved theme on startup', () => {
    localStorage.setItem('fengtech.theme', 'dark');
    stubMatchMedia(false);
    const service = new ThemeService();
    expect(service.mode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('auto mode follows the system preference', () => {
    const media = stubMatchMedia(false);
    const service = new ThemeService();
    service.setMode('auto');
    expect(service.resolved()).toBe('light');

    media.flip(true);
    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    media.flip(false);
    expect(service.resolved()).toBe('light');
  });

  it('auto mode stops reacting once a fixed theme is chosen', () => {
    const media = stubMatchMedia(false);
    const service = new ThemeService();
    service.setMode('auto');
    service.setMode('light');
    media.flip(true);
    expect(service.resolved()).toBe('light');
  });
});
