import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBriefcase,
  faCircleInfo,
  faDisplay,
  faEnvelope,
  faFont,
  faHouse,
  faMoon,
  faMusic,
  faNetworkWired,
  faSun,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '@ngx-translate/core';

import { EmbeddedService } from './core/services/embedded.service';
import { LocaleService } from './core/services/locale.service';
import { ThemeMode, ThemeService } from './core/services/theme.service';

interface NavItem {
  path: string;
  labelKey: string;
  icon: IconDefinition;
}

interface ThemeOption {
  mode: ThemeMode;
  labelKey: string;
  icon: IconDefinition;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FontAwesomeModule,
    TranslatePipe,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly locale = inject(LocaleService);
  protected readonly embedded = inject(EmbeddedService);

  readonly currentYear = new Date().getFullYear();

  /** Header logo: the dark variant is invisible on the dark header. */
  protected readonly headerLogo = computed(() =>
    this.theme.resolved() === 'dark'
      ? '/assets/images/Logo/png/WhiteNoBg.png'
      : '/assets/images/Logo/png/BlackNoBg.png',
  );

  readonly navItems: NavItem[] = [
    { path: 'home', labelKey: 'SHELL.NAV_HOME', icon: faHouse },
    { path: 'services', labelKey: 'SHELL.NAV_SERVICES', icon: faBriefcase },
    { path: 'about', labelKey: 'SHELL.NAV_ABOUT', icon: faCircleInfo },
    { path: 'contact', labelKey: 'SHELL.NAV_CONTACT', icon: faEnvelope },
    { path: 'ip', labelKey: 'SHELL.NAV_IP', icon: faNetworkWired },
    { path: 'texttools', labelKey: 'SHELL.NAV_CASE', icon: faFont },
    { path: 'metronome', labelKey: 'SHELL.NAV_METRONOME', icon: faMusic },
  ];

  readonly themeOptions: ThemeOption[] = [
    { mode: 'light', labelKey: 'SHELL.THEME_LIGHT', icon: faSun },
    { mode: 'dark', labelKey: 'SHELL.THEME_DARK', icon: faMoon },
    { mode: 'auto', labelKey: 'SHELL.THEME_AUTO', icon: faDisplay },
  ];

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  setLang(lang: 'en' | 'zh'): void {
    this.locale.set(lang);
  }
}
