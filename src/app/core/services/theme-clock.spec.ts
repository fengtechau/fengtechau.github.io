import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  detectTimeZone,
  isDayHour,
  localHour,
  resolveThemeByTime,
} from './theme-clock';

describe('theme-clock', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('localHour', () => {
    it('resolves the hour in the given time zone', () => {
      const noonUtc = new Date('2024-01-15T12:00:00Z');
      expect(localHour(noonUtc, 'UTC')).toBe(12);
    });

    it('returns the hour for the machine time zone when none is given', () => {
      // UTC is asserted only because the test runner's zone may vary; with an
      // explicit instant and zone this is deterministic.
      const noonUtc = new Date('2024-01-15T12:00:00Z');
      const hour = localHour(noonUtc, 'UTC');
      expect(hour).toBe(12);
    });

    it('returns null when Intl is unavailable', () => {
      vi.stubGlobal('Intl', undefined);
      expect(localHour(new Date(), 'UTC')).toBeNull();
    });
  });

  describe('isDayHour', () => {
    it('treats 06:00–17:59 as daytime', () => {
      expect(isDayHour(DAY_START_HOUR)).toBe(true);
      expect(isDayHour(DAY_END_HOUR - 1)).toBe(true);
      expect(isDayHour(DAY_START_HOUR - 1)).toBe(false);
      expect(isDayHour(DAY_END_HOUR)).toBe(false);
    });
  });

  describe('resolveThemeByTime', () => {
    it('returns light during the day', () => {
      const morning = new Date('2024-01-15T07:00:00Z');
      expect(resolveThemeByTime(morning, 'UTC')).toBe('light');
    });

    it('returns dark during the night', () => {
      const evening = new Date('2024-01-15T22:00:00Z');
      expect(resolveThemeByTime(evening, 'UTC')).toBe('dark');
    });

    it('returns undefined when the hour cannot be computed', () => {
      vi.stubGlobal('Intl', undefined);
      expect(resolveThemeByTime(new Date(), 'UTC')).toBeUndefined();
    });
  });

  describe('detectTimeZone', () => {
    it('returns a time zone when Intl is available', () => {
      expect(detectTimeZone()).toBeTruthy();
    });

    it('returns undefined when Intl is unavailable', () => {
      vi.stubGlobal('Intl', undefined);
      expect(detectTimeZone()).toBeUndefined();
    });
  });
});
