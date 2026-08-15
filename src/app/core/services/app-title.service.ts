import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

/** Base title appended to every page title for branding. */
const SITE_NAME = 'FENG TECH';

/**
 * Centralises `<title>` management so every feature page stays
 * consistent (`Page · SITE_NAME`) without touching `document` directly.
 */
@Injectable({ providedIn: 'root' })
export class AppTitleService {
  private readonly title = inject(Title);

  getTitle(): string {
    return this.title.getTitle();
  }

  setTitle(pageTitle: string): void {
    this.title.setTitle(`${pageTitle} · ${SITE_NAME}`);
  }
}
