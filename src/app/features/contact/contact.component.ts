import { Component, inject } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AppTitleService } from '../../core/services/app-title.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FontAwesomeModule, TranslatePipe],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  private readonly appTitleService = inject(AppTitleService);
  private readonly i18n = inject(TranslateService);

  protected readonly icons = {
    faEnvelope,
  };

  constructor() {
    this.appTitleService.setTitle(this.i18n.instant('HOME.CONTACT_TITLE'));
  }
}
