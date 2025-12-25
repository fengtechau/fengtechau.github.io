import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';

export type TimeSignature = `${number}/${4 | 8}`;
export type Denominator = 4 | 8;
export type PatternPreset =
  | 'mainOnly'
  | 'allAnd'
  | 'allSixteenth'
  | 'andAndSixteenth';

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

  // 计时器
  elapsedMs: number;

  groupingPreset: GroupingPreset;
  accentBeats: number[]; // 0-based: 哪些 beat 是分组起始（用于UI或调试）
  stopwatchRunning: boolean;
}

@Injectable({ providedIn: 'root' })
export class MetronomeService {
  // ======= 可调参数 =======
  private lookaheadMs = 25; // 调度循环间隔
  private scheduleAheadTime = 0.12; // 预排未来 120ms 音符
  private clickMs = 30; // 每个 click 持续时间

  // ======= WebAudio =======
  private audioCtx?: AudioContext;
  private masterGain?: GainNode;

  // ======= 调度状态 =======
  private nextNoteTime = 0;
  private schedulerSub?: Subscription;

  // 当前小节位置（内部）
  private beatIndex = 0;
  private levelIndex = 0;

  // 计时器
  private timerSub?: Subscription;
  private timerStartAt = 0;

  private stopwatchSub?: Subscription;
  private stopwatchStartAt = 0;
  private stopwatchAccumulated = 0; // 暂停后累计

  // ======= pattern =======
  // pattern[beat][level] -> true=响, false=静音
  private pattern: boolean[][] = [];

  // ======= 状态流 =======
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
    groupingPreset: 'none',
    accentBeats: [0],
    stopwatchRunning: false,
  });
  state$ = this.stateSubject.asObservable();

  constructor(private zone: NgZone) {
    this.rebuildPattern();
  }

  // ============ Public API ============

  applyPreset(preset: PatternPreset) {
    const st = this.getState();
    const beats = st.beatsPerBar;
    const denom = st.denominator;

    // 先重置为 “只有主拍”
    for (let b = 0; b < beats; b++) {
      for (let l = 0; l < this.pattern[b].length; l++) {
        this.pattern[b][l] = l === 0;
      }
    }

    if (preset === 'mainOnly') return;

    if (denom === 4) {
      // denom=4: levels = [0:main(number), 1:e(1/16), 2:and(1/8), 3:r(1/16)]
      if (preset === 'allAnd' || preset === 'andAndSixteenth') {
        for (let b = 0; b < beats; b++) this.pattern[b][2] = true; // and
      }
      if (preset === 'allSixteenth' || preset === 'andAndSixteenth') {
        for (let b = 0; b < beats; b++) {
          this.pattern[b][1] = true; // e
          this.pattern[b][3] = true; // r
        }
      }
    } else {
      // denom=8: levels = [0:number, 1:a(1/16)]
      // “and” 不存在，忽略即可
      if (preset === 'allSixteenth' || preset === 'andAndSixteenth') {
        for (let b = 0; b < beats; b++) this.pattern[b][1] = true; // a
      }
    }
  }

  getState(): MetronomeState {
    return this.stateSubject.value;
  }
  getPattern(): boolean[][] {
    return this.pattern;
  }

  /** 分母决定 stack 层级数 */
  getLevels(): string[] {
    const { denominator } = this.getState();
    return denominator === 4 ? ['q', 'e', 's16a', 's16b'] : ['e', 's16'];
  }

  getAvailableGroupings(): GroupingPreset[] {
    const st = this.getState();
    if (st.denominator !== 8) return ['none'];

    if (st.beatsPerBar === 6) return ['none', '3+3', '2+2+2'];
    if (st.beatsPerBar === 8)
      return ['none', '2+2+2+2', '3+3+2', '2+3+3', '3+2+3'];

    return ['none'];
  }

  setBpm(bpm: number) {
    bpm = Math.max(20, Math.min(300, Math.round(bpm)));
    this.patchState({ bpm });
  }

  setTimeSignature(sig: TimeSignature) {
    this.patchState({ timeSignature: sig });
    this.rebuildPattern();
    // 如果正在播放：重置到小节起点，避免错位
    if (this.getState().isRunning) this.resetTransport();

    // 自动给分母=8 的拍号一个合理默认分组（你也可以改成 always 'none'）
    const st = this.getState();
    if (st.denominator === 8) {
      const defaultGrouping: GroupingPreset =
        st.beatsPerBar === 6 ? '3+3' : st.beatsPerBar === 8 ? '3+3+2' : 'none';
      this.setGrouping(defaultGrouping);
    } else {
      this.setGrouping('none');
    }
  }

  setAccentFirstBeat(on: boolean) {
    this.patchState({ accentFirstBeat: on });
  }

  setGrouping(preset: GroupingPreset) {
    this.patchState({ groupingPreset: preset });
    const accentBeats = this.computeAccentBeats(preset);
    this.patchState({ accentBeats });
  }

  private computeAccentBeats(preset: GroupingPreset): number[] {
    const { beatsPerBar, denominator } = this.getState();
    if (denominator !== 8) return [0]; // 分母非8：默认只第1拍有“概念上的起点”

    if (preset === 'none') return [0];

    const groups = preset
      .split('+')
      .map((x) => parseInt(x, 10))
      .filter((n) => !isNaN(n) && n > 0);
    const beats: number[] = [];

    let pos = 0;
    beats.push(0);
    for (let i = 0; i < groups.length; i++) {
      pos += groups[i];
      if (pos < beatsPerBar) beats.push(pos);
    }
    // 防御：确保不超出小节长度
    return Array.from(new Set(beats))
      .filter((b) => b >= 0 && b < beatsPerBar)
      .sort((a, b) => a - b);
  }

  toggleCell(beat: number, level: number) {
    if (!this.pattern[beat] || this.pattern[beat][level] === undefined) return;
    this.pattern[beat][level] = !this.pattern[beat][level];
    this.patchState({ currentBeatIndex: this.getState().currentBeatIndex });
  }

  /** 全部开启/全部静音（可选功能） */
  setAll(on: boolean) {
    for (let b = 0; b < this.pattern.length; b++) {
      for (let l = 0; l < this.pattern[b].length; l++) {
        this.pattern[b][l] = on;
      }
    }
  }

  async start() {
    if (this.getState().isRunning) return;
    await this.ensureAudio();

    this.resetTransport();
    this.patchState({ isRunning: true });

    // 用 NgZone.runOutsideAngular 减少变更检测压力
    this.zone.runOutsideAngular(() => {
      this.schedulerSub = interval(this.lookaheadMs).subscribe(() =>
        this.schedulerTick()
      );
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

  // ============ Internal: Pattern / Transport ============

  private rebuildPattern() {
    const sig = this.getState().timeSignature;
    const [beatsStr, denomStr] = sig.split('/');
    const beatsPerBar = parseInt(beatsStr, 10);
    const denominator = parseInt(denomStr, 10) as 4 | 8;

    const levels = denominator === 4 ? 4 : 2;

    // ✅ 默认：只启用主拍(level 0)
    this.pattern = Array.from({ length: beatsPerBar }, () =>
      Array.from({ length: levels }, (_v, idx) => idx === 0)
    );

    this.patchState({ beatsPerBar, denominator });
  }

  public resetTransport() {
    // 以 “当前时间 + 少量偏移” 作为起点更稳
    const now = this.audioCtx?.currentTime ?? 0;
    this.nextNoteTime = now + 0.05;

    this.beatIndex = 0;
    this.levelIndex = 0;

    this.patchState({
      currentBeatIndex: 0,
      currentLevelIndex: 0,
    });
  }

  // ============ Internal: Scheduler ============

  private schedulerTick() {
    const ctx = this.audioCtx!;
    while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleCurrentStep(this.nextNoteTime);
      this.advanceStep();
    }
  }

  /**
   * 当前 step 对应某一个 beat 的某一层（level）。
   * - denom=4: 每拍 4 层（1/4, 1/8, 1/16, 1/16）
   * - denom=8: 每拍 2 层（1/8, 1/16）
   */
  private scheduleCurrentStep(time: number) {
    const st = this.getState();
    const enabled = this.pattern[this.beatIndex]?.[this.levelIndex] ?? true;
    if (!enabled) {
      // 仍然更新 UI 高亮
      this.zone.run(() => {
        this.patchState({
          currentBeatIndex: this.beatIndex,
          currentLevelIndex: this.levelIndex,
        });
      });
      return;
    }

    // 选择不同音色/频率
    const isFirstBeat = this.beatIndex === 0;
    const isMainLevel =
      st.denominator === 4 ? this.levelIndex === 0 : this.levelIndex === 0;
    const isOffbeatLevel = st.denominator === 4 ? this.levelIndex === 1 : false;
    const isSixteenthLevel =
      st.denominator === 4
        ? this.levelIndex === 2 || this.levelIndex === 3
        : this.levelIndex === 1;

    let freq = 880;
    let type: OscillatorType = 'square';
    let gain = 0.7;

    if (isMainLevel) {
      // 是否属于分组重音拍
      const isGroupAccent =
        st.denominator === 8 && st.accentBeats?.includes(this.beatIndex);

      // 强度分级
      const downbeatExtra = isFirstBeat && st.accentFirstBeat;
      const groupAccent = isGroupAccent;

      type = 'square';

      if (downbeatExtra) {
        // 第一拍额外更高
        freq = 1200;
        gain = 0.95;
      } else if (groupAccent) {
        // 分组起始拍
        freq = 1000;
        gain = 0.82;
      } else {
        // 普通主拍
        freq = 900;
        gain = 0.72;
      }
    } else if (isOffbeatLevel) {
      type = 'triangle'; // 反拍（三角波）
      freq = 700;
      gain = 0.55;
    } else if (isSixteenthLevel) {
      type = 'sine'; // 细分滴答（更轻）
      freq = 1000;
      gain = 0.35;
    }

    this.playClick(time, freq, type, gain);

    // UI 高亮：放回 Angular 区域
    this.zone.run(() => {
      this.patchState({
        currentBeatIndex: this.beatIndex,
        currentLevelIndex: this.levelIndex,
      });
    });
  }

  private advanceStep() {
    const st = this.getState();
    const levelsPerBeat = st.denominator === 4 ? 4 : 2;

    // 计算每个 level 的间隔
    // denom=4: 一拍=四分音符，level 间隔= 1/4拍、1/8拍、1/16拍...
    // 简化：把每拍均分为 levelsPerBeat 份（对 denom=4 等价于 16 分分辨率不足？）
    // 这里我们按：
    // - denom=4: level 时值分别为：四分(1), 八分(1/2), 十六(1/4), 十六(1/4) -> 总和=2? 不对
    // 所以我们用“最小分辨率”为 1/16（或 denom=8 时为 1/16），来推进更准确：
    const secPerBeat = 60 / st.bpm; // 这里的 beat 以“分母单位”为基准：
    // - denom=4: beat=1/4
    // - denom=8: beat=1/8（音乐学上 6/8 常按 2 拍，但你 UI 要 6 列，所以按 1/8 列推进）
    // level 的推进：按 1/16 的粒度推进
    const stepSec = st.denominator === 4 ? secPerBeat / 4 : secPerBeat / 2;

    this.nextNoteTime += stepSec;

    // 更新索引
    this.levelIndex++;
    if (this.levelIndex >= levelsPerBeat) {
      this.levelIndex = 0;
      this.beatIndex++;
      if (this.beatIndex >= st.beatsPerBar) {
        this.beatIndex = 0;
      }
    }
  }

  // ============ Internal: Audio ============

  private async ensureAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  private playClick(
    time: number,
    freq: number,
    type: OscillatorType,
    gainAmount: number
  ) {
    const ctx = this.audioCtx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    // 简单包络：快起快落，像 click
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(gainAmount, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + this.clickMs / 1000);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(time);
    osc.stop(time + this.clickMs / 1000 + 0.01);
  }

  // ============ Timer (stopwatch) ============

  toggleStopwatch() {
    const st = this.getState();
    if (st.stopwatchRunning) this.pauseStopwatch();
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
        this.zone.run(() => this.patchState({ elapsedMs: elapsed }));
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
    this.patchState({ stopwatchRunning: false, elapsedMs: 0 });
  }

  private patchState(patch: Partial<MetronomeState>) {
    this.stateSubject.next({ ...this.stateSubject.value, ...patch });
  }

  /** 读取全部 Pattern（map） */
  private getPatternsMap(): Record<PatternId, MetronomePatternV1> {
    return safeJsonParse<Record<PatternId, MetronomePatternV1>>(
      localStorage.getItem(LS_PATTERNS),
      {}
    );
  }

  /** 写入全部 Pattern（map） */
  private setPatternsMap(map: Record<PatternId, MetronomePatternV1>) {
    localStorage.setItem(LS_PATTERNS, JSON.stringify(map));
  }

  /** 列表（按更新时间倒序） */
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

  /** 导出当前状态为 Pattern（可用于另存为/覆盖保存） */
  exportCurrentPattern(
    name: string,
    selectedPreset?: PatternPreset
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

  /** 保存 Pattern（若传入 id 则覆盖） */
  savePattern(p: MetronomePatternV1) {
    const map = this.getPatternsMap();
    map[p.id] = { ...p, updatedAt: Date.now() };
    this.setPatternsMap(map);
    this.setActivePatternId(p.id);
  }

  /**
   * 应用 Pattern：
   * 1) 先 setTimeSignature 触发 rebuildPattern / grouping 默认
   * 2) 再 setBpm / accent / grouping
   * 3) 最后把 pattern 矩阵覆盖进去（并做尺寸归一）
   */
  applyPattern(p: MetronomePatternV1) {
    // 先切拍号（会 rebuildPattern）
    this.setTimeSignature(p.timeSignature);

    // 再设基础参数
    this.setBpm(p.bpm);
    this.setAccentFirstBeat(p.accentFirstBeat);

    // grouping 会重算 accentBeats
    this.setGrouping(p.groupingPreset ?? 'none');

    // 按新拍号的 beats/levels 归一化 pattern 尺寸
    const st = this.getState();
    const levels = st.denominator === 4 ? 4 : 2;
    this.pattern = normalizePattern(p.pattern ?? [], st.beatsPerBar, levels);

    // active id 记录
    this.setActivePatternId(p.id);

    // 如果正在播放，避免错位：建议回到小节起点
    if (st.isRunning) this.resetTransport();
  }
}

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

// ===== Pattern persistence (localStorage) =====

export type PatternId = string;

export interface MetronomePatternV1 {
  id: PatternId;
  name: string;
  updatedAt: number;

  bpm: number;
  timeSignature: TimeSignature;
  accentFirstBeat: boolean;
  groupingPreset: GroupingPreset;

  // UI 里当前选中的 preset（可选，仅用于下拉回显）
  selectedPreset?: PatternPreset;

  // 核心：你的 pattern 矩阵
  pattern: boolean[][];
}

const LS_PATTERNS = 'metronome.patterns.v1';
const LS_ACTIVE_ID = 'metronome.patterns.activeId.v1';

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
  levels: number
): boolean[][] {
  const out: boolean[][] = Array.from({ length: beatsPerBar }, (_, b) => {
    const srcRow = incoming?.[b] ?? [];
    return Array.from({ length: levels }, (_, l) => !!srcRow[l]);
  });

  // 如果你希望默认主拍为 true（当缺失时），可打开下面逻辑：
  // for (let b = 0; b < beatsPerBar; b++) out[b][0] = out[b][0] ?? true;

  return out;
}
