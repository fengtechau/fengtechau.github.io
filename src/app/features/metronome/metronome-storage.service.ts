import { Injectable } from '@angular/core';

import {
  ClickSoundId,
  CLICK_SOUNDS,
  GroupingPreset,
  MetronomeSettings,
  SavedPattern,
  SubdivisionId,
  TimeSignature,
  TIME_SIGNATURES,
} from './metronome.models';
import { clampBpm, isValidSubdivision, uid } from './metronome.utils';

const LS_PATTERNS = 'fengtech.metronome.patterns.v2';
const LS_SETTINGS = 'fengtech.metronome.settings.v1';

const DEFAULT_SETTINGS: MetronomeSettings = {
  bpm: 120,
  timeSignature: '4/4',
  subdivision: 'sixteenth',
  accentFirstBeat: true,
  groupingPreset: 'none',
  clickSound: 'classic',
  volume: 0.85,
  keepAwake: false,
};

/**
 * localStorage-backed persistence for saved patterns and user settings.
 * All reads are validated and normalized, so corrupted data can never
 * crash the feature.
 */
@Injectable({ providedIn: 'root' })
export class MetronomeStorageService {
  private readonly storage: Storage | undefined;

  constructor() {
    this.storage = this.resolveStorage();
  }

  // ------------------------------------------------------------
  // Patterns
  // ------------------------------------------------------------

  listPatterns(): SavedPattern[] {
    const map = this.getPatternsMap();
    return Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  loadPattern(id: string): SavedPattern | null {
    return this.getPatternsMap()[id] ?? null;
  }

  savePattern(pattern: SavedPattern): void {
    const map = this.getPatternsMap();
    map[pattern.id] = { ...pattern, id: pattern.id || uid(), updatedAt: Date.now() };
    this.setPatternsMap(map);
  }

  deletePattern(id: string): void {
    const map = this.getPatternsMap();
    delete map[id];
    this.setPatternsMap(map);
  }

  // ------------------------------------------------------------
  // Settings
  // ------------------------------------------------------------

  loadSettings(): MetronomeSettings {
    return { ...DEFAULT_SETTINGS, ...this.sanitizeSettings(this.readSettings()) };
  }

  saveSettings(settings: MetronomeSettings): void {
    this.write(LS_SETTINGS, JSON.stringify(settings));
  }

  // ------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------

  private getPatternsMap(): Record<string, SavedPattern> {
    return safeJsonParse<Record<string, SavedPattern>>(
      this.storage?.getItem(LS_PATTERNS),
      {},
    );
  }

  private setPatternsMap(map: Record<string, SavedPattern>): void {
    this.write(LS_PATTERNS, JSON.stringify(map));
  }

  private readSettings(): Partial<MetronomeSettings> {
    return safeJsonParse<Partial<MetronomeSettings>>(
      this.storage?.getItem(LS_SETTINGS),
      {},
    );
  }

  /** Coerces persisted settings back into legal ranges. */
  private sanitizeSettings(
    raw: Partial<MetronomeSettings>,
  ): Partial<MetronomeSettings> {
    const sanitized: Partial<MetronomeSettings> = {};

    if (typeof raw.bpm === 'number') {
      sanitized.bpm = clampBpm(raw.bpm);
    }
    if (this.isTimeSignature(raw.timeSignature)) {
      sanitized.timeSignature = raw.timeSignature;
    }
    if (this.isSubdivision(raw.subdivision, raw.timeSignature)) {
      sanitized.subdivision = raw.subdivision;
    }
    if (typeof raw.accentFirstBeat === 'boolean') {
      sanitized.accentFirstBeat = raw.accentFirstBeat;
    }
    if (typeof raw.groupingPreset === 'string') {
      sanitized.groupingPreset = raw.groupingPreset as GroupingPreset;
    }
    if (this.isSound(raw.clickSound)) {
      sanitized.clickSound = raw.clickSound;
    }
    if (typeof raw.volume === 'number') {
      sanitized.volume = Math.min(1, Math.max(0, raw.volume));
    }
    if (typeof raw.keepAwake === 'boolean') {
      sanitized.keepAwake = raw.keepAwake;
    }
    return sanitized;
  }

  private isTimeSignature(value: unknown): value is TimeSignature {
    return TIME_SIGNATURES.some((s) => s.value === value);
  }

  private isSubdivision(
    value: unknown,
    signature: TimeSignature | undefined,
  ): value is SubdivisionId {
    if (typeof value !== 'string') {
      return false;
    }
    const denominator = signature?.endsWith('/8') ? 8 : 4;
    return isValidSubdivision(value as SubdivisionId, denominator);
  }

  private isSound(value: unknown): value is ClickSoundId {
    return CLICK_SOUNDS.includes(value as ClickSoundId);
  }

  private resolveStorage(): Storage | undefined {
    try {
      return typeof window !== 'undefined' ? window.localStorage : undefined;
    } catch {
      // localStorage unavailable (private mode / sandboxed iframe).
      return undefined;
    }
  }

  private write(key: string, value: string): void {
    try {
      this.storage?.setItem(key, value);
    } catch {
      // Storage full or blocked — persistence degrades gracefully.
    }
  }
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
