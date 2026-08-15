import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MetronomeAudioService } from './metronome-audio.service';
import { MetronomeService } from './metronome.service';
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

describe('MetronomeService', () => {
  let service: MetronomeService;
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('window', {
      localStorage: storage,
      setInterval,
      clearInterval,
      setTimeout,
      clearTimeout,
    });
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      visibilityState: 'visible',
    });

    TestBed.configureTestingModule({
      providers: [MetronomeService, MetronomeAudioService, MetronomeStorageService],
    });
    service = TestBed.inject(MetronomeService);
  });

  it('starts with safe defaults (120 BPM, 4/4, 16ths)', () => {
    const state = service.getState();
    expect(state.bpm).toBe(120);
    expect(state.timeSignature).toBe('4/4');
    expect(state.beatsPerBar).toBe(4);
    expect(state.denominator).toBe(4);
    expect(state.subdivision).toBe('sixteenth');
    expect(state.levelsPerBeat).toBe(4);
    expect(state.isRunning).toBe(false);
  });

  it('clamps BPM into 20..300 and persists it', () => {
    service.setBpm(10000);
    expect(service.getState().bpm).toBe(300);
    service.setBpm(2);
    expect(service.getState().bpm).toBe(20);
    expect(new MetronomeStorageService().loadSettings().bpm).toBe(20);
  });

  it('switches to a compound meter with sensible grouping defaults', () => {
    service.setTimeSignature('7/8');
    const state = service.getState();
    expect(state.beatsPerBar).toBe(7);
    expect(state.denominator).toBe(8);
    expect(state.levelsPerBeat).toBe(2); // 16ths stay valid for x/8
    expect(state.groupingPreset).toBe('2+2+3');
    expect(state.accentBeats).toEqual([0, 2, 4]);
    expect(service.getPattern()).toHaveLength(7);
  });

  it('drops compound grouping when returning to a simple meter', () => {
    service.setTimeSignature('7/8');
    service.setTimeSignature('3/4');
    const state = service.getState();
    expect(state.groupingPreset).toBe('none');
    expect(state.accentBeats).toEqual([0]);
    expect(state.levelsPerBeat).toBe(4);
  });

  it('changes subdivision and rebuilds the grid', () => {
    service.setSubdivision('triplet');
    expect(service.getState().levelsPerBeat).toBe(3);
    expect(service.getPattern()[0]).toHaveLength(3);

    service.setSubdivision('quarter');
    expect(service.getState().levelsPerBeat).toBe(1);
    expect(service.getPattern()[0]).toHaveLength(1);
  });

  it('rejects subdivisions that are invalid for the meter', () => {
    service.setTimeSignature('6/8');
    service.setSubdivision('triplet'); // triplet is x/4-only
    expect(service.getState().subdivision).toBe('sixteenth');
  });

  it('toggles pattern cells', () => {
    service.toggleCell(0, 1);
    expect(service.getPattern()[0][1]).toBe(true);
    service.toggleCell(0, 1);
    expect(service.getPattern()[0][1]).toBe(false);
  });

  it('ignores out-of-range cell toggles', () => {
    expect(() => service.toggleCell(99, 99)).not.toThrow();
    expect(() => service.toggleCell(0, 99)).not.toThrow();
  });

  it('round-trips patterns through export/apply', () => {
    service.setBpm(96);
    service.setTimeSignature('3/4');
    service.setSubdivision('eighth');
    service.setGrouping('none');
    service.toggleCell(1, 1);

    const exported = service.exportCurrentPattern('Warm-up');
    expect(exported.pattern[1][1]).toBe(true);

    // Change everything, then restore.
    service.setBpm(200);
    service.setTimeSignature('4/4');
    service.applyPattern(exported);

    const state = service.getState();
    expect(state.bpm).toBe(96);
    expect(state.timeSignature).toBe('3/4');
    expect(state.subdivision).toBe('eighth');
    expect(service.getPattern()[1][1]).toBe(true);
  });

  it('clamps volume to 0..1', () => {
    service.setVolume(3);
    expect(service.getState().volume).toBe(1);
    service.setVolume(-1);
    expect(service.getState().volume).toBe(0);
  });

  it('tracks stopwatch running state', () => {
    expect(service.getState().stopwatchRunning).toBe(false);
    service.startStopwatch();
    expect(service.getState().stopwatchRunning).toBe(true);
    service.pauseStopwatch();
    expect(service.getState().stopwatchRunning).toBe(false);
    service.startStopwatch();
    service.resetStopwatch();
    expect(service.getState().stopwatchRunning).toBe(false);
    expect(service.getState().elapsedMs).toBe(0);
  });

  it('stops cleanly even when it was never started', () => {
    expect(() => {
      service.stop();
      service.shutdown();
    }).not.toThrow();
  });
});
