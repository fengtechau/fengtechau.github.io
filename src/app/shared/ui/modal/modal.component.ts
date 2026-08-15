import { Component, HostListener, input, output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

/**
 * Minimal accessible modal used for confirmations and small forms.
 *
 * Usage:
 * ```html
 * <app-modal [open]="openSignal()" title="Save pattern" (closed)="openSignal.set(false)">
 *   ...content...
 * </app-modal>
 * ```
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');

  /** Emitted when the user requests closing (backdrop, ✕ or Escape). */
  readonly closed = output<void>();

  protected readonly icons = { faXmark };

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  protected onBackdropKeydown(event: KeyboardEvent): void {
    if (event.code === 'Enter') {
      this.closed.emit();
    }
  }
}
