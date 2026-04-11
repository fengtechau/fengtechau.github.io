import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';

export type TimeSignature = `${number}/${4 | 8}`;
export type Denominator = 4 | 8;
export type PatternPreset =
  | 'mainOnly'
  | 'allAnd'
  | 'allSixteenth'
  | 'andAndSixteenth';

export type GroupingPreset =
  | 'none'
  // 6/8 常用
  | '3+3'
  | '2+2+2'
  // 8/8 常用
  | '2+2+2+2'
  | '3+3+2'
  | '2+3+3'
  | '3+2+3';

export type PatternId = string;

export interface MetronomePatternV1 {
  id: PatternId;
  name: string;
  updatedAt: number;

  bpm: number;
  timeSignature: TimeSignature;
  accentFirstBeat: boolean;
  groupingPreset: GroupingPreset;

  // UI 当前选中的 preset（可选，仅用于下拉回显）
  selectedPreset?: PatternPreset;

  // pattern[beat][level]
  pattern: boolean[][];
}

export interface MetronomeState {
  isRunning: boolean;
  bpm: number;
  timeSignature: TimeSignature;
  accentFirstBeat: boolean;

  beatsPerBar: number;
  denominator: Denominator;

  // UI 高亮用
  currentBeatIndex: number; // 0..beatsPerBar-1
  currentLevelIndex: number; // 0..levels-1

  // stopwatch
  elapsedMs: number;
  stopwatchRunning: boolean;

  // grouping / accent
  groupingPreset: GroupingPreset;
  accentBeats: number[]; // 0-based: 哪些 beat 是分组起始
}

interface ClickSpec {
  freq: number;
  type: OscillatorType;
  gain: number;
  durationMs: number;
}

const LS_PATTERNS = 'metronome.patterns.v1';
const LS_ACTIVE_ID = 'metronome.patterns.activeId.v1';

@Injectable({ providedIn: 'root' })
export class MetronomeService {
  // ======= Scheduler tuning =======
  private readonly lookaheadMs = 25;
  private readonly scheduleAheadTime = 0.12; // sec

  // ======= WebAudio =======
  private audioCtx?: AudioContext;
  private masterGain?: GainNode;

  // ======= Scheduler state =======
  private nextNoteTime = 0;
  private schedulerSub?: Subscription;

  // 当前小节位置（内部）
  private beatIndex = 0;
  private levelIndex = 0;

  // ======= Stopwatch =======
  private stopwatchSub?: Subscription;
  private stopwatchStartAt = 0;
  private stopwatchAccumulated = 0;

  // ======= Pattern =======
  // pattern[beat][level] -> true=响, false=静音
  private pattern: boolean[][] = [];

  // ======= State stream =======
  private stateSubject = new BehaviorSubject<MetronomeState>({
    isRunning: false,
    bpm: 120,
    timeSignature: '4/4',
    accentFirstBeat: true,

    beatsPerBar: 4,
    denominator: 4,

    currentBeatIndex: 0,
    currentLevelIndex: 0,

    elapsedMs: 0,
    stopwatchRunning: false,

    groupingPreset: 'none',
    accentBeats: [0],
  });

  readonly state$ = this.stateSubject.asObservable();

  constructor(private zone: NgZone) {
    this.rebuildPattern();
    // 初始化时同步一次 grouping / accentBeats
    this.setGrouping(this.getState().groupingPreset);
  }

  // =========================================================
  // Public API
  // =========================================================

  getState(): MetronomeState {
    return this.stateSubject.value;
  }

  getPattern(): boolean[][] {
    return this.pattern;
  }

  /** 分母决定 stack 层级数 */
  getLevels(): string[] {
    return this.getState().denominator === 4
      ? ['q', 'e', 'and', 'a']
      : ['eighth', 'sixteenth'];
  }

  getAvailableGroupings(): GroupingPreset[] {
    const st = this.getState();
    if (st.denominator !== 8) return ['none'];

    if (st.beatsPerBar === 6) return ['none', '3+3', '2+2+2'];
    if (st.beatsPerBar === 8) {
      return ['none', '2+2+2+2', '3+3+2', '2+3+3', '3+2+3'];
    }

    return ['none'];
  }

  setBpm(bpm: number) {
    const next = Math.max(20, Math.min(300, Math.round(bpm)));
    this.patchState({ bpm: next });
  }

  setTimeSignature(sig: TimeSignature) {
    this.patchState({ timeSignature: sig });
    this.rebuildPattern();

    const st = this.getState();

    const defaultGrouping: GroupingPreset =
      st.denominator === 8
        ? st.beatsPerBar === 6
          ? '3+3'
          : st.beatsPerBar === 8
            ? '3+3+2'
            : 'none'
        : 'none';

    this.setGrouping(defaultGrouping);

    if (st.isRunning) {
      this.resetTransport();
    }
  }

  setAccentFirstBeat(on: boolean) {
    this.patchState({ accentFirstBeat: on });
  }

  setGrouping(preset: GroupingPreset) {
    this.patchState({
      groupingPreset: preset,
      accentBeats: this.computeAccentBeats(preset),
    });
  }

  applyPreset(preset: PatternPreset) {
    const st = this.getState();
    const beats = st.beatsPerBar;
    const denom = st.denominator;

    // 先全部重置为：只有主拍开启
    for (let b = 0; b < beats; b++) {
      for (let l = 0; l < this.pattern[b].length; l++) {
        this.pattern[b][l] = l === 0;
      }
    }

    if (preset !== 'mainOnly') {
      if (denom === 4) {
        // levels: [0:主拍, 1:e, 2:&, 3:a]
        if (preset === 'allAnd' || preset === 'andAndSixteenth') {
          for (let b = 0; b < beats; b++) this.pattern[b][2] = true;
        }
        if (preset === 'allSixteenth' || preset === 'andAndSixteenth') {
          for (let b = 0; b < beats; b++) {
            this.pattern[b][1] = true; // e
            this.pattern[b][3] = true; // a
          }
        }
      } else {
        // denom=8: [0:主拍(八分), 1:细分(十六分)]
        if (preset === 'allSixteenth' || preset === 'andAndSixteenth') {
          for (let b = 0; b < beats; b++) {
            this.pattern[b][1] = true;
          }
        }
      }
    }

    // 通知 UI 刷新
    this.patchState({
      currentBeatIndex: this.getState().currentBeatIndex,
      currentLevelIndex: this.getState().currentLevelIndex,
    });
  }

  toggleCell(beat: number, level: number) {
    if (!this.pattern[beat] || this.pattern[beat][level] === undefined) return;
    this.pattern[beat][level] = !this.pattern[beat][level];

    this.patchState({
      currentBeatIndex: this.getState().currentBeatIndex,
      currentLevelIndex: this.getState().currentLevelIndex,
    });
  }

  setAll(on: boolean) {
    for (let b = 0; b < this.pattern.length; b++) {
      for (let l = 0; l < this.pattern[b].length; l++) {
        this.pattern[b][l] = on;
      }
    }

    this.patchState({
      currentBeatIndex: this.getState().currentBeatIndex,
      currentLevelIndex: this.getState().currentLevelIndex,
    });
  }

  async start() {
    if (this.getState().isRunning) return;

    await this.ensureAudio();
    this.resetTransport();
    this.patchState({ isRunning: true });

    this.zone.runOutsideAngular(() => {
      this.schedulerSub = interval(this.lookaheadMs).subscribe(() => {
        this.schedulerTick();
      });
    });
  }

  stop() {
    if (!this.getState().isRunning) return;

    this.schedulerSub?.unsubscribe();
    this.schedulerSub = undefined;

    this.patchState({
      isRunning: false,
      currentBeatIndex: 0,
      currentLevelIndex: 0,
    });
  }

  toggle() {
    if (this.getState().isRunning) this.stop();
    else void this.start();
  }

  // =========================================================
  // Transport / Scheduler
  // =========================================================

  public resetTransport() {
    const now = this.audioCtx?.currentTime ?? 0;
    this.nextNoteTime = now + 0.05;

    this.beatIndex = 0;
    this.levelIndex = 0;

    this.patchState({
      currentBeatIndex: 0,
      currentLevelIndex: 0,
    });
  }

  private schedulerTick() {
    const ctx = this.audioCtx!;
    while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleCurrentStep(this.nextNoteTime);
      this.advanceStep();
    }
  }

  private scheduleCurrentStep(time: number) {
    const st = this.getState();
    const enabled = this.pattern[this.beatIndex]?.[this.levelIndex] ?? true;

    // UI 高亮：不管是否发声，都更新
    this.zone.run(() => {
      this.patchState({
        currentBeatIndex: this.beatIndex,
        currentLevelIndex: this.levelIndex,
      });
    });

    if (!enabled) return;

    const spec = this.getClickSpec(this.beatIndex, this.levelIndex, st);
    this.playClick(time, spec);
  }

  private advanceStep() {
    const st = this.getState();
    const levelsPerBeat = this.getLevelsPerBeat(st);
    const stepSec = this.getStepDurationSec(st);

    this.nextNoteTime += stepSec;

    this.levelIndex++;
    if (this.levelIndex >= levelsPerBeat) {
      this.levelIndex = 0;
      this.beatIndex++;

      if (this.beatIndex >= st.beatsPerBar) {
        this.beatIndex = 0;
      }
    }
  }

  // =========================================================
  // Timing helpers
  // =========================================================

  private getLevelsPerBeat(state = this.getState()): number {
    return state.denominator === 4 ? 4 : 2;
  }

  /**
   * 一个“拍”的时值，严格按分母决定：
   * - x/4 -> 1 beat = quarter note
   * - x/8 -> 1 beat = eighth note
   */
  private getBeatDurationSec(state = this.getState()): number {
    return (60 / state.bpm) * (4 / state.denominator);
  }

  /**
   * 最小 step 时值：
   * - denominator=4: 每拍 4 格（1, e, &, a）
   * - denominator=8: 每拍 2 格（1, &）
   */
  private getStepDurationSec(state = this.getState()): number {
    return this.getBeatDurationSec(state) / this.getLevelsPerBeat(state);
  }

  // =========================================================
  // Accent / click model
  // =========================================================

  private computeAccentBeats(preset: GroupingPreset): number[] {
    const { beatsPerBar, denominator } = this.getState();

    // 非 8 分拍号：概念上只有 bar 首拍
    if (denominator !== 8) return [0];
    if (preset === 'none') return [0];

    const groups = preset
      .split('+')
      .map((x) => Number.parseInt(x.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (!groups.length) return [0];

    const starts: number[] = [0];
    let cursor = 0;

    // 只推下一组的起点
    for (let i = 0; i < groups.length - 1; i++) {
      cursor += groups[i];
      if (cursor < beatsPerBar) starts.push(cursor);
    }

    return [...new Set(starts)]
      .filter((b) => b >= 0 && b < beatsPerBar)
      .sort((a, b) => a - b);
  }

  /** bar 的绝对首拍（最重） */
  private isDownbeat(
    beatIndex: number,
    levelIndex: number,
    state = this.getState(),
  ): boolean {
    return state.accentFirstBeat && beatIndex === 0 && levelIndex === 0;
  }

  /** 组首拍 / 首拍（但不包含 subdivision） */
  private isAccentMainBeat(
    beatIndex: number,
    levelIndex: number,
    state = this.getState(),
  ): boolean {
    if (!state.accentFirstBeat) return false;
    if (levelIndex !== 0) return false;

    if (state.denominator === 8) {
      return state.accentBeats.includes(beatIndex);
    }

    return beatIndex === 0;
  }

  /**
   * 统一返回当前 step 的音色。
   * 目标：
   * - downbeat > group accent > normal main > offbeat > sub
   * - 高速时也能明显分辨
   */
  private getClickSpec(
    beatIndex: number,
    levelIndex: number,
    state = this.getState(),
  ): ClickSpec {
    const isMain = levelIndex === 0;
    const isDownbeat = this.isDownbeat(beatIndex, levelIndex, state);
    const isAccent = this.isAccentMainBeat(beatIndex, levelIndex, state);

    if (isMain) {
      if (isDownbeat) {
        return {
          freq: 1900,
          type: 'square',
          gain: 0.95,
          durationMs: 28,
        };
      }

      if (isAccent) {
        return {
          freq: 1450,
          type: 'square',
          gain: 0.82,
          durationMs: 24,
        };
      }

      return {
        freq: 980,
        type: 'square',
        gain: 0.62,
        durationMs: 20,
      };
    }

    // denominator=4 时，level=2 才是 "&"
    const isEighthOffbeat = state.denominator === 4 && levelIndex === 2;

    if (isEighthOffbeat) {
      return {
        freq: 760,
        type: 'triangle',
        gain: 0.42,
        durationMs: 16,
      };
    }

    // 其余 subdivision：更轻、更短
    return {
      freq: state.denominator === 4 ? 620 : 700,
      type: 'sine',
      gain: 0.24,
      durationMs: 12,
    };
  }

  // =========================================================
  // Audio
  // =========================================================

  private async ensureAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.85;
      this.masterGain.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  private playClick(time: number, spec: ClickSpec) {
    const ctx = this.audioCtx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, time);

    // 快起快落，清脆 click
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(spec.gain, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      time + spec.durationMs / 1000,
    );

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(time);
    osc.stop(time + spec.durationMs / 1000 + 0.01);
  }

  // =========================================================
  // Stopwatch
  // =========================================================

  toggleStopwatch() {
    if (this.getState().stopwatchRunning) this.pauseStopwatch();
    else this.startStopwatch();
  }

  startStopwatch() {
    if (this.getState().stopwatchRunning) return;

    this.stopwatchStartAt = performance.now();
    this.patchState({ stopwatchRunning: true });

    this.stopwatchSub?.unsubscribe();

    this.zone.runOutsideAngular(() => {
      this.stopwatchSub = interval(100).subscribe(() => {
        const elapsed =
          this.stopwatchAccumulated +
          (performance.now() - this.stopwatchStartAt);

        this.zone.run(() => {
          this.patchState({ elapsedMs: elapsed });
        });
      });
    });
  }

  pauseStopwatch() {
    if (!this.getState().stopwatchRunning) return;

    this.stopwatchAccumulated += performance.now() - this.stopwatchStartAt;
    this.stopwatchSub?.unsubscribe();
    this.stopwatchSub = undefined;

    this.patchState({
      stopwatchRunning: false,
      elapsedMs: this.stopwatchAccumulated,
    });
  }

  resetStopwatch() {
    this.stopwatchSub?.unsubscribe();
    this.stopwatchSub = undefined;
    this.stopwatchAccumulated = 0;
    this.stopwatchStartAt = 0;

    this.patchState({
      stopwatchRunning: false,
      elapsedMs: 0,
    });
  }

  // =========================================================
  // Pattern persistence
  // =========================================================

  listPatterns(): MetronomePatternV1[] {
    const map = this.getPatternsMap();
    return Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getActivePatternId(): PatternId | null {
    return localStorage.getItem(LS_ACTIVE_ID);
  }

  setActivePatternId(id: PatternId) {
    localStorage.setItem(LS_ACTIVE_ID, id);
  }

  loadPattern(id: PatternId): MetronomePatternV1 | null {
    const map = this.getPatternsMap();
    return map[id] ?? null;
  }

  deletePattern(id: PatternId) {
    const map = this.getPatternsMap();
    delete map[id];
    this.setPatternsMap(map);

    if (this.getActivePatternId() === id) {
      localStorage.removeItem(LS_ACTIVE_ID);
    }
  }

  exportCurrentPattern(
    name: string,
    selectedPreset?: PatternPreset,
  ): MetronomePatternV1 {
    const st = this.getState();

    return {
      id: uid(),
      name,
      updatedAt: Date.now(),
      bpm: st.bpm,
      timeSignature: st.timeSignature,
      accentFirstBeat: st.accentFirstBeat,
      groupingPreset: st.groupingPreset,
      selectedPreset,
      pattern: deepClonePattern(this.pattern),
    };
  }

  savePattern(p: MetronomePatternV1) {
    const map = this.getPatternsMap();
    map[p.id] = { ...p, updatedAt: Date.now() };
    this.setPatternsMap(map);
    this.setActivePatternId(p.id);
  }

  /**
   * 应用 Pattern：
   * 1) 先 setTimeSignature 触发 rebuildPattern / default grouping
   * 2) 再 setBpm / accent / grouping
   * 3) 最后覆盖 pattern 矩阵（并归一尺寸）
   */
  applyPattern(p: MetronomePatternV1) {
    const wasRunning = this.getState().isRunning;

    this.setTimeSignature(p.timeSignature);
    this.setBpm(p.bpm);
    this.setAccentFirstBeat(p.accentFirstBeat);
    this.setGrouping(p.groupingPreset ?? 'none');

    const st = this.getState();
    const levels = st.denominator === 4 ? 4 : 2;
    this.pattern = normalizePattern(p.pattern ?? [], st.beatsPerBar, levels);

    this.setActivePatternId(p.id);

    if (wasRunning) {
      this.resetTransport();
    } else {
      this.patchState({
        currentBeatIndex: this.getState().currentBeatIndex,
        currentLevelIndex: this.getState().currentLevelIndex,
      });
    }
  }

  // =========================================================
  // Internal utils
  // =========================================================

  private rebuildPattern() {
    const sig = this.getState().timeSignature;
    const [beatsStr, denomStr] = sig.split('/');

    const beatsPerBar = Number.parseInt(beatsStr, 10);
    const denominator = Number.parseInt(denomStr, 10) as 4 | 8;
    const levels = denominator === 4 ? 4 : 2;

    // 默认：只启用主拍
    this.pattern = Array.from({ length: beatsPerBar }, () =>
      Array.from({ length: levels }, (_, idx) => idx === 0),
    );

    this.patchState({ beatsPerBar, denominator });
  }

  private patchState(patch: Partial<MetronomeState>) {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...patch,
    });
  }

  private getPatternsMap(): Record<PatternId, MetronomePatternV1> {
    return safeJsonParse<Record<PatternId, MetronomePatternV1>>(
      localStorage.getItem(LS_PATTERNS),
      {},
    );
  }

  private setPatternsMap(map: Record<PatternId, MetronomePatternV1>) {
    localStorage.setItem(LS_PATTERNS, JSON.stringify(map));
  }
}

// =========================================================
// Helper functions
// =========================================================

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function deepClonePattern(p: boolean[][]): boolean[][] {
  return p.map((row) => row.slice());
}

function normalizePattern(
  incoming: boolean[][],
  beatsPerBar: number,
  levels: number,
): boolean[][] {
  return Array.from({ length: beatsPerBar }, (_, b) => {
    const srcRow = incoming?.[b] ?? [];
    return Array.from({ length: levels }, (_, l) => !!srcRow[l]);
  });
}
