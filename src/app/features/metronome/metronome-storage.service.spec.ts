import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MetronomeStorageService } from './metronome-storage.service';

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('MetronomeStorageService', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
  });

  it('returns safe defaults on first run', () => {
    const service = new MetronomeStorageService();
    const settings = service.loadSettings();
    expect(settings.bpm).toBe(120);
    expect(settings.timeSignature).toBe('4/4');
    expect(settings.subdivision).toBe('sixteenth');
    expect(settings.clickSound).toBe('classic');
  });

  it('round-trips settings', () => {
    const service = new MetronomeStorageService();
    const settings = service.loadSettings();
    service.saveSettings({ ...settings, bpm: 96, volume: 0.4 });
    expect(service.loadSettings().bpm).toBe(96);
    expect(service.loadSettings().volume).toBeCloseTo(0.4);
  });

  it('sanitizes out-of-range persisted values', () => {
    storage.setItem(
      'fengtech.metronome.settings.v1',
      JSON.stringify({ bpm: 9999, volume: 5, timeSignature: '4/4' }),
    );
    const service = new MetronomeStorageService();
    const settings = service.loadSettings();
    expect(settings.bpm).toBe(300);
    expect(settings.volume).toBe(1);
  });

  it('ignores unknown persisted time signatures', () => {
    storage.setItem(
      'fengtech.metronome.settings.v1',
      JSON.stringify({ timeSignature: '9/16', subdivision: 'quarter' }),
    );
    const service = new MetronomeStorageService();
    const settings = service.loadSettings();
    expect(settings.timeSignature).toBe('4/4');
  });

  it('rejects subdivisions that are invalid for the stored meter', () => {
    storage.setItem(
      'fengtech.metronome.settings.v1',
      JSON.stringify({ timeSignature: '6/8', subdivision: 'triplet' }),
    );
    const service = new MetronomeStorageService();
    const settings = service.loadSettings();
    expect(settings.timeSignature).toBe('6/8');
    expect(settings.subdivision).toBe('sixteenth');
  });

  it('creates, lists, loads and deletes patterns', () => {
    const service = new MetronomeStorageService();
    service.savePattern({
      id: 'p1',
      name: 'Practice',
      updatedAt: 1,
      bpm: 88,
      timeSignature: '3/4',
      subdivision: 'eighth',
      accentFirstBeat: true,
      groupingPreset: 'none',
      clickSound: 'wood',
      pattern: [[true, false]],
    });

    expect(service.listPatterns()).toHaveLength(1);
    expect(service.loadPattern('p1')?.name).toBe('Practice');
    expect(service.loadPattern('missing')).toBeNull();

    service.deletePattern('p1');
    expect(service.listPatterns()).toHaveLength(0);
  });

  it('assigns a fresh id and timestamp when saving without one', () => {
    const service = new MetronomeStorageService();
    service.savePattern({
      id: '',
      name: 'NoId',
      updatedAt: 0,
      bpm: 100,
      timeSignature: '4/4',
      subdivision: 'quarter',
      accentFirstBeat: false,
      groupingPreset: 'none',
      clickSound: 'classic',
      pattern: [[true]],
    });
    const saved = service.listPatterns()[0];
    expect(saved.id).not.toBe('');
    expect(saved.updatedAt).toBeGreaterThan(0);
  });
});
