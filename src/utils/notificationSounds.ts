// Utility for playing notification sounds
class NotificationSounds {
  private static instance: NotificationSounds;
  private audioContext: AudioContext | null = null;
  private soundBuffer: AudioBuffer | null = null;

  constructor() {
    this.initAudioContext();
    this.createNotificationSound();
  }

  static getInstance(): NotificationSounds {
    if (!NotificationSounds.instance) {
      NotificationSounds.instance = new NotificationSounds();
    }
    return NotificationSounds.instance;
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private createNotificationSound() {
    if (!this.audioContext) return;

    // Create a short, pleasant notification sound (bell-like tone)
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.5; // 500ms
    const frameCount = sampleRate * duration;
    
    const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Generate a pleasant bell-like tone (multiple sine waves)
    for (let i = 0; i < frameCount; i++) {
      const time = i / sampleRate;
      const envelope = Math.exp(-time * 3); // Exponential decay
      
      // Fundamental frequency (800Hz) + harmonics
      const fundamental = Math.sin(2 * Math.PI * 800 * time) * 0.5;
      const harmonic1 = Math.sin(2 * Math.PI * 1200 * time) * 0.3;
      const harmonic2 = Math.sin(2 * Math.PI * 1600 * time) * 0.2;
      
      channelData[i] = (fundamental + harmonic1 + harmonic2) * envelope * 0.3;
    }

    this.soundBuffer = buffer;
  }

  async playNotificationSound(volume: number = 0.5) {
    if (!this.audioContext || !this.soundBuffer) {
      console.warn('Audio context or sound buffer not available');
      return;
    }

    try {
      // Resume audio context if suspended (required for user interaction)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = this.soundBuffer;
      gainNode.gain.value = Math.min(Math.max(volume, 0), 1); // Clamp between 0 and 1
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  // Alternative method using a simple beep
  async playSimpleBeep(frequency: number = 800, duration: number = 200, volume: number = 0.3) {
    if (!this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration / 1000);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Failed to play beep sound:', error);
    }
  }

  // Play different sounds for different notification types
  async playNotification(type: 'message' | 'job_match' | 'job_update' | 'payment' | 'rating' | 'system' | 'default' = 'default') {
    switch (type) {
      case 'message':
        await this.playSimpleBeep(600, 300, 0.4); // Lower tone for messages
        break;
      case 'job_match':
      case 'job_update':
        await this.playSimpleBeep(1000, 400, 0.5); // Higher tone for job matches/updates
        break;
      case 'payment':
        await this.playSimpleBeep(800, 200, 0.6); // Medium tone for payments
        setTimeout(() => this.playSimpleBeep(1000, 200, 0.4), 150); // Double beep
        break;
      case 'rating':
        await this.playSimpleBeep(900, 300, 0.4); // Pleasant tone for ratings
        break;
      case 'system':
        await this.playSimpleBeep(400, 500, 0.3); // Lower, longer tone for system notifications
        break;
      default:
        await this.playNotificationSound();
    }
  }
}

export const notificationSounds = NotificationSounds.getInstance();