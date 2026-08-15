import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faDisplay,
  faFont,
  faHouse,
  faMoon,
  faMusic,
  faNetworkWired,
  faSun,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

import { ThemeMode, ThemeService } from './core/services/theme.service';

interface NavItem {
  path: string;
  label: string;
  icon: IconDefinition;
}

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  icon: IconDefinition;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FontAwesomeModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  protected readonly theme = inject(ThemeService);

  readonly currentYear = new Date().getFullYear();

  readonly navItems: NavItem[] = [
    { path: 'home', label: 'Home', icon: faHouse },
    { path: 'ip', label: 'IP Tools', icon: faNetworkWired },
    { path: 'texttools', label: 'Case Converter', icon: faFont },
    { path: 'metronome', label: 'Metronome', icon: faMusic },
  ];

  readonly themeOptions: ThemeOption[] = [
    { mode: 'light', label: 'Light theme', icon: faSun },
    { mode: 'dark', label: 'Dark theme', icon: faMoon },
    { mode: 'auto', label: 'Follow system theme', icon: faDisplay },
  ];

  setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }
}
