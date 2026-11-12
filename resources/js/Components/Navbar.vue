<script setup>
import { Link, usePage } from '@inertiajs/vue3';
import { computed, ref } from 'vue';
import { useDarkMode } from '@/Composables/useDarkMode';
import { useAmbience } from '@/Composables/useAmbience';

const isOpen = ref(false);
const { isDark, toggle } = useDarkMode();
const { enabled: soundOn, supported: soundSupported, toggle: toggleSound } = useAmbience();

const page = usePage();
const currentPath = computed(() => {
  const path = (page.url || '/').split('?')[0].replace(/\/+$/, '');
  return path || '/';
});
const isActive = (href) =>
  href === '/'
    ? currentPath.value === '/'
    : currentPath.value === href || currentPath.value.startsWith(`${href}/`);

const links = [
  { href: '/', label: 'Home' },
  { href: '/posts', label: 'Writing' },
  { href: '/books', label: 'Books' },
  { href: '/graph', label: 'Graph' },
  { href: '/tools', label: 'Tools' },
  { href: '/now', label: 'Now' },
  { href: '/about', label: 'About' },
];
</script>

<template>
  <header class="border-b-4 border-ink bg-cream sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
      <Link href="/" class="font-display text-2xl font-bold text-ink hover:text-coral-ink transition-colors tracking-tight">
        Swap's musings
      </Link>

      <nav class="hidden md:flex items-center gap-1" aria-label="Primary">
        <Link
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          :aria-current="isActive(link.href) ? 'page' : undefined"
          class="px-3 py-2 text-sm font-medium transition-colors rounded-sm"
          :class="isActive(link.href)
            ? 'bg-ink text-cream'
            : 'text-ink hover:bg-coral hover:text-ink'"
        >
          {{ link.label }}
        </Link>
      </nav>

      <div class="flex items-center gap-1">
        <button
          v-if="soundSupported"
          @click="toggleSound"
          class="p-2 text-ink hover:bg-coral hover:text-ink transition-colors rounded-sm"
          :class="{ 'bg-coral text-ink': soundOn }"
          :aria-label="soundOn ? 'Turn off ambience' : 'Turn on ambience'"
          :aria-pressed="soundOn"
          :title="soundOn ? 'Ambience off' : 'Ambience on'"
        >
          <svg v-if="soundOn" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="m16 9 5 6M21 9l-5 6" />
          </svg>
        </button>

        <button
          @click="toggle"
          class="p-2 text-ink hover:bg-coral hover:text-ink transition-colors rounded-sm"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="isDark ? 'Light mode' : 'Dark mode'"
        >
          <svg v-if="isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>

        <button
          @click="isOpen = !isOpen"
          class="md:hidden p-2 text-ink hover:bg-coral hover:text-ink transition-colors rounded-sm"
          aria-label="Toggle menu"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!isOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="isOpen" class="md:hidden border-t-2 border-warm-border">
      <div class="px-6 py-4 space-y-2">
        <Link
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          @click="isOpen = false"
          :aria-current="isActive(link.href) ? 'page' : undefined"
          class="block px-3 py-2 text-sm font-medium transition-colors rounded-sm"
          :class="isActive(link.href)
            ? 'bg-ink text-cream'
            : 'text-ink hover:bg-coral hover:text-ink'"
        >
          {{ link.label }}
        </Link>
        <button
          @click="toggle"
          class="w-full px-3 py-2 text-sm font-medium text-ink hover:bg-coral hover:text-ink transition-colors rounded-sm text-left"
        >
          {{ isDark ? '☀ Light mode' : '☾ Dark mode' }}
        </button>
      </div>
    </div>
  </header>
</template>
