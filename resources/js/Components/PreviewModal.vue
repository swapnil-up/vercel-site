<script setup>
defineProps({
  html: { type: String, default: '' },
})
const emit = defineEmits(['close', 'print'])
</script>

<template>
  <div class="fixed inset-0 bg-ink/70 z-50 flex items-center justify-center p-2 sm:p-4">
    <div class="bg-white rounded-sm w-full max-w-4xl max-h-[98dvh] sm:max-h-[90vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-warm-border bg-cream rounded-sm rounded-b-none">
        <h3 class="font-display text-sm sm:text-lg font-bold text-ink truncate">Document Preview</h3>
        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button @click="emit('print')" class="px-3 sm:px-4 py-2 sm:py-1.5 bg-coral text-white text-xs sm:text-sm rounded-sm hover:bg-coral/80 transition-colors flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            <span class="hidden xs:inline">Print /</span> PDF
          </button>
          <button @click="emit('close')" class="p-2 min-h-[36px] text-warm-muted hover:text-ink hover:bg-warm-border/50 rounded-sm transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div class="flex-1 overflow-auto bg-white">
        <iframe :srcdoc="html" class="w-full h-full min-h-[50vh] sm:min-h-[70vh]" style="border: none;"></iframe>
      </div>
      <div class="flex justify-end px-3 sm:px-4 py-2 border-t border-warm-border bg-cream rounded-sm rounded-t-none">
        <button @click="emit('close')" class="px-4 py-2 min-h-[44px] border border-warm-border text-ink text-sm rounded-sm hover:bg-white transition-colors">Close Preview</button>
      </div>
    </div>
  </div>
</template>
