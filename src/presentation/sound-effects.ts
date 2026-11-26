import { ref } from 'vue'

const STORAGE_KEY = 'retonautas.sound-enabled'

function readPreference(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export const soundEnabled = ref(readPreference())
export const soundUnavailable = ref(false)

let audioContext: AudioContext | null = null

export type SoundCue = 'correct' | 'incorrect' | 'streak' | 'key' | 'chest' | 'finish'

const melodies: Record<SoundCue, readonly number[]> = {
  correct: [523, 659],
  incorrect: [330, 294],
  streak: [523, 659, 784],
  key: [659, 880],
  chest: [392, 494, 659, 784],
  finish: [523, 659, 784, 1047],
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled.value = enabled
  soundUnavailable.value = false
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, String(enabled))
  } catch {
    // Audio remains usable in memory if the browser blocks storage.
  }
  if (!enabled && audioContext?.state === 'running') {
    void audioContext.suspend().catch(() => {
      soundUnavailable.value = true
    })
  }
}

export function playSoundEffect(cue: SoundCue): void {
  playSoundEffects([cue])
}

export function playSoundEffects(cues: readonly SoundCue[]): void {
  if (!soundEnabled.value || cues.length === 0) return
  void playMelodies(cues)
}

async function playMelodies(cues: readonly SoundCue[]): Promise<void> {
  const context = getAudioContext()
  if (!context) return

  try {
    await context.resume()
    if (!soundEnabled.value || context.state !== 'running') {
      soundUnavailable.value = true
      return
    }
    let offset = 0.015
    for (const cue of cues) {
      const notes = melodies[cue]
      notes.forEach((frequency, index) => {
        playTone(context, frequency, context.currentTime + offset + index * 0.075, 0.11)
      })
      offset += notes.length * 0.075 + 0.035
    }
  } catch {
    soundUnavailable.value = true
  }
}

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext
  if (typeof globalThis.AudioContext !== 'function') {
    soundUnavailable.value = true
    return null
  }

  try {
    audioContext = new globalThis.AudioContext()
    return audioContext
  } catch {
    soundUnavailable.value = true
    return null
  }
}

function playTone(context: AudioContext, frequency: number, start: number, duration: number): void {
  const oscillator = context.createOscillator()
  const volume = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, start)
  volume.gain.setValueAtTime(0.0001, start)
  volume.gain.exponentialRampToValueAtTime(0.075, start + 0.02)
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(volume)
  volume.connect(context.destination)
  oscillator.onended = () => {
    oscillator.disconnect()
    volume.disconnect()
  }
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}
