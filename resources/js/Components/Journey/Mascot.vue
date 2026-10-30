<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { clamp, gaitRate as calculateGaitRate } from '@/Utils/journeyMath'
import { mascotQuips } from '@/Data/journey'

const props = defineProps({
  pose: {
    type: String,
    default: 'idle',
  },
  x: {
    type: Number,
    default: 0.18,
  },
  facing: {
    type: String,
    default: 'right',
  },
  speed: {
    type: Number,
    default: 0,
  },
})

const mascotEl = ref(null)
const quip = ref('')
const quipVisible = ref(false)
const quipIndex = ref(0)
let hideTimer = null

let gaitAnimations = []
let gaitPose = ''
let gaitFrame = 0

function sayQuip() {
  quip.value = mascotQuips[quipIndex.value % mascotQuips.length]
  quipIndex.value++
  quipVisible.value = true

  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => {
    quipVisible.value = false
  }, 3600)
}

const isMoving = computed(() => props.pose === 'trot' || props.pose === 'run')
const speedIntensity = computed(() => clamp(props.speed / 1.5, 0, 1))
const lean = computed(() => `${(speedIntensity.value * 10).toFixed(1)}deg`)

const bubbleAlign = computed(() => {
  if (props.x < 0.4) return 'left'
  if (props.x > 0.6) return 'right'
  return 'center'
})

function applyGaitRate() {
  const rate = calculateGaitRate(props.speed)

  for (const animation of gaitAnimations) {
    animation.playbackRate = rate
  }
}

function collectGaitAnimations() {
  if (!isMoving.value || !mascotEl.value) {
    gaitAnimations = []
    gaitPose = ''
    return
  }

  gaitPose = props.pose
  gaitAnimations = mascotEl.value
    .getAnimations({ subtree: true })
    .filter((animation) => /^dj-(leg-step|leg-run|body-bob|dust)(-|$)/.test(animation.animationName))

  applyGaitRate()
}

async function refreshGaitAnimations() {
  window.cancelAnimationFrame(gaitFrame)

  if (!isMoving.value) {
    gaitAnimations = []
    gaitPose = ''
    return
  }

  await nextTick()

  if (!isMoving.value) return

  collectGaitAnimations()

  if (!gaitAnimations.length) {
    gaitFrame = window.requestAnimationFrame(collectGaitAnimations)
  }
}

watch(
  () => props.pose,
  () => refreshGaitAnimations(),
)

watch(
  () => props.speed,
  () => {
    if (gaitAnimations.length && gaitPose === props.pose) applyGaitRate()
  },
)

onMounted(refreshGaitAnimations)

onBeforeUnmount(() => {
  window.clearTimeout(hideTimer)
  window.cancelAnimationFrame(gaitFrame)
  gaitAnimations = []
})
</script>

<template>
  <div
    class="dj-mascot-wrap"
    :class="[
      `is-bubble-${bubbleAlign}`,
      {
        'is-facing-left': props.facing === 'left',
        'is-moving': isMoving,
      },
    ]"
    :style="{
      '--x': props.x,
      '--dj-lean': lean,
    }"
  >
    <Transition name="dj-quip">
      <p v-if="quipVisible" class="dj-mascot__quip" role="status">
        {{ quip }}
        <span class="dj-mascot__quip-tail"></span>
      </p>
    </Transition>

    <button
      ref="mascotEl"
      type="button"
      class="dj-mascot"
      :data-pose="props.pose"
      aria-label="Blobby the street dog. Click for a quip."
      @click="sayQuip"
    >
      <span class="dj-mascot__dust dj-mascot__dust--a" aria-hidden="true"></span>
      <span class="dj-mascot__dust dj-mascot__dust--b" aria-hidden="true"></span>
      <svg viewBox="0 0 220 210" class="dj-mascot__svg">
        <defs>
          <linearGradient id="dj-dog-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e6d9ff" />
            <stop offset="58%" stop-color="#cbb5f4" />
            <stop offset="100%" stop-color="#ae92e5" />
          </linearGradient>
          <linearGradient id="dj-dog-head" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f0e7ff" />
            <stop offset="100%" stop-color="#c7b1f1" />
          </linearGradient>
        </defs>

        <ellipse cx="112" cy="193" rx="68" ry="10" class="dj-mascot__shadow" />

        <g class="dj-mascot__leg dj-mascot__leg--a">
          <rect x="60" y="146" width="16" height="38" rx="8" fill="#b79ee8" />
          <ellipse cx="68" cy="184" rx="10" ry="5.5" fill="#a98fe0" />
        </g>
        <g class="dj-mascot__leg dj-mascot__leg--b">
          <rect x="82" y="146" width="16" height="38" rx="8" fill="#b79ee8" />
          <ellipse cx="90" cy="184" rx="10" ry="5.5" fill="#a98fe0" />
        </g>

        <g class="dj-mascot__torso">
          <g class="dj-mascot__tail">
            <path
              d="M60,118 C34,116 18,96 26,76 C32,60 50,56 57,68 C63,78 55,90 44,89 C37,88 35,81 40,77"
              fill="none"
              stroke="url(#dj-dog-body)"
              stroke-width="17"
              stroke-linecap="round"
            />
            <circle cx="40" cy="77" r="8.5" fill="#e6d9ff" />
          </g>

          <ellipse cx="102" cy="126" rx="54" ry="40" fill="url(#dj-dog-body)" />
          <ellipse cx="98" cy="118" rx="34" ry="22" fill="#f5efff" opacity="0.3" />
          <ellipse cx="92" cy="150" rx="27" ry="15" fill="#efe5ff" opacity="0.32" />

          <g class="dj-mascot__head">
            <g class="dj-mascot__ear dj-mascot__ear--back">
              <path
                d="M128,68 C114,42 126,28 144,41 C157,50 154,68 148,82 C142,95 130,85 128,68 Z"
                fill="#a98fe0"
              />
              <path
                class="dj-mascot__ear-inner"
                d="M133,63 C126,48 133,39 143,47 C150,53 148,65 145,74 C141,80 135,74 133,63 Z"
                fill="#f3a7c8"
                opacity="0.72"
              />
            </g>
            <g class="dj-mascot__ear dj-mascot__ear--front">
              <path
                d="M159,63 C169,40 188,36 195,51 C200,64 190,83 175,89 C165,93 156,80 159,63 Z"
                fill="#b79ee8"
              />
              <path
                class="dj-mascot__ear-inner"
                d="M167,62 C174,48 185,46 189,55 C192,63 185,75 175,79 C169,81 165,72 167,62 Z"
                fill="#f7b6d2"
                opacity="0.78"
              />
            </g>

            <circle cx="148" cy="94" r="44" fill="url(#dj-dog-head)" />
            <path
              class="dj-mascot__tuft"
              d="M139,51 C136,42 143,37 148,44 C150,39 158,41 156,48 C162,45 167,51 161,56 C155,61 146,60 139,51 Z"
              fill="#f1e7ff"
              opacity="0.92"
            />

            <ellipse cx="181" cy="108" rx="24" ry="17" fill="#f7f0ff" />
            <ellipse cx="199" cy="102" rx="6.5" ry="5" fill="#3b2a52" />
            <ellipse cx="197" cy="100.5" rx="2" ry="1.4" fill="#ffffff" opacity="0.7" />

            <g class="dj-mascot__eye">
              <circle cx="139" cy="86" r="8.5" fill="#2c2140" />
              <circle cx="142" cy="82.5" r="3" fill="#ffffff" />
              <circle cx="136.5" cy="90" r="1.5" fill="#ffffff" />
              <circle cx="141" cy="89" r="1" fill="#f4a8c8" />
            </g>
            <g class="dj-mascot__eye">
              <circle cx="164" cy="84" r="8.5" fill="#2c2140" />
              <circle cx="167" cy="80.5" r="3" fill="#ffffff" />
              <circle cx="161.5" cy="88" r="1.5" fill="#ffffff" />
              <circle cx="166" cy="87" r="1" fill="#f4a8c8" />
            </g>

            <path d="M130,69 C134,66 139,66 142,68" class="dj-mascot__brow" />
            <path d="M157,66 C161,64 166,64 169,67" class="dj-mascot__brow" />

            <ellipse cx="123" cy="108" rx="9" ry="5" fill="#f28db5" opacity="0.48" />
            <ellipse cx="174" cy="120" rx="7" ry="4" fill="#f28db5" opacity="0.35" />

            <path
              class="dj-mascot__mouth"
              d="M197,108 C193,117 185,120 177,114"
              fill="none"
              stroke="#5a4278"
              stroke-width="2.4"
              stroke-linecap="round"
            />
            <path
              class="dj-mascot__tongue"
              d="M181,115 C178,124 187,126 190,117 Z"
              fill="#ef7b9d"
            />
          </g>

          <g class="dj-mascot__collar">
            <path d="M116,122 C128,136 150,136 162,124" fill="none" stroke="#ff5a3d" stroke-width="7" stroke-linecap="round" />
            <circle cx="139" cy="134" r="6" fill="#f4b942" />
          </g>

          <g class="dj-mascot__sleep">
            <text x="178" y="58" class="dj-mascot__zzz">z</text>
            <text x="196" y="42" class="dj-mascot__zzz dj-mascot__zzz--big">Z</text>
          </g>
        </g>

        <g class="dj-mascot__leg dj-mascot__leg--b">
          <rect x="116" y="146" width="16" height="38" rx="8" fill="#c3adf0" />
          <ellipse cx="124" cy="184" rx="10" ry="5.5" fill="#b79ee8" />
        </g>
        <g class="dj-mascot__leg dj-mascot__leg--a">
          <rect class="dj-mascot__paw" x="138" y="146" width="16" height="38" rx="8" fill="#c3adf0" />
          <ellipse cx="146" cy="184" rx="10" ry="5.5" fill="#b79ee8" />
        </g>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.dj-mascot-wrap {
  position: absolute;
  left: calc(var(--x) * 100%);
  bottom: clamp(72px, 13vh, 150px);
  z-index: 7;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
  pointer-events: none;
}

.dj-mascot-wrap.is-bubble-left .dj-mascot__quip {
  align-self: flex-start;
  margin-left: 8px;
  margin-right: 0;
}

.dj-mascot-wrap.is-bubble-right .dj-mascot__quip {
  align-self: flex-end;
  margin-left: 0;
  margin-right: 8px;
}

.dj-mascot-wrap.is-bubble-right .dj-mascot__quip-tail {
  left: auto;
  right: 22px;
}

.dj-mascot-wrap.is-bubble-center .dj-mascot__quip {
  align-self: center;
  margin-left: 0;
  margin-right: 0;
}

.dj-mascot-wrap.is-bubble-center .dj-mascot__quip-tail {
  left: 50%;
  margin-left: -6px;
}

.dj-mascot-wrap.is-facing-left {
  --dj-flip: -1;
}

.dj-mascot {
  position: relative;
  pointer-events: auto;
  width: clamp(104px, 12vw, 190px);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  filter: drop-shadow(0 14px 18px rgba(30, 16, 50, 0.28));
}

.dj-mascot__dust {
  --dust-x: -16px;
  position: absolute;
  bottom: 10px;
  left: 26%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--dj-ground) 62%, transparent);
  opacity: 0;
  pointer-events: none;
}

.dj-mascot__dust--b {
  left: 48%;
  bottom: 16px;
  width: 7px;
  height: 7px;
}

.dj-mascot-wrap.is-facing-left .dj-mascot__dust {
  --dust-x: 16px;
  left: auto;
  right: 26%;
}

.dj-mascot-wrap.is-facing-left .dj-mascot__dust--b {
  right: 48%;
}

.dj-mascot-wrap.is-moving .dj-mascot__dust {
  animation: dj-dust 0.56s ease-out infinite;
}

.dj-mascot-wrap.is-moving .dj-mascot__dust--b {
  animation-delay: -0.28s;
}

.dj-mascot[data-pose='run'] .dj-mascot__dust {
  animation-duration: 0.3s;
}

.dj-mascot[data-pose='run'] .dj-mascot__dust--b {
  animation-delay: -0.15s;
}

.dj-mascot:focus-visible {
  outline: 3px solid var(--color-coral);
  outline-offset: 6px;
  border-radius: 24px;
}

.dj-mascot__svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  transform: scaleX(var(--dj-flip, 1)) rotate(calc(var(--dj-lean, 0deg) + var(--dj-pose-lean, 0deg)));
  transform-origin: center;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.dj-mascot[data-pose='run'] .dj-mascot__svg {
  --dj-pose-lean: 4deg;
}

.dj-mascot__shadow {
  fill: rgba(20, 12, 30, 0.35);
}

.dj-mascot__torso {
  transform-box: fill-box;
  transform-origin: 50% 72%;
  animation: dj-dog-bob 2.6s ease-in-out infinite;
}

.dj-mascot__tail {
  transform-box: fill-box;
  transform-origin: 70% 90%;
  animation: dj-tail-wag 2.6s ease-in-out infinite;
}

.dj-mascot__head {
  transform-box: fill-box;
  transform-origin: 50% 70%;
  transition: transform 0.4s ease;
}

.dj-mascot__ear {
  transform-box: fill-box;
  transform-origin: 50% 90%;
}

.dj-mascot__eye {
  transform-box: fill-box;
  transform-origin: center;
  animation: dj-blink 5.8s ease-in-out infinite;
}

.dj-mascot__brow {
  fill: none;
  stroke: #a287c7;
  stroke-width: 2;
  stroke-linecap: round;
  opacity: 0.55;
}

.dj-mascot__tongue {
  transform-box: fill-box;
  transform-origin: 50% 0%;
  animation: dj-tongue 3.4s ease-in-out infinite;
}

.dj-mascot[data-pose='idle'] .dj-mascot__ear,
.dj-mascot[data-pose='sniff'] .dj-mascot__ear,
.dj-mascot[data-pose='sit'] .dj-mascot__ear {
  animation: dj-ear-twitch 5.4s ease-in-out infinite;
}

.dj-mascot[data-pose='idle'] .dj-mascot__ear--front,
.dj-mascot[data-pose='sniff'] .dj-mascot__ear--front,
.dj-mascot[data-pose='sit'] .dj-mascot__ear--front {
  animation-delay: 0.18s;
}

.dj-mascot__leg {
  transform-box: fill-box;
  transform-origin: 50% 8%;
}

.dj-mascot__zzz {
  fill: #f4e9ff;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  opacity: 0;
  animation: dj-zzz 2.4s ease-in-out infinite;
}

.dj-mascot__zzz--big {
  font-size: 22px;
  animation-delay: 0.6s;
}

.dj-mascot__sleep {
  opacity: 0;
}

/* walk */
.dj-mascot[data-pose='trot'] .dj-mascot__leg--a,
.dj-mascot[data-pose='run'] .dj-mascot__leg--a {
  animation: dj-leg-step 0.56s ease-in-out infinite;
}

.dj-mascot[data-pose='trot'] .dj-mascot__leg--b,
.dj-mascot[data-pose='run'] .dj-mascot__leg--b {
  animation: dj-leg-step 0.56s ease-in-out -0.28s infinite;
}

.dj-mascot[data-pose='trot'] .dj-mascot__torso,
.dj-mascot[data-pose='run'] .dj-mascot__torso {
  animation: dj-body-bob 0.28s ease-in-out infinite alternate;
}

.dj-mascot[data-pose='trot'] .dj-mascot__tail {
  animation-duration: 0.9s;
}

.dj-mascot[data-pose='trot'] .dj-mascot__ear,
.dj-mascot[data-pose='run'] .dj-mascot__ear {
  animation: dj-ear-flap 0.28s ease-in-out infinite alternate;
}

/* run */
.dj-mascot[data-pose='run'] .dj-mascot__leg--a {
  animation: dj-leg-run 0.3s ease-in-out infinite;
}

.dj-mascot[data-pose='run'] .dj-mascot__leg--b {
  animation: dj-leg-run 0.3s ease-in-out -0.15s infinite;
}

.dj-mascot[data-pose='run'] .dj-mascot__torso {
  animation-duration: 0.15s;
}

.dj-mascot[data-pose='run'] .dj-mascot__tail {
  animation-duration: 0.3s;
}

.dj-mascot[data-pose='run'] .dj-mascot__ear {
  animation-duration: 0.15s;
  transform: rotate(-14deg);
}

/* sniff */
.dj-mascot[data-pose='sniff'] .dj-mascot__head {
  transform: translateY(10px) rotate(8deg);
}
.dj-mascot[data-pose='sniff'] .dj-mascot__tail {
  animation-duration: 1.6s;
}

/* sit */
.dj-mascot[data-pose='sit'] {
  transform: translateY(10px) scaleY(0.94);
}
.dj-mascot[data-pose='sit'] .dj-mascot__torso {
  animation: dj-dog-breathe 3.4s ease-in-out infinite;
}
.dj-mascot[data-pose='sit'] .dj-mascot__leg--bf,
.dj-mascot[data-pose='sit'] .dj-mascot__leg--bn {
  opacity: 0.35;
}

/* sleep */
.dj-mascot[data-pose='sleep'] .dj-mascot__torso {
  animation: dj-dog-breathe 3.4s ease-in-out infinite;
}
.dj-mascot[data-pose='sleep'] .dj-mascot__eye {
  opacity: 0;
}
.dj-mascot[data-pose='sleep'] .dj-mascot__sleep {
  opacity: 1;
}
.dj-mascot[data-pose='sleep'] .dj-mascot__tail {
  animation-duration: 3.5s;
}

.dj-mascot__quip {
  position: relative;
  margin: 0 0 10px 8px;
  max-width: 220px;
  padding: 10px 14px;
  background: var(--color-cream);
  color: var(--color-ink);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  box-shadow: 3px 3px 0 var(--color-ink);
}

.dj-mascot__quip-tail {
  position: absolute;
  left: 22px;
  bottom: -8px;
  width: 12px;
  height: 12px;
  background: var(--color-cream);
  border-right: 2px solid var(--color-ink);
  border-bottom: 2px solid var(--color-ink);
  transform: rotate(45deg);
}

.dj-quip-enter-active,
.dj-quip-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.dj-quip-enter-from,
.dj-quip-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@keyframes dj-blink {
  0%,
  92%,
  100% {
    transform: scaleY(1);
  }
  94%,
  97% {
    transform: scaleY(0.08);
  }
}

@keyframes dj-ear-twitch {
  0%,
  86%,
  100% {
    transform: rotate(0deg);
  }
  89% {
    transform: rotate(-5deg);
  }
  92% {
    transform: rotate(2deg);
  }
  95% {
    transform: rotate(0deg);
  }
}

@keyframes dj-tongue {
  0%,
  100% {
    transform: translateY(0) scaleY(1);
  }
  50% {
    transform: translateY(1.5px) scaleY(1.08);
  }
}

@keyframes dj-dog-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes dj-body-bob {
  from {
    transform: translateY(0) rotate(0deg);
  }
  to {
    transform: translateY(-4px) rotate(-0.6deg);
  }
}

@keyframes dj-dog-breathe {
  0%,
  100% {
    transform: scaleY(0.97);
  }
  50% {
    transform: scaleY(1.02);
  }
}

@keyframes dj-tail-wag {
  0%,
  100% {
    transform: rotate(-6deg);
  }
  50% {
    transform: rotate(10deg);
  }
}

@keyframes dj-leg-step {
  0%,
  100% {
    transform: rotate(22deg);
  }
  50% {
    transform: rotate(-22deg);
  }
}

@keyframes dj-leg-run {
  0%,
  100% {
    transform: rotate(28deg);
  }
  50% {
    transform: rotate(-28deg);
  }
}

@keyframes dj-ear-flap {
  from {
    transform: rotate(-2deg);
  }
  to {
    transform: rotate(9deg);
  }
}

@keyframes dj-dust {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.5);
  }
  30% {
    opacity: 0.55;
  }
  100% {
    opacity: 0;
    transform: translate(var(--dust-x), -12px) scale(1.35);
  }
}

@keyframes dj-zzz {
  0% {
    opacity: 0;
    transform: translateY(0);
  }
  40% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translate(-6px, -18px);
  }
}

@media (max-width: 720px) {
  .dj-mascot-wrap {
    bottom: 88px;
  }

  .dj-mascot {
    width: 84px;
  }

  .dj-mascot__quip {
    max-width: 160px;
    font-size: 11px;
    padding: 8px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dj-mascot__torso,
  .dj-mascot__tail,
  .dj-mascot__leg,
  .dj-mascot__ear,
  .dj-mascot__eye,
  .dj-mascot__tongue,
  .dj-mascot__zzz,
  .dj-mascot__dust {
    animation: none !important;
  }
}
</style>
