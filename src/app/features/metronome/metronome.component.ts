import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCircle,
  faClock,
  faCompress,
  faExpand,
  faFilePen,
  faHandPointer,
  faLightbulb,
  faMinus,
  faMoon,
  faMusic,
  faPause,
  faPlay,
  faPlus,
  faSave,
  faStop,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AppTitleService } from '../../core/services/app-title.service';
import { LocaleService } from '../../core/services/locale.service';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { MetronomeService } from './metronome.service';
import {
  CLICK_SOUNDS,
  ClickSoundId,
  GroupingPreset,
  SavedPattern,
  SubdivisionId,
  TEMPO_PRESETS,
  TIME_SIGNATURES,
  TimeSignature,
} from './metronome.models';
import {
  availableGroupings,
  cellLabel,
  clampBpm,
  subdivisionsFor,
  TapTempoTracker,
} from './metronome.utils';

@Component({
  selector: 'app-metronome',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, TranslatePipe, ModalComponent],
  templateUrl: './metronome.component.html',
  styleUrls: ['./metronome.component.scss'],
})
export class MetronomeComponent implements OnDestroy {
  protected readonly metro = inject(MetronomeService);
  protected readonly locale = inject(LocaleService);
  private readonly i18n = inject(TranslateService);
  private readonly appTitleService = inject(AppTitleService);

  readonly state = toSignal(this.metro.state$, {
    initialValue: this.metro.getState(),
  });
  readonly pattern = toSignal(this.metro.pattern$, {
    initialValue: this.metro.getPattern(),
  });

  protected readonly icons = {
    faPlay,
    faPause,
    faStop,
    faMinus,
    faPlus,
    faHandPointer,
    faMusic,
    faClock,
    faSave,
    faFilePen,
    faTrashCan,
    faExpand,
    faCompress,
    faLightbulb,
    faMoon,
    faCircle,
  };

  readonly timeSignatures = TIME_SIGNATURES;
  readonly clickSounds = CLICK_SOUNDS;
  readonly tempoPresets = TEMPO_PRESETS;

  readonly subdivisions = computed(() => subdivisionsFor(this.state().denominator));
  readonly groupings = computed(() =>
    availableGroupings(this.state().beatsPerBar, this.state().denominator),
  );

  readonly beats = computed(() =>
    Array.from({ length: this.state().beatsPerBar }, (_, i) => i),
  );

  // Pattern manager
  readonly patterns = signal<SavedPattern[]>([]);
  readonly activePatternId = signal('');
  readonly saveAsOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly patternNameDraft = signal('');
  readonly flashMessage = signal<string | null>(null);
  private readonly patternNameInput =
    viewChild<ElementRef<HTMLInputElement>>('patternNameInput');

  // BPM input (draft while typing)
  readonly bpmDraft = signal('');
  readonly bpmFocused = signal(false);

  // Tap tempo
  readonly tapPulse = signal(false);
  private readonly tapTracker = new TapTempoTracker();
  private tapPulseTimer: number | undefined;

  // Fullscreen
  readonly isFullscreen = signal(false);

  // BPM long-press repeat
  private bpmHoldDelay: number | undefined;
  private bpmHoldRepeat: number | undefined;

  private flashTimer: number | undefined;

  constructor() {
    this.appTitleService.setTitle(this.i18n.instant('METRONOME.TITLE'));

    this.refreshPatterns();

    // Keep the BPM input in sync with programmatic changes (taps, keys).
    effect(() => {
      if (!this.bpmFocused()) {
        this.bpmDraft.set(String(this.state().bpm));
      }
    });

    // Focus the name field as soon as the save-as dialog opens.
    effect(() => {
      if (this.saveAsOpen()) {
        window.setTimeout(() => this.patternNameInput()?.nativeElement.focus(), 0);
      }
    });

    document.addEventListener('fullscreenchange', this.onFullscreenChange);
  }

  ngOnDestroy(): void {
    this.stopBpmHold();
    window.clearTimeout(this.flashTimer);
    window.clearTimeout(this.tapPulseTimer);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    this.metro.shutdown();
  }

  // ============================================================
  // Keyboard shortcuts
  // ============================================================

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.saveAsOpen() || this.deleteOpen()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return;
    }
    // Let buttons keep their native Space/Enter activation.
    if (tag === 'BUTTON' && (event.code === 'Space' || event.code === 'Enter')) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        this.metro.toggle();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.changeBpm(event.shiftKey ? 10 : 1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.changeBpm(event.shiftKey ? -10 : -1);
        break;
      case 'KeyT':
        event.preventDefault();
        this.tapTempo();
        break;
    }
  }

  // ============================================================
  // Transport
  // ============================================================

  toggle(): void {
    this.metro.toggle();
  }

  stop(): void {
    this.metro.stop();
  }

  // ============================================================
  // Tempo
  // ============================================================

  changeBpm(delta: number): void {
    this.metro.setBpm(this.state().bpm + delta);
  }

  onBpmInput(raw: string): void {
    this.bpmDraft.set(raw);
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      this.metro.setBpm(clampBpm(parsed));
    }
  }

  onBpmFocus(): void {
    this.bpmFocused.set(true);
  }

  onBpmBlur(): void {
    this.bpmFocused.set(false);
    this.bpmDraft.set(String(this.state().bpm));
  }

  tapTempo(): void {
    const bpm = this.tapTracker.tap(performance.now());
    this.pulseTapButton();
    if (bpm !== null) {
      this.metro.setBpm(bpm);
    }
  }

  private pulseTapButton(): void {
    this.tapPulse.set(true);
    window.clearTimeout(this.tapPulseTimer);
    this.tapPulseTimer = window.setTimeout(() => this.tapPulse.set(false), 180);
  }

  // ============================================================
  // BPM long-press repeat
  // ============================================================

  startBpmHold(delta: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.changeBpm(delta);
    this.stopBpmHold();

    this.bpmHoldDelay = window.setTimeout(() => {
      let ticks = 0;
      this.bpmHoldRepeat = window.setInterval(() => {
        ticks++;
        const acceleration = ticks > 18 ? 5 : ticks > 10 ? 2 : 1;
        this.changeBpm(delta * acceleration);
      }, 90);
    }, 250);
  }

  stopBpmHold(): void {
    window.clearTimeout(this.bpmHoldDelay);
    window.clearInterval(this.bpmHoldRepeat);
    this.bpmHoldDelay = undefined;
    this.bpmHoldRepeat = undefined;
  }

  // ============================================================
  // Settings
  // ============================================================

  onSigChange(event: Event): void {
    this.metro.setTimeSignature(
      (event.target as HTMLSelectElement).value as TimeSignature,
    );
  }

  onSubdivisionChange(subdivision: SubdivisionId): void {
    this.metro.setSubdivision(subdivision);
  }

  onAccentChange(event: Event): void {
    this.metro.setAccentFirstBeat((event.target as HTMLInputElement).checked);
  }

  onGroupingChange(event: Event): void {
    this.metro.setGrouping((event.target as HTMLSelectElement).value as GroupingPreset);
  }

  onSoundChange(event: Event): void {
    this.metro.setClickSound((event.target as HTMLSelectElement).value as ClickSoundId);
  }

  onBpmSlider(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.metro.setBpm(Number(input.value));
  }

  onVolumeInput(event: Event): void {
    this.metro.setVolume(Number((event.target as HTMLInputElement).value));
  }

  /** Percentage fill of a slider for the CSS `--m-progress` variable. */
  sliderPercent(value: number, min: number, max: number): string {
    const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
    return `${Math.min(100, Math.max(0, percent))}%`;
  }

  onKeepAwakeChange(event: Event): void {
    this.metro.setKeepAwake((event.target as HTMLInputElement).checked);
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }

  // ============================================================
  // Pattern manager
  // ============================================================

  refreshPatterns(): void {
    this.patterns.set(this.metro.listPatterns());
  }

  activePatternName(): string {
    return this.patterns().find((p) => p.id === this.activePatternId())?.name ?? '';
  }

  onSelectPattern(id: string): void {
    if (!id) {
      return;
    }
    const saved = this.metro.loadPattern(id);
    if (!saved) {
      return;
    }
    this.metro.applyPattern(saved);
    this.activePatternId.set(id);
    this.showFlash('METRONOME.PATTERN_LOADED');
  }

  savePatternOverwrite(): void {
    const id = this.activePatternId();
    const existing = id ? this.metro.loadPattern(id) : null;
    if (!id || !existing) {
      this.openSaveAs();
      return;
    }

    const exported = this.metro.exportCurrentPattern(existing.name);
    this.metro.savePattern({ ...exported, id, name: existing.name });
    this.activePatternId.set(id);
    this.refreshPatterns();
    this.showFlash('METRONOME.SAVED');
  }

  openSaveAs(): void {
    this.patternNameDraft.set(this.activePatternName());
    this.saveAsOpen.set(true);
  }

  confirmSaveAs(): void {
    const name = this.patternNameDraft().trim();
    if (!name) {
      return;
    }
    const exported = this.metro.exportCurrentPattern(name);
    this.metro.savePattern(exported);
    this.activePatternId.set(exported.id);
    this.refreshPatterns();
    this.saveAsOpen.set(false);
    this.showFlash('METRONOME.SAVED');
  }

  onSaveAsSubmit(event: Event): void {
    event.preventDefault();
    this.confirmSaveAs();
  }

  openDelete(): void {
    if (this.activePatternId()) {
      this.deleteOpen.set(true);
    }
  }

  confirmDelete(): void {
    const id = this.activePatternId();
    if (id) {
      this.metro.deletePattern(id);
      this.activePatternId.set('');
      this.refreshPatterns();
      this.showFlash('METRONOME.DELETED');
    }
    this.deleteOpen.set(false);
  }

  private showFlash(key: string): void {
    this.flashMessage.set(key);
    window.clearTimeout(this.flashTimer);
    this.flashTimer = window.setTimeout(() => this.flashMessage.set(null), 1600);
  }

  // ============================================================
  // UI helpers
  // ============================================================

  setLang(lang: 'en' | 'zh'): void {
    this.locale.set(lang);
  }

  formatElapsed(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${tenths}`;
  }

  cellText(beat: number, level: number): string {
    return cellLabel(beat, level, this.state().levelsPerBeat);
  }

  cellEnabled(beat: number, level: number): boolean {
    return !!this.pattern()?.[beat]?.[level];
  }

  cellClasses(beat: number, level: number): Record<string, boolean> {
    const st = this.state();
    const enabled = this.cellEnabled(beat, level);
    const playing =
      st.isRunning && st.currentBeatIndex === beat && st.currentLevelIndex === level;

    return {
      'is-off': !enabled,
      'is-main': enabled && level === 0,
      'is-downbeat': enabled && level === 0 && beat === 0,
      'is-accent': enabled && level === 0 && st.accentBeats.includes(beat),
      'is-playing': playing,
    };
  }

  beatColClasses(beat: number): Record<string, boolean> {
    const st = this.state();
    return {
      'is-active': st.isRunning && st.currentBeatIndex === beat,
      'is-group-start':
        beat > 0 && st.accentBeats.includes(beat) && st.denominator === 8,
      'is-downbeat-col': beat === 0,
    };
  }

  ledClasses(beat: number): Record<string, boolean> {
    const st = this.state();
    return {
      'is-active': st.isRunning && st.currentBeatIndex === beat,
      'is-downbeat': beat === 0,
      'is-accent': st.accentBeats.includes(beat),
    };
  }

  cellAriaLabel(beat: number, level: number): string {
    const st = this.state();
    const label = this.cellText(beat, level);
    const beatLabel =
      st.levelsPerBeat > 1 ? `Beat ${beat + 1}, step ${label}` : `Beat ${beat + 1}`;
    return this.cellEnabled(beat, level)
      ? `${beatLabel}, enabled`
      : `${beatLabel}, muted`;
  }

  toggleCell(beat: number, level: number): void {
    this.metro.toggleCell(beat, level);
  }

  // ============================================================
  // Stopwatch
  // ============================================================

  toggleStopwatch(): void {
    this.metro.toggleStopwatch();
  }

  resetStopwatch(): void {
    this.metro.resetStopwatch();
  }

  // ============================================================
  // Internals
  // ============================================================

  private readonly onFullscreenChange = (): void => {
    this.isFullscreen.set(!!document.fullscreenElement);
  };
}
