import { beforeEach, describe, expect, it } from 'vitest';

import { detectBrowserLang, readSavedLang, resolveInitialLang } from './locale.util';

describe('locale.util', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('detectBrowserLang', () => {
    it('maps Chinese-prefixed languages to zh', () => {
      expect(detectBrowserLang(['zh-CN', 'en-AU'])).toBe('zh');
      expect(detectBrowserLang(['zh-TW'])).toBe('zh');
      expect(detectBrowserLang(['zh'])).toBe('zh');
    });

    it('maps English-prefixed languages to en', () => {
      expect(detectBrowserLang(['en-AU', 'en-US'])).toBe('en');
      expect(detectBrowserLang(['en'])).toBe('en');
    });

    it('falls back to en for unsupported or missing languages', () => {
      expect(detectBrowserLang(['fr-FR'])).toBe('en');
      expect(detectBrowserLang(undefined)).toBe('en');
      expect(detectBrowserLang([])).toBe('en');
    });
  });

  describe('readSavedLang', () => {
    it('reads a valid saved language', () => {
      localStorage.setItem('fengtech.lang', 'zh');
      expect(readSavedLang()).toBe('zh');
    });

    it('ignores an invalid saved language', () => {
      localStorage.setItem('fengtech.lang', 'fr');
      expect(readSavedLang()).toBeNull();
    });

    it('returns null when nothing is saved', () => {
      expect(readSavedLang()).toBeNull();
    });
  });

  describe('resolveInitialLang', () => {
    it('prefers the saved language over the browser', () => {
      localStorage.setItem('fengtech.lang', 'zh');
      expect(resolveInitialLang(['en-AU'])).toBe('zh');
    });

    it('uses the browser language when nothing is saved', () => {
      expect(resolveInitialLang(['zh-CN'])).toBe('zh');
      expect(resolveInitialLang(['en-AU'])).toBe('en');
    });
  });
});
