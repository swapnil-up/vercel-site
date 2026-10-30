<script setup>
import { Link } from '@inertiajs/vue3'

defineProps({
  stats: {
    type: Object,
    default: () => ({ notes: 0, connections: 0 }),
  },
})
</script>

<template>
  <div class="dj-stop">
    <p class="dj-kicker">Bari · the garden of maps</p>
    <h2 class="dj-h2">A garden of notes</h2>
    <p class="dj-lede">Every note is planted somewhere; every link is a path between them.</p>
    <p class="dj-body">
      The knowledge graph is the back of this garden. Notes, maps of content and
      the connections between them, all growing in the same soil.
    </p>

    <dl class="dj-stats">
      <div class="dj-stat">
        <dt>Notes</dt>
        <dd>{{ stats.notes }}</dd>
      </div>
      <div class="dj-stat">
        <dt>Connections</dt>
        <dd>{{ stats.connections }}</dd>
      </div>
    </dl>

    <div class="dj-actions">
      <Link href="/graph" class="dj-cta">Enter the garden <span aria-hidden="true">→</span></Link>
    </div>
  </div>
</template>
