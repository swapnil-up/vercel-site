<script setup>
import Navbar from '@/Components/Navbar.vue'
import Footer from '@/Components/Footer.vue'
import GharStop from './stops/GharStop.vue'
import ChiyaStop from './stops/ChiyaStop.vue'
import WritingStop from './stops/WritingStop.vue'
import GraphStop from './stops/GraphStop.vue'
import QuoteStop from './stops/QuoteStop.vue'
import ToolsStop from './stops/ToolsStop.vue'
import RooftopStop from './stops/RooftopStop.vue'
import NightStop from './stops/NightStop.vue'

defineProps({
  latestPosts: { type: Array, default: () => [] },
  now: { type: String, default: null },
  quote: { type: Object, default: null },
  graphStats: { type: Object, default: () => ({ notes: 0, connections: 0 }) },
})

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="dj-static-page">
    <Navbar />

    <div class="dj-static-banner">
      <p>You're reading the calm, no-motion version of the homepage.</p>
      <a href="/?motion=1" class="dj-static-banner__link">Take the walk →</a>
    </div>

    <main class="dj-static">
      <section id="ghar" class="dj-static__section">
        <div class="dj-static__paper">
          <GharStop />
        </div>
      </section>

      <section id="chiya" class="dj-static__section">
        <div class="dj-static__paper">
          <ChiyaStop />
        </div>
      </section>

      <section id="writing" class="dj-static__section">
        <div class="dj-static__paper">
          <WritingStop :posts="latestPosts" />
        </div>
      </section>

      <section id="graph" class="dj-static__section">
        <div class="dj-static__paper">
          <GraphStop :stats="graphStats" />
        </div>
      </section>

      <section id="tracker" class="dj-static__section">
        <div class="dj-static__paper">
          <QuoteStop :quote="quote" />
        </div>
      </section>

      <section id="tools" class="dj-static__section">
        <div class="dj-static__paper">
          <ToolsStop />
        </div>
      </section>

      <section id="rooftop" class="dj-static__section">
        <div class="dj-static__paper">
          <RooftopStop :now="now" />
        </div>
      </section>

      <section id="night" class="dj-static__section">
        <div class="dj-static__paper">
          <NightStop @restart="scrollTop" />
        </div>
      </section>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.dj-static-page {
  min-height: 100svh;
  background: var(--color-cream);
}

.dj-static-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 10px 20px;
  background: var(--color-mustard);
  color: var(--color-ink);
  font-size: 13px;
  font-weight: 500;
  text-align: center;
}

.dj-static-banner p {
  margin: 0;
}

.dj-static-banner__link {
  font-family: var(--font-display);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.dj-static {
  max-width: 860px;
  margin: 0 auto;
  padding: clamp(28px, 6vw, 72px) clamp(16px, 4vw, 32px);
  display: flex;
  flex-direction: column;
  gap: clamp(28px, 5vw, 56px);
}

.dj-static__paper {
  padding: clamp(22px, 4vw, 44px);
  background: var(--color-warm-surface);
  color: var(--color-ink);
  border: 3px solid var(--color-ink);
  border-radius: 6px;
  box-shadow: 7px 7px 0 color-mix(in srgb, var(--color-ink) 82%, transparent);
}
</style>
