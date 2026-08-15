/**
 * Pure, framework-free helpers for the metronome.
 * Everything here is unit-tested in `metronome.utils.spec.ts`.
 */
import {
  Denominator,
  GroupingPreset,
  MAX_BPM,
  MIN_BPM,
  SubdivisionId,
  SUBDIVISIONS_FOR_4,
  SUBDIVISIONS_FOR_8,
} from './metronome.models';

/** Clamps any numeric input into the supported BPM range. */
export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_BPM;
  }
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

/** Duration of one beat in seconds for a given meter. */
export function beatDurationSec(bpm: number, denominator: Denominator): number {
  return (60 / bpm) * (4 / denominator);
}

/** Duration of one grid step (the smallest schedulable unit). */
export function stepDurationSec(
  bpm: number,
  denominator: Denominator,
  levelsPerBeat: number,
): number {
  return beatDurationSec(bpm, denominator) / levelsPerBeat;
}

/** Advances the playhead by one step, wrapping at the end of the bar. */
export function advanceStep(
  beatIndex: number,
  levelIndex: number,
  beatsPerBar: number,
  levelsPerBeat: number,
): { beatIndex: number; levelIndex: number } {
  const nextLevel = levelIndex + 1;
  if (nextLevel < levelsPerBeat) {
    return { beatIndex, levelIndex: nextLevel };
  }
  return {
    beatIndex: (beatIndex + 1) % beatsPerBar,
    levelIndex: 0,
  };
}

/** Subdivision options available for a meter. */
export function subdivisionsFor(denominator: Denominator) {
  return denominator === 4 ? SUBDIVISIONS_FOR_4 : SUBDIVISIONS_FOR_8;
}

/** Whether a subdivision id is valid for a meter. */
export function isValidSubdivision(
  subdivision: SubdivisionId,
  denominator: Denominator,
): boolean {
  return subdivisionsFor(denominator).some((s) => s.id === subdivision);
}

/** Grouping presets available for a meter. */
export function availableGroupings(
  beatsPerBar: number,
  denominator: Denominator,
): GroupingPreset[] {
  if (denominator !== 8) {
    return ['none'];
  }
  switch (beatsPerBar) {
    case 6:
      return ['none', '3+3', '2+2+2'];
    case 7:
      return ['none', '2+2+3', '3+2+2', '2+3+2'];
    case 8:
      return ['none', '2+2+2+2', '3+3+2', '2+3+3', '3+2+3'];
    case 9:
      return ['none', '3+3+3', '2+2+2+3', '3+2+2+2'];
    case 12:
      return ['none', '3+3+3+3', '4+4+4', '2+2+2+2+2+2'];
    default:
      return ['none'];
  }
}

/** Sensible default grouping when switching to a compound meter. */
export function defaultGrouping(
  beatsPerBar: number,
  denominator: Denominator,
): GroupingPreset {
  const options = availableGroupings(beatsPerBar, denominator);
  return options.length > 1 ? options[1] : 'none';
}

/** 0-based indices of beats that start a group (accented). */
export function computeAccentBeats(
  beatsPerBar: number,
  denominator: Denominator,
  preset: GroupingPreset,
): number[] {
  if (denominator !== 8 || preset === 'none') {
    return [0];
  }

  const groups = preset
    .split('+')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (groups.length === 0) {
    return [0];
  }

  const starts: number[] = [0];
  let cursor = 0;
  for (let i = 0; i < groups.length - 1; i++) {
    cursor += groups[i];
    if (cursor < beatsPerBar) {
      starts.push(cursor);
    }
  }

  return [...new Set(starts)].sort((a, b) => a - b);
}

/**
 * Normalizes a stored pattern into an exact `beats x levels` matrix.
 * Falls back to "main beat enabled" for any missing cell.
 */
export function normalizePattern(
  incoming: boolean[][] | null | undefined,
  beatsPerBar: number,
  levelsPerBeat: number,
): boolean[][] {
  return Array.from({ length: beatsPerBar }, (_, beat) =>
    Array.from(
      { length: levelsPerBeat },
      (_, level) => incoming?.[beat]?.[level] ?? level === 0,
    ),
  );
}

/** Fresh pattern with only the main beat of each beat enabled. */
export function defaultPattern(
  beatsPerBar: number,
  levelsPerBeat: number,
): boolean[][] {
  return normalizePattern(null, beatsPerBar, levelsPerBeat);
}

/** Collision-safe id for saved patterns. */
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Human label for a grid cell, e.g. beat 2, level "&" → "2&". */
export function cellLabel(beat: number, level: number, levelsPerBeat: number): string {
  if (level === 0) {
    return String(beat + 1);
  }
  if (levelsPerBeat === 2) {
    return '&';
  }
  if (levelsPerBeat === 3) {
    return level === 1 ? 'trip' : 'let';
  }
  return ['e', '&', 'a'][level - 1] ?? '';
}

/**
 * Tap-tempo averaging: collects tap timestamps and returns the BPM
 * derived from the average interval, or `null` until enough taps exist.
 */
export class TapTempoTracker {
  private readonly taps: number[] = [];

  constructor(
    private readonly windowMs = 2000,
    private readonly minIntervalMs = 150,
  ) {}

  /** Records a tap; returns the new BPM or null (single tap / too fast). */
  tap(nowMs: number): number | null {
    const previous = this.taps.at(-1);
    if (previous !== undefined && nowMs - previous < this.minIntervalMs) {
      return null;
    }

    this.taps.push(nowMs);
    while (this.taps.length > 0 && nowMs - this.taps[0] > this.windowMs) {
      this.taps.shift();
    }

    if (this.taps.length < 2) {
      return null;
    }

    const spanMs = this.taps[this.taps.length - 1] - this.taps[0];
    const averageIntervalMs = spanMs / (this.taps.length - 1);
    if (averageIntervalMs <= 0) {
      return null;
    }
    return clampBpm(60000 / averageIntervalMs);
  }

  reset(): void {
    this.taps.length = 0;
  }
}
