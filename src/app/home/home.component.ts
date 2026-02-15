import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppTitleService } from '../services/app-title.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: [AppTitleService]
})
export class HomeComponent {
  private appTitleService = inject(AppTitleService);

  constructor() {
    this.appTitleService.setTitle('Home');
  }
}
