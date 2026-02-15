import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class AppTitleService {
  constructor(private titleService: Title) {}

  getTitle() {
    return this.titleService.getTitle();
  }
  setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }
}
