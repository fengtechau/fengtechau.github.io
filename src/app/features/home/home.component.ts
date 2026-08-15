import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faFont,
  faMusic,
  faNetworkWired,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

import { AppTitleService } from '../../core/services/app-title.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FontAwesomeModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly appTitleService = inject(AppTitleService);

  protected readonly icons = {
    faFont,
    faMusic,
    faNetworkWired,
    faArrowRight,
  };

  constructor() {
    this.appTitleService.setTitle('Home');
  }
}
