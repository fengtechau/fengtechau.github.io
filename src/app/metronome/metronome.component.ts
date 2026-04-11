import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import {
  GroupingPreset,
  MetronomePatternV1,
  MetronomeService,
  PatternId,
  PatternPreset,
  TimeSignature,
} from './metronome.service';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppTitleService } from '../services/app-title.service';

@Component({
  selector: 'app-metronome',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './metronome.component.html',
  styleUrls: ['./metronome.component.scss'],
  providers: [AppTitleService],
})
export class MetronomeComponent implements OnDestroy {
  private readonly metro = inject(MetronomeService);
  private readonly i18n = inject(TranslateService);
  private readonly appTitleService = inject(AppTitleService);

  readonly state = toSignal(this.metro.state$, {
    initialValue: this.metro.getState(),
  });

  readonly patterns = signal<MetronomePatternV1[]>([]);
  readonly activePatternId = signal<PatternId | ''>('');

  private bpmHoldTimeout?: number;
  private bpmHoldInterval?: number;

  readonly timeSignatures: TimeSignature[] = [
    '2/4',
    '3/4',
    '4/4',
    '6/8',
    '8/8',
  ];

  readonly presetOptions = [
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

  readonly isDenominator4 = computed(() => this.state().denominator === 4);

  readonly levels = computed(() =>
    this.isDenominator4() ? ['1/4', '1/16', '1/8', '1/16'] : ['1/8', '1/16'],
  );

  readonly availableGroupings = computed(() => {
    this.state(); // 让 computed 跟随拍号变化
    return this.metro.getAvailableGroupings();
  });

  private readonly levelClassMap4 = [
    'lvl-main',
    'lvl-e',
    'lvl-and',
    'lvl-a',
  ] as const;
  private readonly levelClassMap8 = ['lvl-main', 'lvl-a'] as const;

  constructor() {
    this.appTitleService.setTitle('Metronome');
    this.i18n.use('en');

    this.refreshPatterns();
    this.restoreLastPattern();
  }

  ngOnDestroy() {
    this.stopBpmHold();
  }

  // =========================================================
  // Pattern init / restore
  // =========================================================

  private restoreLastPattern() {
    const lastId = this.metro.getActivePatternId();
    if (!lastId) return;

    const p = this.metro.loadPattern(lastId);
    if (!p) return;

    this.metro.applyPattern(p);
    this.activePatternId.set(p.id);

    if (p.selectedPreset) {
      this.selectedPreset = p.selectedPreset;
    }
  }

  refreshPatterns() {
    this.patterns.set(this.metro.listPatterns());
    this.activePatternId.set(this.metro.getActivePatternId() ?? '');
  }

  get pattern(): boolean[][] {
    return this.metro.getPattern();
  }

  // =========================================================
  // Controls
  // =========================================================

  toggle() {
    this.metro.toggle();
  }

  stop() {
    this.metro.stop();
  }

  onBpmChange(v: number) {
    this.metro.setBpm(v);
  }

  changeBpm(delta: number) {
    this.metro.setBpm(this.state().bpm + delta);
  }

  onSigChange(sig: TimeSignature) {
    this.metro.setTimeSignature(sig);
  }

  onAccentChange(v: boolean) {
    this.metro.setAccentFirstBeat(v);
  }

  applyPreset(p: PatternPreset) {
    this.selectedPreset = p;
    this.metro.applyPreset(p);
  }

  onGroupingChange(preset: GroupingPreset) {
    this.metro.setGrouping(preset);
  }

  toggleCell(beat: number, level: number) {
    this.metro.toggleCell(beat, level);
  }

  // =========================================================
  // Pattern actions
  // =========================================================

  onSelectPattern(id: string) {
    if (!id) return;

    const p = this.metro.loadPattern(id);
    if (!p) return;

    this.metro.applyPattern(p);
    this.activePatternId.set(p.id);

    if (p.selectedPreset) {
      this.selectedPreset = p.selectedPreset;
    }

    this.refreshPatterns();
  }

  savePatternOverwrite() {
    const id = this.activePatternId();
    if (!id) return this.savePatternAs();

    const existing = this.metro.loadPattern(id);
    if (!existing) return this.savePatternAs();

    this.savePattern(existing.name, existing.id);
  }

  savePatternAs() {
    const name = prompt('Pattern name', 'Practice');
    if (!name) return;
    this.savePattern(name);
  }

  private savePattern(name: string, id?: PatternId) {
    const exported = this.metro.exportCurrentPattern(name, this.selectedPreset);
    const pattern = id ? { ...exported, id, name } : exported;

    this.metro.savePattern(pattern);
    this.activePatternId.set(pattern.id);
    this.refreshPatterns();
  }

  deletePattern() {
    const id = this.activePatternId();
    if (!id) return;

    const p = this.metro.loadPattern(id);
    const label = p?.name ?? id;

    if (!confirm(`Delete Pattern: ${label} ?`)) return;

    this.metro.deletePattern(id);
    this.refreshPatterns();
  }

  // =========================================================
  // UI helpers
  // =========================================================

  setLang(lang: 'en' | 'zh') {
    this.i18n.use(lang);
  }

  isBeatActiveNow(beat: number): boolean {
    const st = this.state();
    return st.isRunning && st.currentBeatIndex === beat;
  }

  isGroupStart(beat: number): boolean {
    const st = this.state();
    return Array.isArray(st.accentBeats) && st.accentBeats.includes(beat);
  }

  isPlayingCell(beat: number, level: number): boolean {
    const st = this.state();
    return (
      st.isRunning &&
      st.currentBeatIndex === beat &&
      st.currentLevelIndex === level
    );
  }

  isAccentCell(beat: number, level: number): boolean {
    const st = this.state();
    return (
      level === 0 &&
      Array.isArray(st.accentBeats) &&
      st.accentBeats.includes(beat)
    );
  }

  cellText(beat: number, level: number): string {
    if (this.isDenominator4()) {
      if (level === 0) return String(beat + 1);
      if (level === 1) return 'e';
      if (level === 2) return '&';
      return 'a';
    }

    return level === 0 ? String(beat + 1) : '&';
  }

  levelClass(level: number): string {
    return this.isDenominator4()
      ? (this.levelClassMap4[level] ?? '')
      : (this.levelClassMap8[level] ?? '');
  }

  cellClasses(beat: number, level: number) {
    const enabled = !!this.pattern?.[beat]?.[level];
    const playing = this.isPlayingCell(beat, level);
    const accent = this.isAccentCell(beat, level);

    return {
      [this.levelClass(level)]: true,
      off: !enabled,
      hit: playing && enabled,
      'hit-accent': playing && enabled && accent,
      'hit-normal': playing && enabled && !accent && level === 0,
      'hit-sub': playing && enabled && level > 0,
    };
  }

  // =========================================================
  // BPM long press
  // =========================================================

  startBpmHold(delta: number, ev?: Event) {
    ev?.preventDefault();
    ev?.stopPropagation();

    this.changeBpm(delta);
    this.stopBpmHold();

    this.bpmHoldTimeout = window.setTimeout(() => {
      let ticks = 0;
      this.bpmHoldInterval = window.setInterval(() => {
        ticks++;
        const accel = ticks > 18 ? 5 : ticks > 10 ? 2 : 1;
        this.changeBpm(delta * accel);
      }, 90);
    }, 250);
  }

  stopBpmHold() {
    window.clearTimeout(this.bpmHoldTimeout);
    window.clearInterval(this.bpmHoldInterval);
    this.bpmHoldTimeout = undefined;
    this.bpmHoldInterval = undefined;
  }

  // =========================================================
  // Stopwatch
  // =========================================================

  toggleStopwatch() {
    this.metro.toggleStopwatch();
  }

  resetStopwatch() {
    this.metro.resetStopwatch();
  }

  formatElapsed(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);

    return `${min.toString().padStart(2, '0')}:${sec
      .toString()
      .padStart(2, '0')}.${tenths}`;
  }
}
