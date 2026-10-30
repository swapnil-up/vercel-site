import { onBeforeUnmount, ref } from 'vue'

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

    const length = context.sampleRate * 3
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.2
    }

    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const highpass = context.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 90

    const lowpass = context.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 520
    lowpass.Q.value = 0.4

    const hum = context.createGain()
    hum.gain.value = 0.26

    source.connect(highpass)
    highpass.connect(lowpass)
    lowpass.connect(hum)
    hum.connect(master)
    source.start()

    const lfo = context.createOscillator()
    lfo.frequency.value = 0.08
    const lfoGain = context.createGain()
    lfoGain.gain.value = 160
    lfo.connect(lfoGain)
    lfoGain.connect(lowpass.frequency)
    lfo.start()

    built = true
  }

  function chime() {
    if (!context || !master || !enabled.value) return

    const now = context.currentTime
    const notes = [880, 1174.66, 1318.51]
    const osc = context.createOscillator()
    const gain = context.createGain()

    osc.type = 'sine'
    osc.frequency.value = notes[Math.floor(Math.random() * notes.length)]
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2)

    osc.connect(gain)
    gain.connect(master)
    osc.start(now)
    osc.stop(now + 3.4)
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
    }

    timer = window.setTimeout(chime, 14000 + Math.random() * 18000)
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
    master.gain.exponentialRampToValueAtTime(0.6, now + 1.4)

    window.clearTimeout(timer)
    timer = window.setTimeout(chime, 2500)
  }

  function stop() {
    if (!context || !master) return

    enabled.value = false
    window.clearTimeout(timer)

    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)

    suspendTimer = window.setTimeout(() => {
      if (!enabled.value && context.state === 'running') {
        context.suspend().catch(() => {})
      }
    }, 900)
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
