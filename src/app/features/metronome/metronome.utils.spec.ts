import { describe, expect, it } from 'vitest';

import {
  availableGroupings,
  advanceStep,
  beatDurationSec,
  cellLabel,
  clampBpm,
  computeAccentBeats,
  defaultGrouping,
  defaultPattern,
  normalizePattern,
  stepDurationSec,
  TapTempoTracker,
} from './metronome.utils';

describe('clampBpm', () => {
  it('rounds and keeps values inside the supported range', () => {
    expect(clampBpm(120)).toBe(120);
    expect(clampBpm(119.6)).toBe(120);
  });

  it('clamps the lower bound to 20', () => {
    expect(clampBpm(0)).toBe(20);
    expect(clampBpm(-5)).toBe(20);
  });

  it('clamps the upper bound to 300', () => {
    expect(clampBpm(500)).toBe(300);
  });

  it('falls back to the minimum for non-numeric input', () => {
    expect(clampBpm(Number.NaN)).toBe(20);
    expect(clampBpm(Number.POSITIVE_INFINITY)).toBe(20);
  });
});

describe('durations', () => {
  it('computes a quarter-note beat duration from BPM', () => {
    expect(beatDurationSec(60, 4)).toBeCloseTo(1);
    expect(beatDurationSec(120, 4)).toBeCloseTo(0.5);
  });

  it('scales beat duration by the denominator (x/8 = half of x/4)', () => {
    expect(beatDurationSec(60, 8)).toBeCloseTo(0.5);
  });

  it('splits the beat evenly between subdivision levels', () => {
    expect(stepDurationSec(120, 4, 4)).toBeCloseTo(0.125); // 16ths
    expect(stepDurationSec(120, 4, 3)).toBeCloseTo(0.5 / 3); // triplets
    expect(stepDurationSec(120, 8, 2)).toBeCloseTo(0.125); // 16ths of 6/8
  });
});

describe('advanceStep', () => {
  it('advances within a beat', () => {
    expect(advanceStep(0, 0, 4, 4)).toEqual({ beatIndex: 0, levelIndex: 1 });
  });

  it('wraps to the next beat after the last level', () => {
    expect(advanceStep(0, 3, 4, 4)).toEqual({ beatIndex: 1, levelIndex: 0 });
  });

  it('wraps to the bar start after the last step', () => {
    expect(advanceStep(3, 3, 4, 4)).toEqual({ beatIndex: 0, levelIndex: 0 });
  });
});

describe('groupings', () => {
  it('offers compound groupings only for x/8 meters', () => {
    expect(availableGroupings(4, 4)).toEqual(['none']);
    expect(availableGroupings(6, 8)).toEqual(['none', '3+3', '2+2+2']);
    expect(availableGroupings(7, 8)).toEqual(['none', '2+2+3', '3+2+2', '2+3+2']);
    expect(availableGroupings(9, 8)).toEqual(['none', '3+3+3', '2+2+2+3', '3+2+2+2']);
  });

  it('picks a sensible default grouping per meter', () => {
    expect(defaultGrouping(4, 4)).toBe('none');
    expect(defaultGrouping(6, 8)).toBe('3+3');
    expect(defaultGrouping(7, 8)).toBe('2+2+3');
    expect(defaultGrouping(12, 8)).toBe('3+3+3+3');
  });

  it('computes accented group-start beats', () => {
    expect(computeAccentBeats(8, 8, '3+3+2')).toEqual([0, 3, 6]);
    expect(computeAccentBeats(7, 8, '2+2+3')).toEqual([0, 2, 4]);
    expect(computeAccentBeats(6, 8, '2+2+2')).toEqual([0, 2, 4]);
  });

  it('only accents the downbeat for simple meters or no grouping', () => {
    expect(computeAccentBeats(4, 4, '3+3')).toEqual([0]);
    expect(computeAccentBeats(8, 8, 'none')).toEqual([0]);
  });
});

describe('patterns', () => {
  it('creates a default pattern with main beats enabled', () => {
    const pattern = defaultPattern(4, 4);
    expect(pattern).toHaveLength(4);
    expect(pattern[0]).toEqual([true, false, false, false]);
  });

  it('normalizes undersized stored patterns to the right shape', () => {
    const pattern = normalizePattern([[true, true]], 4, 3);
    expect(pattern).toHaveLength(4);
    expect(pattern[0]).toEqual([true, true, false]);
    // Missing rows fall back to main-beat-only.
    expect(pattern[3]).toEqual([true, false, false]);
  });

  it('normalizes oversized stored patterns by trimming', () => {
    const pattern = normalizePattern([[true, false, true, false, true, true]], 1, 4);
    expect(pattern).toEqual([[true, false, true, false]]);
  });

  it('treats missing cells as enabled on main beats', () => {
    const pattern = normalizePattern([[false, true, false, false]], 2, 4);
    expect(pattern[1]).toEqual([true, false, false, false]);
  });
});

describe('cellLabel', () => {
  it('labels main beats with their number', () => {
    expect(cellLabel(0, 0, 4)).toBe('1');
    expect(cellLabel(2, 0, 2)).toBe('3');
  });

  it('labels 16th-note levels with counting syllables', () => {
    expect(cellLabel(0, 1, 4)).toBe('e');
    expect(cellLabel(0, 2, 4)).toBe('&');
    expect(cellLabel(0, 3, 4)).toBe('a');
  });

  it('labels eighth-note offbeats and triplet levels', () => {
    expect(cellLabel(0, 1, 2)).toBe('&');
    expect(cellLabel(0, 1, 3)).toBe('trip');
    expect(cellLabel(0, 2, 3)).toBe('let');
  });
});

describe('TapTempoTracker', () => {
  it('returns null until at least two taps', () => {
    const tracker = new TapTempoTracker();
    expect(tracker.tap(0)).toBeNull();
  });

  it('averages the interval between taps into BPM', () => {
    const tracker = new TapTempoTracker();
    tracker.tap(0);
    expect(tracker.tap(500)).toBe(120);
    expect(tracker.tap(1000)).toBe(120);
  });

  it('ignores double-fires faster than the minimum interval', () => {
    const tracker = new TapTempoTracker();
    tracker.tap(0);
    expect(tracker.tap(50)).toBeNull();
    expect(tracker.tap(500)).toBe(120);
  });

  it('drops taps outside the averaging window', () => {
    const tracker = new TapTempoTracker(1000);
    tracker.tap(0);
    tracker.tap(400);
    // 1100ms after the last tap, both earlier taps are stale: null.
    expect(tracker.tap(1500)).toBeNull();
  });

  it('clamps extreme tap speeds into the BPM range', () => {
    const tracker = new TapTempoTracker();
    tracker.tap(0);
    expect(tracker.tap(160)).toBe(300); // 375 BPM → clamped
  });
});
