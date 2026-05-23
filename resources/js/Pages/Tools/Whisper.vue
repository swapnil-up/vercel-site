<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const kSampleRate = 16000
const kMaxRecordingS = 120

const phase = ref('init')
const status = ref('')
const error = ref('')
const modelProgress = ref(0)
const transcription = ref('')
const segments = ref([])
const isRecording = ref(false)
const recordingDuration = ref(0)
const engineReady = ref(false)
const modelReady = ref(false)

let whisperInstance = null
let audioData = null
let audioContext = null
let mediaRecorder = null
let mediaStream = null
let recordingTimer = null

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

async function loadCOI() {
  try {
    const s = document.createElement('script')
    s.src = '/coi-serviceworker.js'
    document.head.appendChild(s)
  } catch {
    console.warn('COI service worker not available, threading disabled')
  }
}

function checkCachedModel() {
  return new Promise((resolve) => {
    const rq = indexedDB.open('whisper.ggerganov.com', 1)
    rq.onupgradeneeded = () => resolve(null)
    rq.onsuccess = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('models')) { db.close(); resolve(null); return }
      const tx = db.transaction('models', 'readonly')
      const os = tx.objectStore('models')
      const get = os.get('https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q5_1.bin')
      get.onsuccess = () => { db.close(); resolve(get.result) }
      get.onerror = () => { db.close(); resolve(null) }
    }
    rq.onerror = () => resolve(null)
  })
}

onMounted(async () => {
  await loadCOI()

  phase.value = 'loading-engine'
  status.value = 'Loading whisper engine...'

  try {
    const timestampRe = /^\[(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})\]\s*(.*)/

    window.Module = {
      print: (text) => {
        if (typeof text !== 'string') return
        if (text.includes('whisper_print_timings')) {
          phase.value = 'done'
          status.value = 'Transcription complete'
        }
        if (!text.startsWith('system_info') && !text.startsWith('whisper_')) {
          transcription.value += text + '\n'
          const m = text.match(timestampRe)
          if (m) {
            const toSec = (h, m, s, ms) => parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000
            segments.value.push({
              start: toSec(m[1], m[2], m[3], m[4]),
              end: toSec(m[5], m[6], m[7], m[8]),
              text: m[9],
            })
          }
        }
      },
      printErr: (text) => {
        if (typeof text === 'string' && text.includes('whisper_print_timings')) {
          phase.value = 'done'
          status.value = 'Transcription complete'
        }
        console.log('[whisper]', text)
      },
      setStatus: (text) => { status.value = text },
    }

    window.dbVersion = 1
    window.dbName = 'whisper.ggerganov.com'

    await loadScript('/whisper/helpers.js')
    await loadScript('/whisper/main.js')
    await Module.ready

    engineReady.value = true

    const cached = await checkCachedModel()
    if (cached) {
      try { Module.FS_unlink('whisper.bin') } catch {}
      Module.FS_createDataFile('/', 'whisper.bin', cached, true, true)
      whisperInstance = Module.init('whisper.bin')
      if (whisperInstance) {
        modelReady.value = true
        phase.value = 'model-ready'
        status.value = 'Model loaded from cache. Record audio to transcribe.'
      } else {
        phase.value = 'engine-ready'
        status.value = 'Engine loaded. Download model to begin.'
      }
    } else {
      phase.value = 'engine-ready'
      status.value = 'Engine loaded. Download model to begin.'
    }
  } catch (e) {
    error.value = e.message
  }
})

onUnmounted(() => {
  if (recordingTimer) clearInterval(recordingTimer)
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop())
  if (audioContext) audioContext.close()
})

async function loadModel() {
  if (!engineReady.value) return

  phase.value = 'loading-model'
  status.value = 'Downloading model...'
  modelProgress.value = 0

  const url = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q5_1.bin'

  if (Module.ready) await Module.ready

  loadRemote(
    url,
    'whisper.bin',
    31,
    (p) => { modelProgress.value = p },
    (fname, buf) => {
      try { Module.FS_unlink(fname) } catch {}
      Module.FS_createDataFile('/', fname, buf, true, true)

      whisperInstance = Module.init('whisper.bin')
      if (whisperInstance) {
        modelReady.value = true
        phase.value = 'model-ready'
        status.value = 'Model loaded. Record audio to transcribe.'
      } else {
        error.value = 'Failed to initialize whisper model'
        phase.value = 'engine-ready'
      }
    },
    () => {
      error.value = 'Model download cancelled'
      phase.value = 'engine-ready'
    },
    (msg) => { status.value = msg },
  )
}

async function handleFileUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return

  phase.value = 'transcribing'
  status.value = 'Decoding audio...'

  if (!audioContext) {
    audioContext = new AudioContext({ sampleRate: kSampleRate })
  }

  await decodeAudio(file)
  if (audioData) transcribe()
}

async function startRecording() {
  try {
    if (!audioContext) {
      audioContext = new AudioContext({ sampleRate: kSampleRate })
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    })

    mediaRecorder = new MediaRecorder(mediaStream)
    const chunks = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      await decodeAudio(blob)
      if (audioData) transcribe()
    }

    mediaRecorder.start()
    isRecording.value = true
    recordingDuration.value = 0

    recordingTimer = setInterval(() => {
      recordingDuration.value++
      if (recordingDuration.value >= kMaxRecordingS) stopRecording()
    }, 1000)

    phase.value = 'recording'
    status.value = 'Recording...'
  } catch (e) {
    error.value = 'Microphone access denied: ' + e.message
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    isRecording.value = false
    clearInterval(recordingTimer)
    mediaStream?.getTracks().forEach(t => t.stop())
  }
}

async function decodeAudio(blob) {
  try {
    const buf = await blob.arrayBuffer()
    const decoded = await audioContext.decodeAudioData(buf)
    const offlineCtx = new OfflineAudioContext(
      1,
      Math.round(decoded.duration * kSampleRate),
      kSampleRate,
    )
    const source = offlineCtx.createBufferSource()
    source.buffer = decoded
    source.connect(offlineCtx.destination)
    source.start(0)
    const rendered = await offlineCtx.startRendering()
    audioData = rendered.getChannelData(0)
  } catch (e) {
    error.value = 'Audio decoding failed: ' + e.message
  }
}

function transcribe() {
  if (!whisperInstance || !audioData) return

  phase.value = 'transcribing'
  status.value = 'Transcribing...'
  transcription.value = ''

  setTimeout(() => {
    Module.full_default(whisperInstance, audioData, 'en', 4, false)
  }, 100)
}

function copyText() {
  navigator.clipboard.writeText(transcription.value)
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportTxt(withTimestamps) {
  const text = withTimestamps
    ? segments.value.map(s => {
        const fmt = (t) => {
          const h = Math.floor(t / 3600)
          const m = Math.floor((t % 3600) / 60)
          const sec = t % 60
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toFixed(3).padStart(6, '0')}`
        }
        return `[${fmt(s.start)} --> ${fmt(s.end)}] ${s.text}`
      }).join('\n')
    : segments.value.map(s => s.text).join('\n')
  downloadFile(text, `transcript${withTimestamps ? '' : '-text'}.txt`, 'text/plain')
}

function exportJson(withTimestamps) {
  const data = withTimestamps
    ? segments.value
    : segments.value.map(s => s.text)
  downloadFile(JSON.stringify(data, null, 2), `transcript${withTimestamps ? '' : '-text'}.json`, 'application/json')
}

function reset() {
  audioData = null
  transcription.value = ''
  segments.value = []
  error.value = ''
  phase.value = 'model-ready'
  status.value = 'Model loaded. Record audio to transcribe.'
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="whisper-page min-h-screen">
    <div class="max-w-3xl mx-auto px-4 py-10">

      <!-- Header -->
      <div class="text-center mb-10">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium tracking-wider uppercase mb-4"
          :class="modelReady ? 'bg-mint/10 text-mint border border-mint/20' : 'bg-neutral-800 text-warm-muted border border-neutral-700'">
          <span class="w-1.5 h-1.5 rounded-full" :class="modelReady ? 'bg-mint' : 'bg-warm-muted'" />
          {{ modelReady ? 'Model ready' : 'Engine not loaded' }}
        </div>
        <h1 class="text-2xl font-bold font-display font-display text-3xl font-bold text-ink tracking-tighter">whisper</h1>
        <p class="text-sm text-warm-muted mt-1">in-browser speech-to-text via whisper.cpp WASM</p>
      </div>

      <div v-if="error" class="mb-6 p-4 bg-coral/10 border border-coral/20 rounded-sm text-coral text-sm">
        {{ error }}
      </div>

      <!-- Model Section -->
      <div class="mb-6">
        <div v-if="phase === 'init' || phase === 'loading-engine'"
          class="flex items-center gap-3 p-4 rounded-sm bg-warm-surface border border-warm-border">
          <div class="w-2 h-2 rounded-full bg-coral animate-plus" />
          <span class="text-sm text-warm-muted">{{ status }}</span>
        </div>

        <div v-else-if="phase === 'engine-ready'"
          class="p-5 rounded-sm bg-warm-surface border border-warm-border">
          <p class="text-sm text-warm-muted mb-4">
            Download a quantized Whisper model to get started. Cached in your browser for future use.
          </p>
          <button @click="loadModel"
            class="btn-amber">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Download tiny.en (31 MB)
          </button>
        </div>

        <div v-else-if="phase === 'loading-model'"
          class="p-5 rounded-sm bg-warm-surface border border-warm-border">
          <div class="flex items-center gap-2 text-sm text-warm-muted mb-3">
            <div class="w-1.5 h-1.5 rounded-full bg-coral animate-plus" />
            {{ status }}
          </div>
          <div class="h-1.5 rounded-full bg-warm-border overflow-hidden rounded-sm">
            <div class="h-full rounded-full bg-gradient-to-r from-coral to-mustard transition-all duration-300"
              :style="{ width: Math.round(modelProgress * 100) + '%' }" />
          </div>
          <p class="text-xs text-warm-muted mt-1.5 font-mono">{{ Math.round(modelProgress * 100) }}%</p>
        </div>

        <div v-else
          class="flex items-center gap-3 p-4 rounded-sm bg-warm-surface border border-warm-border">
          <svg class="w-4 h-4 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-sm text-mint font-medium">tiny.en-q5_1 loaded</span>
        </div>
      </div>

      <!-- Input Section -->
      <div class="mb-6 transition-opacity duration-300"
        :class="{ 'opacity-30 pointer-events-none': !modelReady && phase !== 'recording' }">

        <div class="grid grid-cols-2 gap-3">
          <!-- Record Card -->
          <div @click="isRecording ? stopRecording() : startRecording()"
            class="input-card group cursor-pointer"
            :class="{ 'ring-2 ring-coral/40 bg-coral/5 border-coral/30': isRecording, 'border-warm-border hover:border-coral': !isRecording }">
            <div class="flex flex-col items-center gap-3 py-6">
              <div class="record-btn" :class="{ recording: isRecording }">
                <div class="record-btn-inner" :class="{ recording: isRecording }">
                  <div v-if="isRecording" class="record-stop-icon" />
                  <svg v-else class="w-6 h-6 text-warm-muted group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              </div>
              <div class="text-center">
                <p class="text-sm font-medium" :class="isRecording ? 'text-coral' : 'text-ink'">
                  {{ isRecording ? formatTime(recordingDuration) : 'Record' }}
                </p>
                <p class="text-xs text-warm-muted mt-0.5">{{ isRecording ? 'tap to stop' : 'microphone' }}</p>
              </div>
            </div>
          </div>

          <!-- Upload Card -->
          <div class="input-card border border-dashed border-warm-border hover:border-coral transition-colors">
            <input type="file" accept="audio/*" @change="handleFileUpload" class="hidden" id="audio-upload" />
            <label for="audio-upload" class="flex flex-col items-center gap-3 py-6 cursor-pointer">
              <div class="w-12 h-12 rounded-full bg-cream flex items-center justify-center group-hover:bg-coral/10 transition-colors">
                <svg class="w-5 h-5 text-warm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div class="text-center">
                <p class="text-sm font-medium text-ink">Upload</p>
                <p class="text-xs text-warm-muted mt-0.5">mp3, wav, m4a, ogg</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Transcription Output -->
      <div class="rounded-sm bg-warm-surface border border-warm-border overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
          <div class="flex items-center gap-2">
            <div class="flex gap-1">
              <span class="w-2 h-2 rounded-full bg-neutral-700" />
              <span class="w-2 h-2 rounded-full bg-neutral-700" />
              <span class="w-2 h-2 rounded-full bg-neutral-700" />
            </div>
            <span class="text-xs text-warm-muted font-mono ml-2">transcript</span>
          </div>
          <div class="flex items-center gap-2">
            <div v-if="segments.length > 0" class="flex gap-1">
              <button @click="exportTxt(true)" class="toolbar-btn" title="Export TXT with timestamps">TXT</button>
              <button @click="exportTxt(false)" class="toolbar-btn" title="Export TXT text only">TXT–</button>
              <button @click="exportJson(true)" class="toolbar-btn" title="Export JSON with timestamps">JSON</button>
              <button @click="exportJson(false)" class="toolbar-btn" title="Export JSON text only">JSON–</button>
            </div>
            <button v-if="transcription" @click="copyText" class="toolbar-btn" title="Copy to clipboard">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button v-if="phase === 'done'" @click="reset" class="toolbar-btn text-mint hover:text-emerald-300" title="Record again">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="phase === 'transcribing'" class="flex items-center gap-2 px-5 py-3 bg-neutral-950/50">
          <div class="wave">
            <span class="wave-bar" />
            <span class="wave-bar" />
            <span class="wave-bar" />
            <span class="wave-bar" />
          </div>
          <span class="text-xs text-warm-muted">{{ status }}</span>
        </div>

        <div v-if="transcription"
          class="terminal-output">
          <div class="p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {{ transcription }}
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-16 text-neutral-700">
          <svg class="w-8 h-8 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-xs">transcription will appear here</p>
        </div>
      </div>

      <p class="mt-4 text-xs text-neutral-700 text-center">
        whisper.cpp WASM &middot; {{ modelReady ? 'model cached in IndexedDB' : 'no model loaded' }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.whisper-page {
  background: var(--color-cream);
  color: var(--color-ink);
}

.btn-amber {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 0.75rem;
  background: var(--color-coral);
  color: #1c1917;
  transition: all 0.2s;
}
.btn-amber:hover {
  background: var(--color-coral); opacity: 0.8;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
}

.input-card {
  border-radius: 1rem;
  background: var(--color-warm-surface);
  border: 1px solid var(--color-warm-border);
  transition: all 0.2s;
}

.record-btn {
  width: 4rem;
  height: 4rem;
  border-radius: 9999px;
  background: var(--color-warm-surface);
  border: 1px solid var(--color-warm-border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}
.record-btn.recording {
  background: var(--color-coral);
  opacity: 0.15;
  box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
  animation: record-pulse 1.5s infinite;
}
@keyframes record-pulse {
  0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
  70% { box-shadow: 0 0 0 12px rgba(245, 158, 11, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
}

.record-btn-inner {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  background: var(--color-warm-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}
.record-btn-inner.recording {
  background: var(--color-coral);
  border-radius: 0.375rem;
  width: 1.25rem;
  height: 1.25rem;
}
.record-stop-icon {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 1px;
  background: var(--color-cream);
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 500;
  font-family: ui-monospace, monospace;
  color: var(--color-warm-muted);
  background: transparent;
  border-radius: 0.375rem;
  transition: all 0.15s;
}
.toolbar-btn:hover {
  color: #d4d4d8;
  background: var(--color-warm-surface);
  border: 1px solid var(--color-warm-border);
}

.terminal-output {
  background: var(--color-ink);
  max-height: 28rem;
  overflow-y: auto;
  color: #4ade80;
  scrollbar-width: thin;
  scrollbar-color: #1f1f23 transparent;
}
.terminal-output::-webkit-scrollbar { width: 6px; }
.terminal-output::-webkit-scrollbar-track { background: transparent; }
.terminal-output::-webkit-scrollbar-thumb { background: var(--color-warm-surface);
  border: 1px solid var(--color-warm-border); border-radius: 3px; }

.wave {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 16px;
}
.wave-bar {
  width: 2px;
  height: 100%;
  background: var(--color-warm-border);
  border-radius: 1px;
  animation: wave 1s ease-in-out infinite;
}
.wave-bar:nth-child(1) { animation-delay: 0s; }
.wave-bar:nth-child(2) { animation-delay: 0.15s; }
.wave-bar:nth-child(3) { animation-delay: 0.3s; }
.wave-bar:nth-child(4) { animation-delay: 0.45s; }
@keyframes wave {
  0%, 100% { transform: scaleY(0.3); background: var(--color-warm-muted); }
  50% { transform: scaleY(1); background: var(--color-coral); }
}

.animate-plus {
  animation: pulse-dot 1.2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
