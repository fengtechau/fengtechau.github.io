import { AfterViewInit, Component, ElementRef, inject, viewChild } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBolt, faChevronDown, faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AppTitleService } from '../../core/services/app-title.service';

/** One full rotation of the About ring badge. */
const BADGE_SPIN_MS = 16000;

interface FaqItem {
  qKey: string;
  aKey: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [FontAwesomeModule, TranslatePipe],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent implements AfterViewInit {
  private readonly appTitleService = inject(AppTitleService);
  private readonly i18n = inject(TranslateService);

  private readonly badgeRing = viewChild<ElementRef<SVGGElement>>('badgeRing');

  protected readonly icons = {
    faBolt,
    faChevronDown,
    faQuoteLeft,
  };

  protected readonly faqs: FaqItem[] = [
    { qKey: 'HOME.FAQ1_Q', aKey: 'HOME.FAQ1_A' },
    { qKey: 'HOME.FAQ2_Q', aKey: 'HOME.FAQ2_A' },
    { qKey: 'HOME.FAQ3_Q', aKey: 'HOME.FAQ3_A' },
    { qKey: 'HOME.FAQ4_Q', aKey: 'HOME.FAQ4_A' },
    { qKey: 'HOME.FAQ5_Q', aKey: 'HOME.FAQ5_A' },
  ];

  constructor() {
    this.appTitleService.setTitle(this.i18n.instant('HOME.ABOUT_TITLE'));
  }

  ngAfterViewInit(): void {
    // Spin the ring badge with the Web Animations API. CSS animations are
    // suppressed by the site's `prefers-reduced-motion` rule on systems that
    // disable animations, but this badge is a deliberate, slow decorative
    // rotation — so it always runs.
    const ring = this.badgeRing()?.nativeElement;
    if (!ring) {
      return;
    }
    ring.style.transformOrigin = '70px 70px';
    ring.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
      duration: BADGE_SPIN_MS,
      iterations: Infinity,
      easing: 'linear',
    });
  }
}
