import { inject, Injectable, NgZone } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

import { MetronomeAudioService } from './metronome-audio.service';
import { MetronomeStorageService } from './metronome-storage.service';
import {
  ClickKind,
  ClickSoundId,
  GroupingPreset,
  MetronomeState,
  parseTimeSignature,
  SavedPattern,
  SubdivisionId,
  TimeSignature,
} from './metronome.models';
import {
  advanceStep,
  clampBpm,
  computeAccentBeats,
  defaultGrouping,
  defaultPattern,
  isValidSubdivision,
  normalizePattern,
  stepDurationSec,
  uid,
} from './metronome.utils';

interface VisualEvent {
  time: number;
  beatIndex: number;
  levelIndex: number;
}

/** How often the scheduler wakes up (ms). */
const LOOKAHEAD_INTERVAL_MS = 25;

/**
 * Orchestrates the metronome: state, pattern grid, scheduling loop,
 * stopwatch, wake lock and persistence.
 *
 * Timing is driven entirely by the Web Audio clock (`AudioContext.currentTime`):
 * - a lightweight interval keeps notes scheduled `lookahead` seconds ahead,
 *   which the browser guarantees sample-accurate playback of;
 * - visual events are queued with their audio timestamp and flushed only
 *   when the clock reaches them, keeping the UI in sync with the sound;
 * - if the tab was throttled in the background, the playhead silently
 *   re-anchors instead of bursting hundreds of late clicks.
 */
@Injectable({ providedIn: 'root' })
export class MetronomeService {
  private readonly stateSubject: BehaviorSubject<MetronomeState>;
  private readonly patternSubject: BehaviorSubject<boolean[][]>;

  readonly state$: Observable<MetronomeState>;
  readonly pattern$: Observable<boolean[][]>;

  private readonly audio = inject(MetronomeAudioService);
  private readonly storage = inject(MetronomeStorageService);
  private readonly zone = inject(NgZone);

  // Scheduler
  private timer: number | undefined;
  private nextNoteTime = 0;
  private beatIndex = 0;
  private levelIndex = 0;
  private generation = 0;
  private visualQueue: VisualEvent[] = [];

  // Pattern grid: pattern[beat][level] — true means the step sounds.
  private pattern: boolean[][] = [];

  // Stopwatch
  private stopwatchTimer: number | undefined;
  private stopwatchStartedAt = 0;
  private stopwatchAccumulated = 0;

  // Wake lock (mobile: keep playing with the screen off)
  private wakeLock: WakeLockSentinel | undefined;

  constructor() {
    const settings = this.storage.loadSettings();
    const { beatsPerBar, denominator } = parseTimeSignature(settings.timeSignature);
    const levelsPerBeat = this.levelsPerBeatFor(settings.subdivision, denominator);

    this.pattern = defaultPattern(beatsPerBar, levelsPerBeat);

    this.stateSubject = new BehaviorSubject<MetronomeState>({
      isRunning: false,
      beatsPerBar,
      denominator,
      levelsPerBeat,
      accentBeats: computeAccentBeats(
        beatsPerBar,
        denominator,
        settings.groupingPreset,
      ),
      currentBeatIndex: 0,
      currentLevelIndex: 0,
      elapsedMs: 0,
      stopwatchRunning: false,
      ...settings,
    });
    this.patternSubject = new BehaviorSubject<boolean[][]>(this.pattern);
    this.state$ = this.stateSubject.asObservable();
    this.pattern$ = this.patternSubject.asObservable();

    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  getState(): MetronomeState {
    return this.stateSubject.value;
  }

  getPattern(): boolean[][] {
    return this.patternSubject.value;
  }

  // ============================================================
  // Transport
  // ============================================================

  async start(): Promise<void> {
    if (this.getState().isRunning) {
      return;
    }

    await this.audio.ensureRunning();
    // Re-check: the user may have toggled while the context resumed.
    if (this.getState().isRunning) {
      return;
    }

    this.generation++;
    this.audio.cancelPending(this.generation);

    this.nextNoteTime = this.audio.currentTime + 0.1;
    this.beatIndex = 0;
    this.levelIndex = 0;
    this.visualQueue.length = 0;

    this.patchState({
      isRunning: true,
      currentBeatIndex: 0,
      currentLevelIndex: 0,
    });

    this.zone.runOutsideAngular(() => {
      this.timer = window.setInterval(() => this.tick(), LOOKAHEAD_INTERVAL_MS);
    });

    if (this.getState().keepAwake) {
      void this.requestWakeLock();
    }
  }

  stop(): void {
    if (!this.getState().isRunning) {
      return;
    }

    this.clearSchedulerTimer();
    this.generation++;
    this.audio.cancelPending(this.generation);
    this.visualQueue.length = 0;

    this.patchState({
      isRunning: false,
      currentBeatIndex: 0,
      currentLevelIndex: 0,
    });
    this.releaseWakeLock();
  }

  toggle(): void {
    if (this.getState().isRunning) {
      this.stop();
    } else {
      void this.start();
    }
  }

  // ============================================================
  // Settings (each persists to localStorage)
  // ============================================================

  setBpm(bpm: number): void {
    this.patchState({ bpm: clampBpm(bpm) });
    this.persistSettings();
  }

  setTimeSignature(signature: TimeSignature): void {
    const { beatsPerBar, denominator } = parseTimeSignature(signature);
    const subdivision = isValidSubdivision(this.getState().subdivision, denominator)
      ? this.getState().subdivision
      : denominator === 4
        ? 'quarter'
        : 'eighth';
    const levelsPerBeat = this.levelsPerBeatFor(subdivision, denominator);
    const groupingPreset = defaultGrouping(beatsPerBar, denominator);

    this.pattern = defaultPattern(beatsPerBar, levelsPerBeat);
    this.patternSubject.next(this.pattern);

    this.patchState({
      timeSignature: signature,
      beatsPerBar,
      denominator,
      subdivision,
      levelsPerBeat,
      groupingPreset,
      accentBeats: computeAccentBeats(beatsPerBar, denominator, groupingPreset),
    });
    this.persistSettings();

    if (this.getState().isRunning) {
      this.reanchorTransport();
    }
  }

  setSubdivision(subdivision: SubdivisionId): void {
    const state = this.getState();
    if (!isValidSubdivision(subdivision, state.denominator)) {
      return;
    }

    const levelsPerBeat = this.levelsPerBeatFor(subdivision, state.denominator);
    this.pattern = defaultPattern(state.beatsPerBar, levelsPerBeat);
    this.patternSubject.next(this.pattern);

    this.patchState({ subdivision, levelsPerBeat });
    this.persistSettings();

    if (state.isRunning) {
      this.reanchorTransport();
    }
  }

  setAccentFirstBeat(on: boolean): void {
    this.patchState({ accentFirstBeat: on });
    this.persistSettings();
  }

  setGrouping(preset: GroupingPreset): void {
    const { beatsPerBar, denominator } = this.getState();
    this.patchState({
      groupingPreset: preset,
      accentBeats: computeAccentBeats(beatsPerBar, denominator, preset),
    });
    this.persistSettings();
  }

  setClickSound(sound: ClickSoundId): void {
    this.patchState({ clickSound: sound });
    this.persistSettings();
  }

  setVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume));
    this.audio.setVolume(clamped);
    this.patchState({ volume: clamped });
    this.persistSettings();
  }

  setKeepAwake(on: boolean): void {
    this.patchState({ keepAwake: on });
    this.persistSettings();
    if (on && this.getState().isRunning) {
      void this.requestWakeLock();
    } else {
      this.releaseWakeLock();
    }
  }

  // ============================================================
  // Pattern grid
  // ============================================================

  toggleCell(beat: number, level: number): void {
    if (this.pattern[beat]?.[level] === undefined) {
      return;
    }
    this.pattern[beat][level] = !this.pattern[beat][level];
    this.patternSubject.next(this.pattern);
  }

  // ============================================================
  // Saved patterns
  // ============================================================

  listPatterns(): SavedPattern[] {
    return this.storage.listPatterns();
  }

  loadPattern(id: string): SavedPattern | null {
    return this.storage.loadPattern(id);
  }

  exportCurrentPattern(name: string): SavedPattern {
    const st = this.getState();
    return {
      id: uid(),
      name,
      updatedAt: Date.now(),
      bpm: st.bpm,
      timeSignature: st.timeSignature,
      subdivision: st.subdivision,
      accentFirstBeat: st.accentFirstBeat,
      groupingPreset: st.groupingPreset,
      clickSound: st.clickSound,
      pattern: this.pattern.map((row) => [...row]),
    };
  }

  savePattern(pattern: SavedPattern): void {
    this.storage.savePattern(pattern);
  }

  deletePattern(id: string): void {
    this.storage.deletePattern(id);
  }

  /** Applies a saved pattern; keeps the transport position if running. */
  applyPattern(pattern: SavedPattern): void {
    const wasRunning = this.getState().isRunning;

    this.setTimeSignature(pattern.timeSignature);
    this.setSubdivision(pattern.subdivision);
    this.setBpm(pattern.bpm);
    this.setAccentFirstBeat(pattern.accentFirstBeat);
    this.setGrouping(pattern.groupingPreset);
    this.setClickSound(pattern.clickSound);

    const st = this.getState();
    this.pattern = normalizePattern(pattern.pattern, st.beatsPerBar, st.levelsPerBeat);
    this.patternSubject.next(this.pattern);

    if (wasRunning) {
      this.reanchorTransport();
    }
  }

  // ============================================================
  // Stopwatch
  // ============================================================

  toggleStopwatch(): void {
    if (this.getState().stopwatchRunning) {
      this.pauseStopwatch();
    } else {
      this.startStopwatch();
    }
  }

  startStopwatch(): void {
    if (this.getState().stopwatchRunning) {
      return;
    }
    this.stopwatchStartedAt = performance.now();
    this.patchState({ stopwatchRunning: true });

    this.zone.runOutsideAngular(() => {
      this.stopwatchTimer = window.setInterval(() => {
        this.patchState({
          elapsedMs:
            this.stopwatchAccumulated + (performance.now() - this.stopwatchStartedAt),
        });
      }, 100);
    });
  }

  pauseStopwatch(): void {
    if (!this.getState().stopwatchRunning) {
      return;
    }
    this.stopwatchAccumulated += performance.now() - this.stopwatchStartedAt;
    this.clearStopwatchTimer();
    this.patchState({
      stopwatchRunning: false,
      elapsedMs: this.stopwatchAccumulated,
    });
  }

  resetStopwatch(): void {
    this.clearStopwatchTimer();
    this.stopwatchAccumulated = 0;
    this.stopwatchStartedAt = 0;
    this.patchState({ stopwatchRunning: false, elapsedMs: 0 });
  }

  // ============================================================
  // Lifecycle — called by the component when the page is left
  // ============================================================

  shutdown(): void {
    this.stop();
    this.resetStopwatch();
    this.releaseWakeLock();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    void this.audio.close();
  }

  // ============================================================
  // Scheduler internals
  // ============================================================

  private tick(): void {
    this.flushVisuals();

    const st = this.getState();
    const now = this.audio.currentTime;
    const stepSec = stepDurationSec(st.bpm, st.denominator, st.levelsPerBeat);
    const horizon = Math.max(0.15, stepSec * 2.5);

    // Drift guard: after background throttling, re-anchor instead of
    // bursting every missed click at once.
    if (this.nextNoteTime < now - 0.15) {
      this.nextNoteTime = now + 0.1;
      this.beatIndex = 0;
      this.levelIndex = 0;
    }

    while (this.nextNoteTime < now + horizon) {
      this.scheduleStep(this.nextNoteTime);
      const next = advanceStep(
        this.beatIndex,
        this.levelIndex,
        st.beatsPerBar,
        st.levelsPerBeat,
      );
      this.beatIndex = next.beatIndex;
      this.levelIndex = next.levelIndex;
      this.nextNoteTime += stepSec;
    }
  }

  private scheduleStep(time: number): void {
    const st = this.getState();
    const enabled = this.pattern[this.beatIndex]?.[this.levelIndex] ?? true;

    // Visual event is queued regardless of audibility so the highlight
    // always matches the clock.
    this.visualQueue.push({
      time,
      beatIndex: this.beatIndex,
      levelIndex: this.levelIndex,
    });

    if (!enabled) {
      return;
    }
    this.audio.playClick(
      time,
      st.clickSound,
      this.clickKindFor(this.beatIndex, this.levelIndex, st),
      this.generation,
    );
  }

  private flushVisuals(): void {
    const now = this.audio.currentTime;
    let last: VisualEvent | undefined;
    while (this.visualQueue.length > 0 && this.visualQueue[0].time <= now) {
      last = this.visualQueue.shift();
    }
    if (last) {
      this.patchState({
        currentBeatIndex: last.beatIndex,
        currentLevelIndex: last.levelIndex,
      });
    }
  }

  private clickKindFor(beat: number, level: number, st: MetronomeState): ClickKind {
    if (level !== 0) {
      return 'sub';
    }
    if (!st.accentFirstBeat) {
      return 'main';
    }
    if (beat === 0) {
      return 'downbeat';
    }
    return st.accentBeats.includes(beat) ? 'accent' : 'main';
  }

  /** Restarts the bar cleanly (no stale scheduled notes, no overlap). */
  private reanchorTransport(): void {
    this.generation++;
    this.audio.cancelPending(this.generation);
    this.visualQueue.length = 0;
    this.nextNoteTime = this.audio.currentTime + 0.1;
    this.beatIndex = 0;
    this.levelIndex = 0;
    this.patchState({ currentBeatIndex: 0, currentLevelIndex: 0 });
  }

  private levelsPerBeatFor(subdivision: SubdivisionId, denominator: 4 | 8): number {
    switch (subdivision) {
      case 'quarter':
        return denominator === 4 ? 1 : 0;
      case 'eighth':
        return denominator === 4 ? 2 : 1;
      case 'triplet':
        return denominator === 4 ? 3 : 0;
      case 'sixteenth':
        return denominator === 4 ? 4 : 2;
    }
  }

  private patchState(patch: Partial<MetronomeState>): void {
    this.stateSubject.next({ ...this.stateSubject.value, ...patch });
  }

  private persistSettings(): void {
    const st = this.getState();
    this.storage.saveSettings({
      bpm: st.bpm,
      timeSignature: st.timeSignature,
      subdivision: st.subdivision,
      accentFirstBeat: st.accentFirstBeat,
      groupingPreset: st.groupingPreset,
      clickSound: st.clickSound,
      volume: st.volume,
      keepAwake: st.keepAwake,
    });
  }

  private clearSchedulerTimer(): void {
    if (this.timer !== undefined) {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private clearStopwatchTimer(): void {
    if (this.stopwatchTimer !== undefined) {
      window.clearInterval(this.stopwatchTimer);
      this.stopwatchTimer = undefined;
    }
  }

  // ============================================================
  // Wake lock (mobile keep-awake)
  // ============================================================

  private async requestWakeLock(): Promise<void> {
    try {
      this.wakeLock = await navigator.wakeLock?.request('screen');
      this.wakeLock?.addEventListener('release', () => {
        this.wakeLock = undefined;
      });
    } catch {
      // Not supported or permission denied — the metronome keeps working.
      this.wakeLock = undefined;
    }
  }

  private releaseWakeLock(): void {
    void this.wakeLock?.release().catch(() => undefined);
    this.wakeLock = undefined;
  }

  private readonly onVisibilityChange = (): void => {
    if (
      document.visibilityState === 'visible' &&
      this.getState().isRunning &&
      this.getState().keepAwake
    ) {
      void this.requestWakeLock();
    }
  };
}
