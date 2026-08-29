import { AfterViewInit, Component, ElementRef, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBolt,
  faComments,
  faDollarSign,
  faEnvelope,
  faFont,
  faGlobe,
  faMusic,
  faNetworkWired,
  faQuoteLeft,
  faScrewdriverWrench,
} from '@fortawesome/free-solid-svg-icons';

import { AppTitleService } from '../../core/services/app-title.service';

/** One full rotation of the About ring badge. */
const BADGE_SPIN_MS = 16000;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FontAwesomeModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements AfterViewInit {
  private readonly appTitleService = inject(AppTitleService);

  private readonly badgeRing = viewChild<ElementRef<SVGGElement>>('badgeRing');

  protected readonly icons = {
    faEnvelope,
    faFont,
    faMusic,
    faNetworkWired,
    faGlobe,
    faScrewdriverWrench,
    faComments,
    faQuoteLeft,
    faDollarSign,
    faBolt,
  };

  constructor() {
    this.appTitleService.setTitle('Welcome');
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
