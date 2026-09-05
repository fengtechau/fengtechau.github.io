/**
 * Pure helpers for resolving the app language from the browser and the
 * user's saved preference. Kept free of Angular dependencies so the logic
 * is trivial to unit-test and can be reused from `app.config.ts` (before the
 * Angular injector exists) and the `LocaleService`.
 */

export type AppLang = 'en' | 'zh';

export const APP_LANGS: readonly AppLang[] = ['en', 'zh'];

const LS_LANG = 'fengtech.lang';

/**
 * Maps the browser's language list (`navigator.languages`) to the closest
 * supported app language. Falls back to English.
 */
export function detectBrowserLang(languages: readonly string[] | undefined): AppLang {
  for (const raw of languages ?? []) {
    const lang = (raw || '').toLowerCase();
    if (lang.startsWith('zh')) {
      return 'zh';
    }
    if (lang.startsWith('en')) {
      return 'en';
    }
  }
  return 'en';
}

/** Reads the persisted language override, or `null` when none is saved. */
export function readSavedLang(): AppLang | null {
  try {
    const saved = localStorage.getItem(LS_LANG);
    return saved === 'zh' || saved === 'en' ? saved : null;
  } catch {
    return null;
  }
}

/** Persists the user's language override. */
export function writeSavedLang(lang: AppLang): void {
  try {
    localStorage.setItem(LS_LANG, lang);
  } catch {
    // Private mode — the in-memory language still applies for this session.
  }
}

/**
 * Resolves the initial language: the user's saved choice wins, then the
 * browser preference, then English.
 */
export function resolveInitialLang(languages?: readonly string[]): AppLang {
  return readSavedLang() ?? detectBrowserLang(languages);
}
