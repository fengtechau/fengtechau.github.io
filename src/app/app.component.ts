import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faHouse,
  faNetworkWired,
  faFont,
  faMusic,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

interface NavItem {
  path: string;
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
  readonly currentYear = new Date().getFullYear();

  readonly navItems: NavItem[] = [
    { path: 'home', label: 'Home', icon: faHouse },
    { path: 'ip', label: 'IP Tools', icon: faNetworkWired },
    { path: 'texttools', label: 'Case Converter', icon: faFont },
    { path: 'metronome', label: 'Metronome', icon: faMusic },
  ];
}
