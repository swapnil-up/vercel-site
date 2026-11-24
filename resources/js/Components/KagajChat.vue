<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

interface Citation {
  doc_id: string;
  dataset: string;
  type: string;
  title?: string;
  date?: string;
  url?: string;
  excerpt: string;
  score: number;
  verification?: string;
  source_url?: string;
  build_commit?: string;
  dataset_title?: string;
  dataset_description?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

const props = defineProps<{
  datasetId?: string;
  datasetTitle?: string;
}>();

const messages = ref<Message[]>([]);
const input = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);
const datasetFilter = ref<string[]>(props.datasetId ? [props.datasetId] : []);
const availableDatasets = ref<string[]>([]);
const messagesEndRef = ref<HTMLDivElement | null>(null);
const showCitations = ref(false);

const KAGAJ_API = 'https://kagaj.swapnilupadhyay.com.np/api';

async function fetchDatasets() {
  try {
    const resp = await fetch(`${KAGAJ_API}/datasets`);
    const data = await resp.json();
    availableDatasets.value = data.datasets?.map((d: any) => d.id) || [];
  } catch (e) {
    console.warn('Failed to fetch datasets', e);
  }
}

function scrollToBottom() {
  nextTick(() => {
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' });
  });
}

async function sendMessage() {
  const question = input.value.trim();
  if (!question || isLoading.value) return;
  
  error.value = null;
  const userMessage: Message = { role: 'user', content: question };
  messages.value.push(userMessage);
  input.value = '';
  isLoading.value = true;
  
  const assistantMessage: Message = { role: 'assistant', content: '', isStreaming: true };
  messages.value.push(assistantMessage);
  scrollToBottom();
  
  try {
    const resp = await fetch(`${KAGAJ_API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        history: messages.value.slice(0, -2).map(m => ({ role: m.role, content: m.content })),
        dataset_filter: datasetFilter.value.length ? datasetFilter.value : undefined,
        stream: true,
      }),
    });
    
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || `HTTP ${resp.status}`);
    }
    
    const reader = resp.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let citations: Citation[] = [];
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'delta' && data.content) {
                assistantMessage.content += data.content;
                scrollToBottom();
              } else if (data.type === 'citations' && data.citations) {
                citations = data.citations;
                assistantMessage.citations = citations;
              } else if (data.type === 'done') {
                assistantMessage.isStreaming = false;
              }
            } catch (e) {
              console.warn('Failed to parse SSE:', line);
            }
          }
        }
      }
    }
    
    if (citations.length > 0) {
      assistantMessage.citations = citations;
    }
    assistantMessage.isStreaming = false;
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to send message';
    assistantMessage.content = 'Sorry, something went wrong. Please try again.';
    assistantMessage.isStreaming = false;
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
}

function formatDate(iso?: string): string {
  if (!iso) return 'n.d.';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function toggleCitations() {
  showCitations.value = !showCitations.value;
}

function copyCitation(citation: Citation) {
  const parts = [];
  if (citation.dataset_title) parts.push(citation.dataset_title);
  if (citation.build_commit) parts.push(`build ${citation.build_commit.slice(0, 8)}`);
  parts.push(`accessed ${new Date().toLocaleDateString()}`);
  const text = `Kagaj, "${citation.dataset_title || citation.dataset}", ${parts.join(', ')}`;
  navigator.clipboard.writeText(text);
}

onMounted(() => {
  fetchDatasets();
  if (messages.value.length === 0 && props.datasetId) {
    // Add a welcome message for dataset-scoped chat
    messages.value.push({
      role: 'assistant',
      content: `Ask me about **${props.datasetTitle || props.datasetId}**. I can answer questions using only this dataset's documents.`,
    });
  }
});
</script>

<template>
  <div class="h-[600px] flex flex-col" ref="messagesEndRef">
    <!-- Messages -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4" ref="messagesEndRef">
      <template v-for="(msg, idx) in messages" :key="idx">
        <div :class="['flex gap-3', msg.role === 'user' ? 'justify-end' : '']">
          <div 
            :class="[
              'max-w-[80%] rounded-2xl px-4 py-2',
              msg.role === 'user' 
                ? 'bg-coral-600 text-white rounded-br-md' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md'
            ]"
          >
            <div v-if="msg.isStreaming" class="flex items-center gap-2 text-sm opacity-70">
              <span class="animate-pulse">▌</span>
              <span>{{ msg.content }}</span>
            </div>
            <div v-else class="prose prose-sm dark:prose-invert max-w-none">{{ msg.content }}</div>
            
            <!-- Citations -->
            <div v-if="msg.citations && msg.citations.length" class="mt-3">
              <button 
                @click="toggleCitations"
                class="text-xs font-medium text-coral-600 dark:text-coral-400 hover:underline flex items-center gap-1"
              >
                <svg :class="showCitations ? 'rotate-180' : ''" class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
                {{ showCitations ? 'Hide' : 'Show' }} {{ msg.citations.length }} source{{ msg.citations.length > 1 ? 's' : '' }}
              </button>
              
              <div v-show="showCitations" class="mt-2 space-y-2 max-h-60 overflow-y-auto">
                <div 
                  v-for="(c, ci) in msg.citations" 
                  :key="ci"
                  class="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-slate-900 dark:text-white">
                        [{{ ci + 1 }}] {{ c.dataset_title || c.dataset }} / {{ c.type }}
                        <span v-if="c.title" class="ml-2 text-slate-500 dark:text-slate-400">— {{ c.title }}</span>
                      </p>
                      <p class="text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{{ c.excerpt }}</p>
                      <div class="flex flex-wrap gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <span v-if="c.verification">Verified: {{ c.verification.slice(0, 80) }}…</span>
                        <span v-if="c.build_commit">Build: {{ c.build_commit.slice(0, 8) }}</span>
                        <span v-if="c.score !== undefined">Score: {{ c.score.toFixed(3) }}</span>
                      </div>
                    </div>
                    <button 
                      @click="copyCitation(c)"
                      class="text-slate-400 hover:text-coral-600 dark:hover:text-coral-400 p-1"
                      title="Copy citation"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <div v-if="c.url || c.source_url" class="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                    <a 
                      v-if="c.url"
                      :href="c.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-xs text-coral-600 hover:underline"
                    >
                      Document
                    </a>
                    <a 
                      v-if="c.source_url"
                      :href="c.source_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-xs text-coral-600 hover:underline"
                    >
                      Dataset Source
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <div v-if="error" class="text-center text-red-600 dark:text-red-400 py-4">
        {{ error }}
      </div>
      
      <div ref="messagesEndRef" />
    </div>
    
    <!-- Input -->
    <div class="border-t border-slate-200 dark:border-slate-700 p-4">
      <div class="flex items-center gap-2">
        <select 
          v-model="datasetFilter"
          multiple
          class="flex-1 max-w-xs px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-coral-500 focus:border-transparent"
        >
          <option value="">All datasets</option>
          <option v-for="d in availableDatasets" :key="d" :value="d">{{ d }}</option>
        </select>
        
        <input
          v-model="input"
          @keyup.enter="sendMessage"
          placeholder="Ask a question…"
          class="flex-1 px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-coral-500 focus:border-transparent"
          :disabled="isLoading"
        />
        
        <button
          @click="sendMessage"
          :disabled="isLoading || !input.trim()"
          class="px-4 py-2 bg-coral-600 text-white rounded-lg hover:bg-coral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg v-if="isLoading" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>