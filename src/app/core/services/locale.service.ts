import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

import { AppLang, writeSavedLang } from './locale.util';

/**
 * Owns the site-wide language. The initial language is resolved by
 * `app.config.ts` from the browser preference (see `locale.util.ts`); this
 * service adds switching, persistence and keeping `<html lang="…">` in sync.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /** Reactive current language, mirroring `TranslateService.currentLang`. */
  readonly current = this.translate.currentLang;

  constructor() {
    this.syncHtmlLang(this.current());
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.syncHtmlLang(event.lang));
  }

  set(lang: AppLang): void {
    this.translate.use(lang).subscribe();
    writeSavedLang(lang);
  }

  toggle(): void {
    this.set(this.current() === 'zh' ? 'en' : 'zh');
  }

  private syncHtmlLang(lang: string | null): void {
    if (!lang) {
      return;
    }
    try {
      document.documentElement.lang = lang;
    } catch {
      // `document` unavailable (e.g. tests) — the language still applies.
    }
  }
}
