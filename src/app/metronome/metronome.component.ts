import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  MetronomeService,
  TimeSignature,
  PatternPreset,
  MetronomePatternV1,
  PatternId,
} from './metronome.service';

// ngx-translate
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppTitleService } from '../services/app-title.service';

@Component({
  selector: 'app-metronome',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RouterLink],
  templateUrl: './metronome.component.html',
  styleUrls: ['./metronome.component.scss'],
  providers: [AppTitleService],
})
export class MetronomeComponent implements OnDestroy {
  private metro = inject(MetronomeService);
  private i18n = inject(TranslateService);
  private appTitleService = inject(AppTitleService);

  // state 用 signal 包一层（Angular 21 很适合这样写）
  state = signal(this.metro.getState());

  // 订阅 service 状态
  private sub = this.metro.state$.subscribe((s) => this.state.set(s));

  constructor() {
    this.appTitleService.setTitle('Metronome');
  }

  // ✅ Pattern 列表与当前选中
  patterns = signal<MetronomePatternV1[]>([]);
  activePatternId = signal<PatternId | ''>('');

  // BPM 长按连发
  private bpmHoldTimeout?: number;
  private bpmHoldInterval?: number;

  // UI 数据
  timeSignatures: TimeSignature[] = ['2/4', '3/4', '4/4', '6/8', '8/8'];

  // levels label（显示 1/4 1/8 1/16 等）
  levels = computed(() => {
    const st = this.state();
    return st.denominator === 4
      ? ['1/4', '1/8', '1/16', '1/16']
      : ['1/8', '1/16'];
  });

  presetOptions = [
    { value: 'mainOnly' as PatternPreset, labelKey: 'PRESET_MAIN_ONLY' },
    { value: 'allAnd' as PatternPreset, labelKey: 'PRESET_ALL_AND' },
    {
      value: 'allSixteenth' as PatternPreset,
      labelKey: 'PRESET_ALL_SIXTEENTH',
    },
    {
      value: 'andAndSixteenth' as PatternPreset,
      labelKey: 'PRESET_AND_AND_SIXTEENTH',
    },
  ];

  selectedPreset: PatternPreset = 'mainOnly';

  applyPreset(p: PatternPreset) {
    this.selectedPreset = p;
    this.metro.applyPreset(p);
  }

  // ✅ active = 当前播放到的那一拍（只有这一列显示背景）
  isBeatActiveNow(beat: number): boolean {
    const st = this.state();
    return st.isRunning && st.currentBeatIndex === beat;
  }

  constructor() {
    // i18n 默认英文
    this.i18n.use('en');

    // ✅ 初始化 Pattern 列表 & 自动载入上次使用
    this.refreshPatterns();

    const lastId = this.metro.getActivePatternId();
    if (lastId) {
      const p = this.metro.loadPattern(lastId);
      if (p) {
        this.metro.applyPattern(p);
        // 下拉回显
        this.activePatternId.set(p.id);
        // preset 回显（可选）
        if (p.selectedPreset) this.selectedPreset = p.selectedPreset;
      }
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.stopBpmHold();
  }

  // ===== Pattern UI handlers =====

  refreshPatterns() {
    this.patterns.set(this.metro.listPatterns());
    this.activePatternId.set(this.metro.getActivePatternId() ?? '');
  }

  onSelectPattern(id: string) {
    if (!id) return;
    const p = this.metro.loadPattern(id);
    if (!p) return;
    this.metro.applyPattern(p);
    this.activePatternId.set(p.id);
    if (p.selectedPreset) this.selectedPreset = p.selectedPreset;
    this.refreshPatterns();
  }

  savePatternOverwrite() {
    const id = this.activePatternId();
    if (!id) {
      this.savePatternAs();
      return;
    }

    const existing = this.metro.loadPattern(id);
    if (!existing) {
      this.savePatternAs();
      return;
    }

    // 用同一个 id 覆盖保存
    const current = this.metro.exportCurrentPattern(
      existing.name,
      this.selectedPreset
    );
    const merged = { ...current, id: existing.id, name: existing.name };
    this.metro.savePattern(merged);

    this.activePatternId.set(existing.id);
    this.refreshPatterns();
  }

  savePatternAs() {
    const name = prompt('Pattern name', 'Practice');
    if (!name) return;
    const p = this.metro.exportCurrentPattern(name, this.selectedPreset);
    this.metro.savePattern(p);
    this.activePatternId.set(p.id);
    this.refreshPatterns();
  }

  deletePattern() {
    const id = this.activePatternId();
    if (!id) return;

    const p = this.metro.loadPattern(id);
    const label = p?.name ?? id;

    if (!confirm(`Delete Pattern: ${label} ?`)) return;

    this.metro.deletePattern(id);
    this.activePatternId.set(this.metro.getActivePatternId() ?? '');
    this.refreshPatterns();
  }

  // ===== handlers =====
  toggle() {
    this.metro.toggle();
  }
  stop() {
    this.metro.stop();
  }

  onBpmChange(v: number) {
    this.metro.setBpm(v);
  }
  onSigChange(sig: TimeSignature) {
    this.metro.setTimeSignature(sig);
  }

  onPresetChange(ev: Event) {
    const target = ev.target as HTMLSelectElement | null;
    const value = target?.value as PatternPreset | undefined;
    if (value) this.applyPreset(value);
  }

  onAccentChange(v: boolean) {
    this.metro.setAccentFirstBeat(v);
  }

  toggleCell(beat: number, level: number) {
    this.metro.toggleCell(beat, level);
  }

  get pattern() {
    return this.metro.getPattern();
  }

  // language switch
  setLang(lang: 'en' | 'zh') {
    this.i18n.use(lang);
  }

  // mm:ss.S
  formatElapsed(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${min.toString().padStart(2, '0')}:${sec
      .toString()
      .padStart(2, '0')}.${tenths}`;
  }

  isPlayingCell(beat: number, level: number) {
    const st = this.state();
    return (
      st.isRunning &&
      st.currentBeatIndex === beat &&
      st.currentLevelIndex === level
    );
  }

  groupings() {
    return this.metro.getAvailableGroupings();
  }

  onGroupingChange(preset: any) {
    this.metro.setGrouping(preset);
  }

  cellText(beat: number, level: number): string {
    const st = this.state();
    if (st.denominator === 4) {
      if (level === 0) return String(beat + 1);
      if (level === 1) return 'e';
      if (level === 2) return 'and';
      return 'r';
    }
    return level === 0 ? String(beat + 1) : 'a'; // ✅ 方案B
  }

  levelClass(level: number): string {
    const st = this.state();
    if (st.denominator === 4) {
      return ['lvl-main', 'lvl-e', 'lvl-and', 'lvl-r'][level] ?? '';
    }
    return level === 0 ? 'lvl-main' : 'lvl-a';
  }

  // ✅ 该列是否“active”（任意格开启）
  isBeatActive(beat: number): boolean {
    const col = this.pattern?.[beat];
    return !!col && col.some((v) => v);
  }

  // ✅ 分组起始列（用于极淡标记）：复用 state().accentBeats
  isGroupStart(beat: number): boolean {
    const st = this.state();
    return Array.isArray(st.accentBeats) && st.accentBeats.includes(beat);
  }

  // ✅ BPM 微调
  bpmMinus() {
    this.metro.setBpm(this.state().bpm - 1);
  }
  bpmPlus() {
    this.metro.setBpm(this.state().bpm + 1);
  }

  // ✅ 长按 BPM（手机爽）
  startBpmHold(delta: number, ev?: Event) {
    ev?.preventDefault();
    ev?.stopPropagation();

    // 先立即触发一次
    this.metro.setBpm(this.state().bpm + delta);

    window.clearTimeout(this.bpmHoldTimeout);
    window.clearInterval(this.bpmHoldInterval);

    // 250ms 后开始连发
    this.bpmHoldTimeout = window.setTimeout(() => {
      let ticks = 0;
      this.bpmHoldInterval = window.setInterval(() => {
        ticks++;
        // 按久一点自动加速：1 -> 2 -> 5
        const accel = ticks > 18 ? 5 : ticks > 10 ? 2 : 1;
        this.metro.setBpm(this.state().bpm + delta * accel);
      }, 90);
    }, 250);
  }

  stopBpmHold() {
    window.clearTimeout(this.bpmHoldTimeout);
    window.clearInterval(this.bpmHoldInterval);
    this.bpmHoldTimeout = undefined;
    this.bpmHoldInterval = undefined;
  }

  // ✅ 秒表控制（独立于节拍器播放）
  toggleStopwatch() {
    this.metro.toggleStopwatch();
  }
  resetStopwatch() {
    this.metro.resetStopwatch();
  }
}
