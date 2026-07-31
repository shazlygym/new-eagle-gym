// Rest-timer cue.
//
// Two iOS realities shape this:
//   1. navigator.vibrate does not exist in Safari, so there is no haptic option
//      — the cue has to be audible and visible.
//   2. An AudioContext created outside a user gesture starts suspended and stays
//      that way. We create and resume it on the first real tap, then keep the
//      same context alive for the rest of the session.

let context: AudioContext | null = null

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

function createContext(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
  return Ctor ? new Ctor() : null
}

/** Call from a genuine user gesture — a tap handler, not an effect. */
export function unlockAudio(): void {
  if (!context) context = createContext()
  if (context?.state === 'suspended') void context.resume()
}

/** A quick rising arpeggio for a new personal record — a bigger moment than
 * the rest chime, so it gets one more note and a touch more level. */
export function playPrFanfare(): void {
  if (!context) return
  if (context.state === 'suspended') void context.resume()

  const now = context.currentTime
  for (const [index, frequency] of [523, 659, 784, 1046].entries()) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = now + index * 0.09

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, start)

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22)

    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.24)
  }
}

export function playRestChime(): void {
  if (!context) return
  // Safari can re-suspend the context when the app returns from the background.
  if (context.state === 'suspended') void context.resume()

  const now = context.currentTime
  // Two short rising notes — audible over gym noise without being alarming.
  for (const [index, frequency] of [880, 1320].entries()) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = now + index * 0.16

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, start)

    // Ramped rather than switched, so it doesn't click.
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14)

    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.16)
  }
}
