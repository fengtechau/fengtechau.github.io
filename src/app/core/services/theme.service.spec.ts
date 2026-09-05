import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeService } from './theme.service';

interface StubMedia {
  matches: boolean;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
  flip: (next: boolean) => void;
}

function stubMatchMedia(matchesDark: boolean): StubMedia {
  const listeners = new Set<() => void>();
  const media: StubMedia = {
    matches: matchesDark,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    // Simulate an OS theme flip.
    flip: (next: boolean) => {
      media.matches = next;
      for (const cb of listeners) {
        cb();
      }
    },
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => media,
  });
  return media;
}

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('defaults to the light theme and applies it', () => {
    stubMatchMedia(false);
    const service = new ThemeService();
    expect(service.mode()).toBe('light');
    expect(service.resolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    service.destroy();
  });

  it('applies the dark theme to the document and persists it', () => {
    stubMatchMedia(false);
    const service = new ThemeService();
    service.setMode('dark');
    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('fengtech.theme')).toBe('dark');
    service.destroy();
  });

  it('restores the saved theme on startup', () => {
    localStorage.setItem('fengtech.theme', 'dark');
    stubMatchMedia(false);
    const service = new ThemeService();
    expect(service.mode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    service.destroy();
  });

  it('resolves auto by the local hour in the given time zone', () => {
    stubMatchMedia(false);
    const service = new ThemeService();

    const morning = new Date('2024-01-15T07:00:00Z');
    const evening = new Date('2024-01-15T22:00:00Z');

    expect(service.resolve('auto', morning, 'UTC')).toBe('light');
    expect(service.resolve('auto', evening, 'UTC')).toBe('dark');
    service.destroy();
  });

  it('falls back to the system preference when the hour cannot be computed', () => {
    const media = stubMatchMedia(true);
    vi.stubGlobal('Intl', undefined);
    const service = new ThemeService();
    service.setMode('auto');
    expect(service.resolved()).toBe('dark');

    media.flip(false);
    expect(service.resolved()).toBe('light');
    service.destroy();
  });

  it('re-resolves auto once a minute', () => {
    stubMatchMedia(false);
    const service = new ThemeService();
    service.setMode('auto');
    const spy = vi.spyOn(service, 'resolve');

    vi.advanceTimersByTime(60_000);
    expect(spy).toHaveBeenCalledWith('auto');
    service.destroy();
  });

  it('auto mode stops reacting once a fixed theme is chosen', () => {
    stubMatchMedia(false);
    const service = new ThemeService();
    service.setMode('auto');
    service.setMode('light');
    const spy = vi.spyOn(service, 'resolve');
    vi.advanceTimersByTime(60_000);
    expect(spy).not.toHaveBeenCalled();
    service.destroy();
  });
});
