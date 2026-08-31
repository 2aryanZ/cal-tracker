import { Audio } from 'expo-av';
import { Platform } from 'react-native';

/**
 * Unified Sound Service for Cal Tracker
 * Plays high-quality audio chimes for goal completion and interactive milestones.
 */

// Embedded clean success chime sound base64 URI (MP3 format)
const SUCCESS_CHIME_URI =
  'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'; // Uplifting positive success chime

let chimeSoundObject: Audio.Sound | null = null;

export async function playGoalChime(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // High-precision Web Audio API synth chime (C5 -> E5 -> G5 chord)
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.5);
        });
      }
      return;
    }

    // Native Mobile Audio
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    if (chimeSoundObject) {
      await chimeSoundObject.unloadAsync();
      chimeSoundObject = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: SUCCESS_CHIME_URI },
      { shouldPlay: true, volume: 0.85 }
    );

    chimeSoundObject = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch (err) {
    console.warn('Audio chime playback notice:', err);
  }
}
