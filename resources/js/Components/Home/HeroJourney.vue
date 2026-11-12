<script setup>
import { computed, ref } from 'vue'
import { chapters } from '@/Data/journey'
import { useScrollStory } from '@/Composables/useScrollStory'
import Scene from '@/Components/Journey/Scene.vue'
import StopScene from '@/Components/Journey/StopScene.vue'
import Mascot from '@/Components/Journey/Mascot.vue'
import ChapterRail from '@/Components/Home/ChapterRail.vue'
import ChapterMenu from '@/Components/Home/ChapterMenu.vue'
import GharStop from '@/Components/Journey/stops/GharStop.vue'
import WritingStop from '@/Components/Journey/stops/WritingStop.vue'
import GraphStop from '@/Components/Journey/stops/GraphStop.vue'
import ToolsStop from '@/Components/Journey/stops/ToolsStop.vue'
import NightStop from '@/Components/Journey/stops/NightStop.vue'

const props = defineProps({
  enabled: { type: Boolean, default: true },
  latestPosts: { type: Array, default: () => [] },
  now: { type: String, default: null },
  quote: { type: Object, default: null },
  graphStats: { type: Object, default: () => ({ notes: 0, connections: 0 }) },
})

const heroRef = ref(null)
const enabled = computed(() => props.enabled)

const { activeIndex, progress, goTo } = useScrollStory({
  heroRef,
  count: computed(() => chapters.length),
  enabled,
})

const visibleIndex = computed(() => (props.enabled ? activeIndex.value : 0))

const mascotPose = computed(() => {
  if (!props.enabled) return 'sit'
  if (activeIndex.value === 0) return 'idle'
  if (activeIndex.value === chapters.length - 1) return 'sit'
  return ['idle', 'sniff', 'idle'][activeIndex.value % 3]
})

const components = { ghar: GharStop, writing: WritingStop, graph: GraphStop, tools: ToolsStop, night: NightStop }
const stopComponent = (id) => components[id]
const stopProps = (id) => {
  if (id === 'writing') return { posts: props.latestPosts }
  if (id === 'graph') return { stats: props.graphStats }
  return {}
}

const heroStyle = computed(() => ({
  '--dj-p': props.enabled ? progress.value : 0,
  '--dj-v': 0,
}))

const shownChapters = computed(() => (props.enabled ? chapters : chapters.slice(0, 1)))
</script>

<template>
  <section
    ref="heroRef"
    class="hero"
    :class="{ 'is-static': !props.enabled }"
    :style="heroStyle"
  >
    <div class="hero__bg" aria-hidden="true">
      <Scene />
    </div>

    <div class="hero__landmarks" aria-hidden="true">
      <div
        v-for="(chapter, index) in chapters"
        :key="chapter.id"
        class="hero__landmark"
        :class="{ 'is-on': index === visibleIndex }"
      >
        <StopScene :stop="chapter.scene" :active="index === visibleIndex" />
      </div>
    </div>

    <Mascot :pose="mascotPose" :x="0.15" />

    <div class="hero__panels">
      <article
        v-for="(chapter, index) in shownChapters"
        :key="chapter.id"
        class="hero__panel"
        :class="{ 'is-on': index === visibleIndex }"
        :inert="index !== visibleIndex"
      >
        <div class="hero__paper">
          <span class="hero__pin" aria-hidden="true"></span>
          <component
            :is="stopComponent(chapter.id)"
            v-bind="stopProps(chapter.id)"
            @restart="goTo(0)"
          />
        </div>
      </article>
    </div>

    <ChapterMenu
      v-if="props.enabled"
      class="hero__menu"
      :chapters="chapters"
      :active="activeIndex"
      @select="goTo"
    />

    <a class="hero__skip" href="#home-content">
      Skip the walk <span aria-hidden="true">↓</span>
    </a>

    <ChapterRail
      v-if="props.enabled"
      :chapters="chapters"
      :active="activeIndex"
      :progress="progress"
      @select="goTo"
    />
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  height: 100svh;
  /* Tuck under the sticky navbar so the full scene (and rail) fits the viewport. */
  margin-top: calc(var(--site-nav-h, 68px) * -1);
  overflow: hidden;
  background: var(--dj-sky-bottom);
}

.hero__bg,
.hero__landmarks,
.hero__panels {
  position: absolute;
  inset: 0;
}

.hero__bg {
  z-index: 0;
}

.hero__landmarks {
  z-index: 2;
}

.hero__landmark {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.55s ease;
}

.hero__landmark.is-on {
  opacity: 1;
}

.hero__panels {
  z-index: 5;
  pointer-events: none;
}

.hero__panel {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: clamp(140px, 16vh, 180px) clamp(20px, 6vw, 84px) clamp(150px, 22vh, 220px);
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 0.5s ease, transform 0.5s ease;
  pointer-events: none;
}

.hero__panel.is-on {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.hero__paper {
  position: relative;
  width: min(560px, 92vw);
  max-height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: clamp(22px, 3vw, 38px);
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-cream) 96%, white) 0%, var(--color-cream) 100%);
  color: var(--color-ink);
  border: 3px solid var(--color-ink);
  border-radius: 6px;
  box-shadow: 8px 8px 0 color-mix(in srgb, var(--color-ink) 85%, transparent);
  scrollbar-width: thin;
}

.hero__pin {
  position: absolute;
  top: -13px;
  left: 50%;
  width: 46px;
  height: 22px;
  margin-left: -23px;
  background: color-mix(in srgb, var(--color-mustard) 70%, transparent);
  border: 2px solid color-mix(in srgb, var(--color-ink) 35%, transparent);
  transform: rotate(-2deg);
  opacity: 0.75;
}

/* Offset below the sticky navbar, which overlays the pinned hero. */
.hero__menu {
  position: absolute;
  top: clamp(72px, 9vh, 96px);
  right: clamp(16px, 3vw, 40px);
  z-index: 13;
}

.hero__skip {
  position: absolute;
  top: clamp(72px, 9vh, 96px);
  left: clamp(16px, 3vw, 40px);
  z-index: 13;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dj-sky-bottom) 40%, transparent);
  color: #fff8f0;
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.hero__skip:hover {
  background: var(--color-coral);
}

.hero__skip:focus-visible,
.hero__menu :deep(.cmenu__trigger:focus-visible) {
  outline: 2px solid #fff8f0;
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .hero__panel {
    justify-content: center;
    padding: 148px 14px 172px;
  }

  .hero__paper {
    width: 100%;
    max-height: min(60vh, 520px);
    box-shadow: 5px 5px 0 color-mix(in srgb, var(--color-ink) 80%, transparent);
  }

  .hero__skip span {
    display: none;
  }

}

/* Static / reduced-motion: the hero simply sits in the flow */
.hero.is-static {
  height: auto;
  min-height: 86svh;
}

.hero.is-static .hero__panels {
  position: relative;
  display: flex;
  justify-content: flex-end;
  padding: clamp(120px, 16vh, 168px) clamp(20px, 6vw, 84px) clamp(48px, 8vh, 90px);
  pointer-events: auto;
}

.hero.is-static .hero__panel {
  position: relative;
  inset: auto;
  display: block;
  padding: 0;
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.hero.is-static .hero__landmark:first-child {
  opacity: 0.7;
}

@media (max-width: 720px) {
  .hero.is-static .hero__panels {
    justify-content: center;
    padding: 120px 14px 48px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__landmark,
  .hero__panel {
    transition: none;
    animation: none;
  }
}
</style>
