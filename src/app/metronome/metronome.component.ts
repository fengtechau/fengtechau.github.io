import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MetronomeService,
  TimeSignature,
  PatternPreset,
} from './metronome.service';

// ngx-translate
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-metronome',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './metronome.component.html',
  styleUrls: ['./metronome.component.scss'],
})
export class MetronomeComponent {
  private metro = inject(MetronomeService);
  private i18n = inject(TranslateService);

  // state 用 signal 包一层（Angular 21 很适合这样写）
  state = signal(this.metro.getState());

  // 订阅 service 状态
  private sub = this.metro.state$.subscribe((s) => this.state.set(s));

  // UI 数据
  timeSignatures: TimeSignature[] = ['2/4', '3/4', '4/4', '4/8', '6/8', '8/8'];

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
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
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

  // ✅ 8分母显示方案B：用 a

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

  // ✅ BPM 微调
  bpmMinus() {
    this.metro.setBpm(this.state().bpm - 1);
  }
  bpmPlus() {
    this.metro.setBpm(this.state().bpm + 1);
  }

  // ✅ 秒表控制（独立于节拍器播放）
  toggleStopwatch() {
    this.metro.toggleStopwatch();
  }
  resetStopwatch() {
    this.metro.resetStopwatch();
  }
}
