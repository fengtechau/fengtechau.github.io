import { Injectable } from '@angular/core';

import { ClickKind, ClickSoundId } from './metronome.models';

interface ClickSpec {
  /** Oscillator frequency in Hz. */
  freq: number;
  type: OscillatorType;
  gain: number;
  durationMs: number;
}

interface SoundProfile {
  downbeat: ClickSpec;
  accent: ClickSpec;
  main: ClickSpec;
  sub: ClickSpec;
}

/**
 * Synthesized click profiles. Accent hierarchy is always audible:
 * downbeat > group accent > normal beat > subdivision.
 */
const SOUND_PROFILES: Record<ClickSoundId, SoundProfile> = {
  classic: {
    downbeat: { freq: 1900, type: 'square', gain: 0.95, durationMs: 30 },
    accent: { freq: 1450, type: 'square', gain: 0.8, durationMs: 24 },
    main: { freq: 980, type: 'square', gain: 0.62, durationMs: 20 },
    sub: { freq: 660, type: 'triangle', gain: 0.34, durationMs: 12 },
  },
  wood: {
    downbeat: { freq: 1150, type: 'sine', gain: 0.95, durationMs: 26 },
    accent: { freq: 950, type: 'sine', gain: 0.78, durationMs: 22 },
    main: { freq: 820, type: 'sine', gain: 0.62, durationMs: 18 },
    sub: { freq: 640, type: 'sine', gain: 0.34, durationMs: 10 },
  },
  beep: {
    downbeat: { freq: 1568, type: 'sine', gain: 0.9, durationMs: 45 },
    accent: { freq: 1318, type: 'sine', gain: 0.7, durationMs: 38 },
    main: { freq: 1046, type: 'sine', gain: 0.5, durationMs: 32 },
    sub: { freq: 784, type: 'sine', gain: 0.3, durationMs: 18 },
  },
  pulse: {
    downbeat: { freq: 880, type: 'square', gain: 0.85, durationMs: 24 },
    accent: { freq: 740, type: 'square', gain: 0.68, durationMs: 20 },
    main: { freq: 600, type: 'square', gain: 0.52, durationMs: 16 },
    sub: { freq: 440, type: 'square', gain: 0.28, durationMs: 10 },
  },
};

/** A clip currently scheduled on the Web Audio clock. */
interface PendingClip {
  generation: number;
  sources: AudioScheduledSourceNode[];
  gainNode: GainNode;
  osc?: OscillatorNode;
  noiseSrc?: AudioBufferSourceNode;
  noiseGain?: GainNode;
}

/**
 * Owns the AudioContext and all click synthesis.
 *
 * Every clip belongs to a transport "generation". Stopping the transport
 * bumps the generation and hard-stops every pending clip of older
 * generations, so rapid start/stop and tempo changes can never produce
 * overlapping or ghost clicks.
 */
@Injectable({ providedIn: 'root' })
export class MetronomeAudioService {
  private ctx: AudioContext | undefined;
  private master: GainNode | undefined;
  private noiseBuffer: AudioBuffer | undefined;
  private readonly pending = new Set<PendingClip>();

  async ensureRunning(): Promise<void> {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /** Current position on the audio clock (seconds). */
  get currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /** Smoothed master volume (0..1). */
  setVolume(volume: number): void {
    if (!this.ctx || !this.master) {
      return;
    }
    this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02);
  }

  /** Schedules one click at an absolute audio-clock time. */
  playClick(
    time: number,
    sound: ClickSoundId,
    kind: ClickKind,
    generation: number,
  ): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) {
      return;
    }

    const spec = SOUND_PROFILES[sound][kind];
    const clip: PendingClip = {
      generation,
      sources: [],
      gainNode: ctx.createGain(),
    };

    const { gainNode } = clip;
    const attack = Math.min(0.004, spec.durationMs / 4000);
    const peakAt = time + attack;
    const endAt = time + spec.durationMs / 1000;

    gainNode.gain.setValueAtTime(0.0001, time);
    gainNode.gain.exponentialRampToValueAtTime(spec.gain, peakAt);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);
    gainNode.connect(master);

    if (sound === 'wood') {
      // Woodblock = quick downward-pitched sine body + a short noise burst.
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(spec.freq * 1.4, time);
      osc.frequency.exponentialRampToValueAtTime(spec.freq * 0.62, endAt);
      osc.connect(gainNode);
      osc.start(time);
      osc.stop(endAt + 0.01);
      clip.osc = osc;
      clip.sources.push(osc);

      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.getNoiseBuffer(ctx);
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 2200;
      bandpass.Q.value = 1.2;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, time);
      noiseGain.gain.exponentialRampToValueAtTime(spec.gain * 0.5, peakAt);
      noiseGain.gain.exponentialRampToValueAtTime(
        0.0001,
        time + Math.min(0.02, spec.durationMs / 2000),
      );
      noiseSrc.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(gainNode);
      noiseSrc.start(time);
      noiseSrc.stop(time + 0.05);
      clip.noiseSrc = noiseSrc;
      clip.noiseGain = noiseGain;
      clip.sources.push(noiseSrc);
    } else {
      const osc = ctx.createOscillator();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.freq, time);
      osc.connect(gainNode);
      osc.start(time);
      osc.stop(endAt + 0.01);
      clip.osc = osc;
      clip.sources.push(osc);
    }

    this.pending.add(clip);

    // Self-cleanup once the clip has finished naturally.
    const cleanup = (): void => {
      this.disposeClip(clip);
      this.pending.delete(clip);
    };
    const longest = clip.sources.at(-1);
    longest?.addEventListener('ended', cleanup);
  }

  /**
   * Immediately silences every pending clip that does not belong to the
   * current generation. Prevents note overlap on stop / re-start /
   * meter changes.
   */
  cancelPending(generation: number): void {
    for (const clip of [...this.pending]) {
      if (clip.generation !== generation) {
        this.disposeClip(clip);
        this.pending.delete(clip);
      }
    }
  }

  /** Stops and releases the AudioContext (e.g. page navigation). */
  async close(): Promise<void> {
    for (const clip of [...this.pending]) {
      this.disposeClip(clip);
      this.pending.delete(clip);
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      await this.ctx.close().catch(() => undefined);
    }
    this.ctx = undefined;
    this.master = undefined;
    this.noiseBuffer = undefined;
  }

  private disposeClip(clip: PendingClip): void {
    for (const source of clip.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already stopped — nothing to do.
      }
      try {
        source.disconnect();
      } catch {
        // Already disconnected.
      }
    }
    clip.gainNode.disconnect();
  }

  /** Lazily created white-noise buffer shared by all woodblock clicks. */
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 0.1);
      this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.noiseBuffer;
  }
}
