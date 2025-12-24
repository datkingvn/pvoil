import { Howl } from "howler";

// Generate simple sound effects using Web Audio API
const createBeep = (frequency: number, duration: number, type: OscillatorType = "sine"): string => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);

  return ""; // Return empty string as we're using Web Audio API directly
};

export class SoundManager {
  private buzzSound: Howl | null = null;
  private correctSound: Howl | null = null;
  private wrongSound: Howl | null = null;
  private countdownSound: Howl | null = null;
  private ambienceSound: Howl | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window === "undefined") return;

    // Buzz sound - short beep
    this.buzzSound = new Howl({
      src: [this.generateBuzzSound()],
      volume: 0.7,
    });

    // Correct sound - ascending tone
    this.correctSound = new Howl({
      src: [this.generateCorrectSound()],
      volume: 0.6,
    });

    // Wrong sound - descending tone
    this.wrongSound = new Howl({
      src: [this.generateWrongSound()],
      volume: 0.6,
    });

    // Countdown beep
    this.countdownSound = new Howl({
      src: [this.generateBeepSound(800)],
      volume: 0.5,
    });
  }

  private generateBuzzSound(): string {
    // Generate a short buzz sound using data URL
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.2;
    const samples = Math.floor(sampleRate * duration);
    const buffer = audioContext.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * 400 * t) * Math.exp(-t * 5);
    }

    return ""; // We'll use Web Audio API directly
  }

  private generateCorrectSound(): string {
    return ""; // Use Web Audio API
  }

  private generateWrongSound(): string {
    return ""; // Use Web Audio API
  }

  private generateBeepSound(freq: number): string {
    return ""; // Use Web Audio API
  }

  playBuzz() {
    if (!this.enabled) return;
    this.playBeep(400, 0.2);
  }

  playCorrect() {
    if (!this.enabled) return;
    this.playBeep(600, 0.3);
    setTimeout(() => this.playBeep(800, 0.2), 100);
  }

  playWrong() {
    if (!this.enabled) return;
    this.playBeep(300, 0.4);
  }

  playCountdown() {
    if (!this.enabled) return;
    this.playBeep(800, 0.1);
  }

  private playBeep(frequency: number, duration: number) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.warn("Audio playback failed:", e);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  startAmbience() {
    // Simple ambient loop using Web Audio API
    // This is a placeholder - in production you'd load an actual audio file
  }

  stopAmbience() {
    // Stop ambient sound
  }
}

export const soundManager = new SoundManager();

