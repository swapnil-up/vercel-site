<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import JourneyLayout from '@/Layouts/JourneyLayout.vue'
import { stops } from '@/Data/journey'
import { useJourney } from '@/Composables/useJourney'
import { journeyLayout, panelFocus } from '@/Utils/journeyMath'
import Scene from '@/Components/Journey/Scene.vue'
import Hud from '@/Components/Journey/Hud.vue'
import Mascot from '@/Components/Journey/Mascot.vue'
import StopPanel from '@/Components/Journey/StopPanel.vue'
import StopScene from '@/Components/Journey/StopScene.vue'
import StaticHome from '@/Components/Journey/StaticHome.vue'
import GharStop from '@/Components/Journey/stops/GharStop.vue'
import ChiyaStop from '@/Components/Journey/stops/ChiyaStop.vue'
import WritingStop from '@/Components/Journey/stops/WritingStop.vue'
import GraphStop from '@/Components/Journey/stops/GraphStop.vue'
import QuoteStop from '@/Components/Journey/stops/QuoteStop.vue'
import ToolsStop from '@/Components/Journey/stops/ToolsStop.vue'
import RooftopStop from '@/Components/Journey/stops/RooftopStop.vue'
import NightStop from '@/Components/Journey/stops/NightStop.vue'

defineOptions({ layout: JourneyLayout })

const props = defineProps({
  latestPosts: { type: Array, default: () => [] },
  now: { type: String, default: null },
  quote: { type: Object, default: null },
  graphStats: { type: Object, default: () => ({ notes: 0, connections: 0 }) },
})

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const forceMotion = params?.get('motion') === '1'
const isStatic = ref(params?.get('static') === '1' || (prefersReducedMotion && !forceMotion))

const rootRef = ref(null)
const compact = ref(false)
let compactQuery = null
const onCompactChange = (event) => {
  compact.value = event.matches
}
const enabled = computed(() => !isStatic.value)

const layout = computed(() => journeyLayout(stops))
const journeyHeight = computed(() => `${Math.round(layout.value.worldWidth * 100)}svh`)

const {
  progress,
  camera,
  velocity,
  speed,
  moving,
  running,
  facing,
  position,
  activeIndex,
  goTo,
  next,
  prev,
} = useJourney({
  rootRef,
  layout,
  enabled,
})

const panels = [
  { align: 'right', rotation: -1.2 },
  { align: 'right', rotation: 1.1 },
  { align: 'right', rotation: 0.8 },
  { align: 'right', rotation: -0.9 },
  { align: 'right', rotation: 1.3 },
  { align: 'right', rotation: -1.1 },
  { align: 'right', rotation: 0.7 },
  { align: 'right', rotation: -0.6 },
]

const mascotX = computed(() => (compact.value ? 0.2 : 0.18))

const panelFocuses = computed(() => stops.map((_, index) => panelFocus(position.value, index)))

const mascotPose = computed(() => {
  if (moving.value) return running.value ? 'run' : 'trot'
  if (activeIndex.value === stops.length - 1) return 'sit'
  return ['idle', 'sniff', 'idle', 'sit'][activeIndex.value % 4]
})

const showScrollCue = computed(() => activeIndex.value === 0 && progress.value < 0.015)

function restart() {
  goTo(0)
}

onMounted(async () => {
  compactQuery = window.matchMedia('(max-width: 720px)')
  compact.value = compactQuery.matches
  compactQuery.addEventListener('change', onCompactChange)

  if (isStatic.value) return

  const target = params?.get('at') || window.location.hash.replace('#', '')
  if (!target) return

  const index = stops.findIndex((stop) => stop.id === target)
  if (index < 0) return

  await nextTick()
  requestAnimationFrame(() => goTo(index, { smooth: false }))
})

onBeforeUnmount(() => {
  compactQuery?.removeEventListener('change', onCompactChange)
})
</script>

<template>
  <StaticHome
    v-if="isStatic"
    :latest-posts="props.latestPosts"
    :now="props.now"
    :quote="props.quote"
    :graph-stats="props.graphStats"
  />

  <div
    v-else
    ref="rootRef"
    class="dj-root"
    :style="{
      height: journeyHeight,
      '--dj-stops': stops.length,
      '--dj-world': layout.worldWidth,
      '--dj-camera': camera,
      '--dj-p': progress,
      '--dj-v': velocity,
      '--dj-content-lane': '27vw',
    }"
  >
    <div class="dj-stage">
      <Scene />

      <div class="dj-world" :style="{ width: `${layout.worldWidth * 100}vw` }">
        <div
          v-for="(stop, index) in stops"
          :key="stop.id"
          class="dj-world__stop"
          :style="{
            left: `${layout.items[index].x0 * 100}vw`,
            width: `${layout.items[index].span * 100}vw`,
          }"
        >
          <div class="dj-world__frame">
            <StopScene :stop="stop.id" :active="index === activeIndex" />
            <StopPanel
              :stop="stop"
              :focus="panelFocuses[index]"
              :align="panels[index].align"
              :rotation="panels[index].rotation"
              :compact="compact"
            >
              <GharStop v-if="stop.id === 'ghar'" />
              <ChiyaStop v-else-if="stop.id === 'chiya'" />
              <WritingStop v-else-if="stop.id === 'writing'" :posts="props.latestPosts" />
              <GraphStop v-else-if="stop.id === 'graph'" :stats="props.graphStats" />
              <QuoteStop v-else-if="stop.id === 'tracker'" :quote="props.quote" />
              <ToolsStop v-else-if="stop.id === 'tools'" />
              <RooftopStop v-else-if="stop.id === 'rooftop'" :now="props.now" />
              <NightStop v-else-if="stop.id === 'night'" @restart="restart" />
            </StopPanel>
          </div>
        </div>
      </div>

      <Mascot
        :pose="mascotPose"
        :x="mascotX"
        :facing="facing"
        :speed="speed"
      />

      <button
        v-if="showScrollCue"
        type="button"
        class="dj-scroll-cue"
        @click="next"
      >
        <span class="dj-scroll-cue__mouse" aria-hidden="true">
          <span class="dj-scroll-cue__wheel"></span>
        </span>
        <span class="dj-scroll-cue__copy">
          <strong>Scroll to walk</strong>
          <span>or tap here to follow Blobby</span>
        </span>
        <span class="dj-scroll-cue__arrow" aria-hidden="true">↓</span>
      </button>

      <Hud
        :stops="stops"
        :active="activeIndex"
        :position="position"
        @select="(index) => goTo(index)"
        @prev="prev"
        @next="next"
      />
    </div>
  </div>
</template>

<style scoped>
.dj-root {
  position: relative;
  background: var(--dj-sky-bottom);
}

.dj-stage {
  position: sticky;
  top: 0;
  height: 100svh;
  overflow: hidden;
}

.dj-world {
  position: absolute;
  inset-block: 0;
  left: 0;
  transform: translate3d(calc(var(--dj-camera) * -100vw), 0, 0);
  will-change: transform;
}

.dj-world__stop {
  position: absolute;
  inset-block: 0;
}

.dj-world__frame {
  position: absolute;
  inset-block: 0;
  left: 50%;
  width: min(100vw, 100%);
  transform: translateX(-50%);
}

.dj-scroll-cue {
  position: absolute;
  left: 50%;
  bottom: clamp(132px, 19vh, 190px);
  translate: -50% 0;
  z-index: 9;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 10px 12px;
  border: 2px solid var(--dj-hud-pill-fg);
  border-radius: 14px;
  background: var(--dj-hud-pill-bg);
  color: var(--dj-hud-pill-fg);
  box-shadow: 4px 4px 0 var(--dj-hud-pill-fg);
  font-family: var(--font-body);
  text-align: left;
  cursor: pointer;
  pointer-events: auto;
  animation: dj-cue-float 2.8s ease-in-out infinite;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.dj-scroll-cue:hover {
  background: var(--color-coral);
  border-color: var(--color-coral);
  color: #fff8f0;
}

.dj-scroll-cue__mouse {
  position: relative;
  display: block;
  width: 18px;
  height: 28px;
  flex: 0 0 auto;
  border: 2px solid currentColor;
  border-radius: 10px;
}

.dj-scroll-cue__wheel {
  position: absolute;
  top: 5px;
  left: 50%;
  width: 3px;
  height: 7px;
  margin-left: -1.5px;
  border-radius: 2px;
  background: var(--color-coral);
  animation: dj-cue-wheel 1.8s ease-in-out infinite;
}

.dj-scroll-cue:hover .dj-scroll-cue__wheel {
  background: #fff8f0;
}

.dj-scroll-cue__copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.dj-scroll-cue__copy strong {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1.1;
}

.dj-scroll-cue__copy span {
  font-size: 10px;
  line-height: 1.2;
  color: color-mix(in srgb, currentColor 62%, transparent);
}

.dj-scroll-cue__arrow {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--color-coral);
  color: #fff8f0;
  font-size: 14px;
  line-height: 1;
  animation: dj-cue-nudge 1.8s ease-in-out infinite;
}

@keyframes dj-cue-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes dj-cue-wheel {
  0%,
  100% {
    transform: translateY(0);
    opacity: 1;
  }
  55% {
    transform: translateY(8px);
    opacity: 0.25;
  }
}

@keyframes dj-cue-nudge {
  0%,
  100% {
    transform: translateY(-1px);
  }
  50% {
    transform: translateY(3px);
  }
}

@media (max-width: 720px) {
  .dj-scroll-cue {
    left: 14px;
    bottom: 148px;
    translate: 0 0;
    gap: 9px;
    padding: 9px 12px 9px 10px;
    max-width: 214px;
  }

  .dj-scroll-cue__copy span {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dj-scroll-cue,
  .dj-scroll-cue__wheel,
  .dj-scroll-cue__arrow {
    animation: none;
  }
}
</style>
