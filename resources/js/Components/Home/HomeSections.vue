<script setup>
import { Link } from '@inertiajs/vue3'
import { featuredTools } from '@/Data/journey'

defineProps({
  latestPosts: { type: Array, default: () => [] },
  now: { type: String, default: null },
  quote: { type: Object, default: null },
  graphStats: { type: Object, default: () => ({ notes: 0, connections: 0 }) },
})
</script>

<template>
  <div id="home-content" class="home">
    <div class="home__inner">
      <section class="home__block">
        <header class="home__head">
          <div>
            <p class="dj-kicker">Pustak pasal · the bookstall</p>
            <h2 class="home__title">Latest writing</h2>
          </div>
          <Link href="/posts" class="home__more">All writing →</Link>
        </header>

        <ul v-if="latestPosts.length" class="dj-post-list">
          <li v-for="post in latestPosts" :key="post.slug" class="dj-post">
            <Link :href="`/posts/${post.slug}`" class="dj-post__link">
              <span class="dj-post__date">{{ post.published_date }}</span>
              <span class="dj-post__title">{{ post.title }}</span>
              <span v-if="post.description" class="dj-post__desc">{{ post.description }}</span>
            </Link>
          </li>
        </ul>
        <p v-else class="dj-body">The bookstall is being restocked. Check back soon.</p>
      </section>

      <section class="home__block">
        <header class="home__head">
          <div>
            <p class="dj-kicker">Bazaar · the gadget stalls</p>
            <h2 class="home__title">Things that whirr and blink</h2>
          </div>
          <Link href="/tools" class="home__more">All tools →</Link>
        </header>

        <ul class="dj-tool-list">
          <li v-for="tool in featuredTools" :key="tool.href">
            <Link :href="tool.href" class="dj-tool" :data-accent="tool.accent">
              <span class="dj-tool__title">{{ tool.title }}</span>
              <span class="dj-tool__blurb">{{ tool.blurb }}</span>
              <span class="dj-tool__go" aria-hidden="true">↗</span>
            </Link>
          </li>
        </ul>
      </section>

      <div class="home__grid">
        <section class="home__block">
          <header class="home__head">
            <div>
              <p class="dj-kicker">Bari · the garden of maps</p>
              <h2 class="home__title">The knowledge graph</h2>
            </div>
          </header>
          <p class="dj-body">
            Every note is planted somewhere; every link is a path between them. The
            graph is the back of this garden.
          </p>
          <dl class="dj-stats">
            <div class="dj-stat">
              <dt>Notes</dt>
              <dd>{{ graphStats.notes }}</dd>
            </div>
            <div class="dj-stat">
              <dt>Connections</dt>
              <dd>{{ graphStats.connections }}</dd>
            </div>
          </dl>
          <div class="dj-actions">
            <Link href="/graph" class="dj-cta">Enter the garden <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section class="home__block home__block--quote">
          <header class="home__head">
            <div>
              <p class="dj-kicker">Gumba · the prayer-flag courtyard</p>
              <h2 class="home__title">From the wall</h2>
            </div>
          </header>
          <blockquote v-if="quote" class="dj-chalkboard">
            <p>“{{ quote.quote }}”</p>
            <cite v-if="quote.author">— {{ quote.author }}</cite>
          </blockquote>
          <p v-else class="dj-body">The wall is quiet today.</p>
        </section>
      </div>

      <section class="home__block">
        <header class="home__head">
          <div>
            <p class="dj-kicker">Swayambhu · the overlook</p>
            <h2 class="home__title">Now</h2>
          </div>
          <Link href="/now" class="home__more">More →</Link>
        </header>
        <p v-if="now" class="dj-body">{{ now }}</p>
        <p v-else class="dj-body">Nothing posted here yet — but the kettle's still warm.</p>
        <div class="dj-actions">
          <Link href="/about" class="dj-cta">Say hello <span aria-hidden="true">→</span></Link>
          <Link href="/books" class="dj-link">Books</Link>
          <Link href="/feed" class="dj-link">RSS</Link>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home {
  background: var(--color-cream);
}

.home__inner {
  max-width: 900px;
  margin: 0 auto;
  padding: clamp(40px, 7vw, 88px) clamp(18px, 4vw, 32px) clamp(48px, 8vw, 96px);
  display: flex;
  flex-direction: column;
  gap: clamp(34px, 5vw, 60px);
}

.home__block {
  min-width: 0;
}

.home__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 3px solid var(--color-ink);
}

.home__title {
  margin: 2px 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 3.4vw, 2.1rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--color-ink);
}

.home__more {
  flex: 0 0 auto;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-coral);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.home__more:hover {
  color: var(--color-ink);
  border-color: var(--color-ink);
}

.home__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(22px, 4vw, 40px);
}

@media (max-width: 720px) {
  .home__grid {
    grid-template-columns: 1fr;
  }

  .home__head {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
