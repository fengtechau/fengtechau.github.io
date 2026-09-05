import type { ResolvedTheme } from './theme.service';

/**
 * Time-of-day helpers for the "auto" theme. Instead of the OS colour
 * scheme, the day/night theme follows the *browser's time zone* — so a
 * visitor in Sydney at 9pm gets the dark theme even when their operating
 * system is pinned to light.
 *
 * Everything here is pure (no `Date` created inside the helpers), which
 * makes it deterministic to test and safe to mirror in the pre-paint
 * `<script>` in `index.html`.
 */

export const DAY_START_HOUR = 6; // 06:00 — light theme begins
export const DAY_END_HOUR = 18; // 18:00 — dark theme begins

/** The IANA time-zone name the browser reports (e.g. "Australia/Sydney"). */
export function detectTimeZone(): string | undefined {
  try {
    if (typeof Intl === 'undefined') {
      return undefined;
    }
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * Returns the hour (0–23) of `now` in the given IANA time zone, or `null`
 * when it cannot be computed.
 */
export function localHour(now: Date, timeZone?: string): number | null {
  try {
    if (typeof Intl === 'undefined') {
      return null;
    }
    const options: Intl.DateTimeFormatOptions = {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    };
    const formatted = new Intl.DateTimeFormat('en-US', options).format(now);
    const hour = Number.parseInt(formatted, 10);
    return Number.isFinite(hour) ? hour : null;
  } catch {
    return null;
  }
}

/** True when `hour` falls within the daytime window (06:00–17:59). */
export function isDayHour(hour: number): boolean {
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR;
}

/**
 * Resolves the theme for the "auto" mode from the local time, returning
 * `undefined` when the hour cannot be determined (the caller should fall
 * back to `prefers-color-scheme`).
 */
export function resolveThemeByTime(
  now: Date,
  timeZone?: string,
): ResolvedTheme | undefined {
  const hour = localHour(now, timeZone);
  return hour === null ? undefined : isDayHour(hour) ? 'light' : 'dark';
}
