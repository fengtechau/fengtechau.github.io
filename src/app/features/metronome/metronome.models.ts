/**
 * Metronome domain model.
 *
 * Timing model:
 * - `timeSignature` (e.g. "4/4") defines `beatsPerBar` beats, where one
 *   beat lasts `60 / bpm * (4 / denominator)` seconds.
 * - `subdivision` splits each beat into `levelsPerBeat` steps
 *   (quarter=1, eighth=2, triplet=3, sixteenth=4 for x/4 meters).
 * - The pattern grid has one cell per (beat, level) pair; an enabled cell
 *   produces a click.
 */

export type Denominator = 4 | 8;

/** Supported time signatures, e.g. "3/4" or "7/8". */
export type TimeSignature = `${number}/${Denominator}`;

export type SubdivisionId = 'quarter' | 'eighth' | 'triplet' | 'sixteenth';

export type ClickSoundId = 'classic' | 'wood' | 'beep' | 'pulse';

/**
 * Accent grouping presets for compound meters (denominator 8).
 * Numbers are eighth-note counts, e.g. "3+3+2" accents beats 0, 3 and 6.
 */
export type GroupingPreset =
  | 'none'
  | '3+3'
  | '2+2+2'
  | '2+2+2+2'
  | '3+3+2'
  | '2+3+3'
  | '3+2+3'
  | '2+2+3'
  | '3+2+2'
  | '2+3+2'
  | '3+3+3'
  | '2+2+2+3'
  | '3+2+2+2'
  | '3+3+3+3'
  | '4+4+4'
  | '2+2+2+2+2+2';

export const MIN_BPM = 20;
export const MAX_BPM = 300;

export interface TimeSignatureOption {
  value: TimeSignature;
  beatsPerBar: number;
  denominator: Denominator;
}

/** Every signature the UI offers. */
export const TIME_SIGNATURES: readonly TimeSignatureOption[] = [
  { value: '1/4', beatsPerBar: 1, denominator: 4 },
  { value: '2/4', beatsPerBar: 2, denominator: 4 },
  { value: '3/4', beatsPerBar: 3, denominator: 4 },
  { value: '4/4', beatsPerBar: 4, denominator: 4 },
  { value: '5/4', beatsPerBar: 5, denominator: 4 },
  { value: '6/8', beatsPerBar: 6, denominator: 8 },
  { value: '7/8', beatsPerBar: 7, denominator: 8 },
  { value: '8/8', beatsPerBar: 8, denominator: 8 },
  { value: '9/8', beatsPerBar: 9, denominator: 8 },
  { value: '12/8', beatsPerBar: 12, denominator: 8 },
] as const;

export interface SubdivisionOption {
  id: SubdivisionId;
  /** How many steps each beat is split into. */
  levelsPerBeat: number;
  /** Symbol shown in the UI ("♩", "♪", "3", "♬"). */
  symbol: string;
}

export const SUBDIVISIONS_FOR_4: readonly SubdivisionOption[] = [
  { id: 'quarter', levelsPerBeat: 1, symbol: '♩' },
  { id: 'eighth', levelsPerBeat: 2, symbol: '♪' },
  { id: 'triplet', levelsPerBeat: 3, symbol: '3' },
  { id: 'sixteenth', levelsPerBeat: 4, symbol: '♬' },
] as const;

export const SUBDIVISIONS_FOR_8: readonly SubdivisionOption[] = [
  { id: 'eighth', levelsPerBeat: 1, symbol: '♪' },
  { id: 'sixteenth', levelsPerBeat: 2, symbol: '♬' },
] as const;

export const CLICK_SOUNDS: readonly ClickSoundId[] = [
  'classic',
  'wood',
  'beep',
  'pulse',
];

/** Common practice tempos shown as quick-select chips. */
export const TEMPO_PRESETS: readonly { bpm: number; label: string }[] = [
  { bpm: 50, label: 'Largo' },
  { bpm: 66, label: 'Adagio' },
  { bpm: 76, label: 'Andante' },
  { bpm: 96, label: 'Moderato' },
  { bpm: 132, label: 'Allegro' },
  { bpm: 160, label: 'Vivace' },
  { bpm: 176, label: 'Presto' },
];

/** A named, saveable pattern (BPM + signature + grid + accents). */
export interface SavedPattern {
  id: string;
  name: string;
  updatedAt: number;
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: SubdivisionId;
  accentFirstBeat: boolean;
  groupingPreset: GroupingPreset;
  clickSound: ClickSoundId;
  /** pattern[beat][level] — true means the step sounds. */
  pattern: boolean[][];
}

/** Persisted user settings. */
export interface MetronomeSettings {
  bpm: number;
  timeSignature: TimeSignature;
  subdivision: SubdivisionId;
  accentFirstBeat: boolean;
  groupingPreset: GroupingPreset;
  clickSound: ClickSoundId;
  volume: number;
  keepAwake: boolean;
}

/** Everything the UI needs to render; emitted as one observable state. */
export interface MetronomeState extends MetronomeSettings {
  isRunning: boolean;
  beatsPerBar: number;
  denominator: Denominator;
  levelsPerBeat: number;
  /** 0-based indices of group-start beats (accented). */
  accentBeats: number[];
  /** 0-based index of the beat / step currently sounding. */
  currentBeatIndex: number;
  currentLevelIndex: number;
  /** Practice stopwatch. */
  elapsedMs: number;
  stopwatchRunning: boolean;
}

/** Accent strength of a scheduled click. */
export type ClickKind = 'downbeat' | 'accent' | 'main' | 'sub';

/** Parses "7/8" into its parts (throws on malformed input). */
export function parseTimeSignature(sig: TimeSignature): {
  beatsPerBar: number;
  denominator: Denominator;
} {
  const [beats, denom] = sig.split('/');
  const beatsPerBar = Number.parseInt(beats, 10);
  const denominator = Number.parseInt(denom, 10) as Denominator;
  if (!Number.isFinite(beatsPerBar) || (denominator !== 4 && denominator !== 8)) {
    throw new Error(`Invalid time signature: ${sig}`);
  }
  return { beatsPerBar, denominator };
}
