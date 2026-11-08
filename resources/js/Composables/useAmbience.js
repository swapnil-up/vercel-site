import { onBeforeUnmount, ref } from 'vue'

/**
 * Dulna Jaam ambience: a warm, slowly breathing drone with sparse bell tones.
 *
 * Everything is synthesized (no audio assets). Off by default; the navbar
 * toggle starts the AudioContext, which browsers only allow after a gesture.
 */
export function useAmbience() {
  const enabled = ref(false)
  const supported =
    typeof window !== 'undefined' &&
    Boolean(window.AudioContext || window.webkitAudioContext)

  let context = null
  let master = null
  let built = false
  let timer = null
  let suspendTimer = null

  function build() {
    const Ctor = window.AudioContext || window.webkitAudioContext
    context = new Ctor()

    master = context.createGain()
    master.gain.value = 0.0001
    master.connect(context.destination)

    // Warm drone: root + fifth + octave, gently detuned so it shimmers.
    const drone = context.createGain()
    drone.gain.value = 0.13

    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 780
    filter.Q.value = 0.5

    drone.connect(filter)
    filter.connect(master)

    const root = 98.0
    const voices = [
      { freq: root, gain: 0.5, type: 'sine', detune: -4 },
      { freq: root * 1.5, gain: 0.26, type: 'sine', detune: 3 },
      { freq: root * 2, gain: 0.18, type: 'sine', detune: -2 },
      { freq: root * 4, gain: 0.05, type: 'triangle', detune: 5 },
    ]

    for (const voice of voices) {
      const osc = context.createOscillator()
      osc.type = voice.type
      osc.frequency.value = voice.freq
      osc.detune.value = voice.detune

      const gain = context.createGain()
      gain.gain.value = voice.gain

      osc.connect(gain)
      gain.connect(drone)
      osc.start()
    }

    // Slow "breathing" so the drone never sits still.
    const lfo = context.createOscillator()
    lfo.frequency.value = 0.045
    const lfoGain = context.createGain()
    lfoGain.gain.value = 0.035
    lfo.connect(lfoGain)
    lfoGain.connect(drone.gain)
    lfo.start()

    built = true
  }

  // C-major pentatonic, a couple of octaves up: soft, resolved, never jarring.
  const bellNotes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]

  function bell(freq, when, level) {
    const osc = context.createOscillator()
    const overtone = context.createOscillator()
    const gain = context.createGain()

    osc.type = 'sine'
    osc.frequency.value = freq
    overtone.type = 'sine'
    overtone.frequency.value = freq * 2.01

    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(level, when + 0.12)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 4.2)

    const overtoneGain = context.createGain()
    overtoneGain.gain.value = 0.35

    osc.connect(gain)
    overtone.connect(overtoneGain)
    overtoneGain.connect(gain)
    gain.connect(master)

    osc.start(when)
    overtone.start(when)
    osc.stop(when + 4.4)
    overtone.stop(when + 4.4)

    osc.onended = () => {
      osc.disconnect()
      overtone.disconnect()
      overtoneGain.disconnect()
      gain.disconnect()
    }
  }

  function scheduleChime() {
    if (!context || !master || !enabled.value) return

    const now = context.currentTime
    const note = bellNotes[Math.floor(Math.random() * bellNotes.length)]
    bell(note, now + 0.05, 0.022)

    // Occasionally answer with a higher note a beat later.
    if (Math.random() > 0.55) {
      const answer = bellNotes[Math.floor(Math.random() * bellNotes.length)] * 2
      bell(answer, now + 2.4, 0.012)
    }

    timer = window.setTimeout(scheduleChime, 11000 + Math.random() * 16000)
  }

  function start() {
    if (!supported) return
    if (!built) build()

    window.clearTimeout(suspendTimer)
    enabled.value = true
    if (context.state === 'suspended') {
      context.resume().catch(() => {
        enabled.value = false
      })
    }

    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now)
    master.gain.exponentialRampToValueAtTime(0.34, now + 2.2)

    window.clearTimeout(timer)
    timer = window.setTimeout(scheduleChime, 3200)
  }

  function stop() {
    if (!context || !master) return

    enabled.value = false
    window.clearTimeout(timer)

    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.8)

    suspendTimer = window.setTimeout(() => {
      if (!enabled.value && context.state === 'running') {
        context.suspend().catch(() => {})
      }
    }, 1100)
  }

  function toggle() {
    if (enabled.value) stop()
    else start()
  }

  onBeforeUnmount(() => {
    window.clearTimeout(timer)
    window.clearTimeout(suspendTimer)
    if (context && context.state !== 'closed') {
      context.close().catch(() => {})
    }
  })

  return { enabled, supported, toggle }
}
