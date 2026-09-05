import { Component, inject, OnInit, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowsRotate,
  faCheck,
  faCopy,
  faEraser,
  faFont,
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AppTitleService } from '../../core/services/app-title.service';
import {
  CASE_LABELS,
  CASE_OPTIONS,
  CaseKind,
  convertCase,
} from './case-converter.util';

const LS_SELECTED_CASE = 'fengtech.tools.selectedCase';

@Component({
  selector: 'app-tools',
  standalone: true,
  imports: [FontAwesomeModule, TranslatePipe],
  templateUrl: './tools.component.html',
  styleUrl: './tools.component.scss',
})
export class ToolsComponent implements OnInit {
  private readonly appTitleService = inject(AppTitleService);
  private readonly i18n = inject(TranslateService);

  protected readonly icons = {
    faArrowsRotate,
    faCheck,
    faCopy,
    faEraser,
    faFont,
  };

  readonly caseOptions = CASE_OPTIONS;
  readonly caseLabels = CASE_LABELS;

  readonly inputText = signal('');
  readonly outputText = signal('');
  readonly selectedCase = signal<CaseKind>('camel');
  readonly copied = signal(false);

  private copiedTimer: number | undefined;

  ngOnInit(): void {
    this.appTitleService.setTitle(this.i18n.instant('TOOLS.TITLE'));
    this.selectedCase.set(this.readSavedCase());
  }

  transformText(): void {
    this.outputText.set(convertCase(this.inputText(), this.selectedCase()));
  }

  onCaseChange(event: Event): void {
    const next = (event.target as HTMLSelectElement).value as CaseKind;
    this.selectedCase.set(next);
    this.writeSavedCase(next);
    this.transformText();
  }

  async copyToClipboard(): Promise<void> {
    const output = this.outputText();
    if (!output) {
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      this.copied.set(true);
      window.clearTimeout(this.copiedTimer);
      this.copiedTimer = window.setTimeout(() => this.copied.set(false), 1600);
    } catch {
      // Clipboard unavailable — user can select the text manually.
    }
  }

  clearText(): void {
    this.inputText.set('');
    this.outputText.set('');
  }

  private readSavedCase(): CaseKind {
    try {
      const saved = localStorage.getItem(LS_SELECTED_CASE);
      return CASE_OPTIONS.includes(saved as CaseKind) ? (saved as CaseKind) : 'camel';
    } catch {
      return 'camel';
    }
  }

  private writeSavedCase(kind: CaseKind): void {
    try {
      localStorage.setItem(LS_SELECTED_CASE, kind);
    } catch {
      // Private mode — the selection still works for this session.
    }
  }
}
