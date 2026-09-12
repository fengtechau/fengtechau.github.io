import {
  Component,
  HostListener,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  isActive,
} from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faBriefcase,
  faChevronDown,
  faCircleInfo,
  faDisplay,
  faEnvelope,
  faFont,
  faHouse,
  faMoon,
  faMusic,
  faNetworkWired,
  faSun,
  faXmark,
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
  private readonly router = inject(Router);

  readonly currentYear = new Date().getFullYear();

  /** Header logo: the dark variant is invisible on the dark header. */
  protected readonly headerLogo = computed(() =>
    this.theme.resolved() === 'dark'
      ? '/assets/images/Logo/png/WhiteNoBg.png'
      : '/assets/images/Logo/png/BlackNoBg.png',
  );

  /** Company pages, always visible in the bar. */
  readonly primaryNav: NavItem[] = [
    { path: 'home', labelKey: 'SHELL.NAV_HOME', icon: faHouse },
    { path: 'services', labelKey: 'SHELL.NAV_SERVICES', icon: faBriefcase },
    { path: 'about', labelKey: 'SHELL.NAV_ABOUT', icon: faCircleInfo },
    { path: 'contact', labelKey: 'SHELL.NAV_CONTACT', icon: faEnvelope },
  ];

  /**
   * The free tools live behind one dropdown entry. Keeping them out of the
   * bar is what stops the navigation from overrunning the header controls
   * on narrower laptops.
   */
  readonly toolNav: NavItem[] = [
    { path: 'ip', labelKey: 'SHELL.NAV_IP', icon: faNetworkWired },
    { path: 'texttools', labelKey: 'SHELL.NAV_CASE', icon: faFont },
    { path: 'metronome', labelKey: 'SHELL.NAV_METRONOME', icon: faMusic },
  ];

  /**
   * Tool entries paired with a reactive active-state signal. Angular 22's
   * standalone `isActive` returns a `Signal<boolean>` (the `Router.isActive`
   * *method* is a one-shot boolean), so the signals are built once here and
   * simply read from the template.
   */
  protected readonly toolLinks = linkedSignal(() =>
    this.toolNav.map((item) => ({
      ...item,
      active: isActive(item.path, this.router),
    })),
  );

  /** Highlights the "Tools" trigger while any free-tool page is open. */
  protected readonly toolsActive = computed(() =>
    this.toolLinks().some((item) => item.active()),
  );

  readonly themeOptions: ThemeOption[] = [
    { mode: 'light', labelKey: 'SHELL.THEME_LIGHT', icon: faSun },
    { mode: 'dark', labelKey: 'SHELL.THEME_DARK', icon: faMoon },
    { mode: 'auto', labelKey: 'SHELL.THEME_AUTO', icon: faDisplay },
  ];

  protected readonly icons = {
    faBars,
    faChevronDown,
    faXmark,
  };

  protected readonly toolsOpen = signal(false);
  protected readonly mobileOpen = signal(false);

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  setLang(lang: 'en' | 'zh'): void {
    this.locale.set(lang);
  }

  toggleTools(): void {
    this.mobileOpen.set(false);
    this.toolsOpen.update((open) => !open);
  }

  closeTools(): void {
    this.toolsOpen.set(false);
  }

  toggleMobile(): void {
    this.toolsOpen.set(false);
    this.mobileOpen.update((open) => !open);
  }

  /** Any navigation closes whatever panel is open. */
  closePanels(): void {
    this.toolsOpen.set(false);
    this.mobileOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closePanels();
  }
}
