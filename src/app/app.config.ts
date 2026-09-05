import { APP_INITIALIZER, ApplicationConfig, inject } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { resolveInitialLang } from './core/services/locale.util';

/** The browser's language list, used to pick the default UI language. */
function browserLanguages(): readonly string[] {
  try {
    if (navigator.languages?.length) {
      return navigator.languages;
    }
    return navigator.language ? [navigator.language] : [];
  } catch {
    return [];
  }
}

/**
 * Loads the initial language before the app renders, so the first paint
 * never shows raw translation keys (e.g. "HOME.HERO_TITLE").
 */
function initializeTranslations(): () => Promise<void> {
  const translate = inject(TranslateService);
  return () =>
    firstValueFrom(translate.use(resolveInitialLang(browserLanguages())))
      .then(() => undefined)
      .catch(() => undefined);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(),
    provideTranslateService({ fallbackLang: 'en' }),
    provideTranslateHttpLoader({
      prefix: '/assets/i18n/',
      suffix: '.json',
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTranslations,
      multi: true,
    },
  ],
};
