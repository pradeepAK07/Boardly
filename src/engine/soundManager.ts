export type SoundType = 'move' | 'capture' | 'check' | 'game-end';

class SoundManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private enabled = true;
  private volume = 0.5;

  constructor() {
    if (typeof window !== 'undefined') {
      this.sounds.set('move', new Audio('/sounds/move.mp3'));
      this.sounds.set('capture', new Audio('/sounds/capture.mp3'));
      this.sounds.set('check', new Audio('/sounds/check.mp3'));
      this.sounds.set('game-end', new Audio('/sounds/game-end.mp3'));

      for (const audio of this.sounds.values()) {
        audio.volume = this.volume;
        audio.preload = 'auto';
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    for (const audio of this.sounds.values()) {
      audio.volume = this.volume;
    }
  }

  getVolume() {
    return this.volume;
  }

  play(type: SoundType) {
    if (!this.enabled || typeof window === 'undefined') return;

    const audio = this.sounds.get(type);
    if (audio) {
      try {
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.volume = this.volume;
        const playPromise = clone.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.log('Sound play failed:', err);
          });
        }
      } catch (e) {
        console.log('Sound error:', e);
      }
    } else {
      console.log('Sound not found:', type);
    }
  }
}

export const soundManager = new SoundManager();
