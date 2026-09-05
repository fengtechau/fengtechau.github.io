import { Injectable, signal } from '@angular/core';

/**
 * Detects whether the app is running inside another page's `<iframe>`.
 *
 * FengTech is embedded as a live preview on sethfengli.com, where the parent
 * page already provides its own navigation, branding and footer. When
 * embedded, the app shell hides its header/footer so the content reads as a
 * clean, focused panel instead of a "site inside a site".
 */
@Injectable({ providedIn: 'root' })
export class EmbeddedService {
  readonly isEmbedded = signal<boolean>(this.detect());

  private detect(): boolean {
    try {
      return window.self !== window.top;
    } catch {
      // Cross-origin frames can throw on `window.top` access — treat as embedded.
      return true;
    }
  }
}
