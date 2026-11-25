<script setup>
import { ref, computed } from 'vue';

const clubs = ref([
  { name: 'Club A', participants: '' },
  { name: 'Club B', participants: '' },
  { name: 'Club C', participants: '' },
]);

const teams = ref(null);
const error = ref('');
const copied = ref(false);
const mode = ref('equal'); // 'equal' | 'all'

const teamNames = ['Himalaya', 'Indus', 'Siam'];
const teamPrefixes = { Himalaya: 'H', Indus: 'I', Siam: 'S' };
const teamColors = {
  Himalaya: 'from-blue-500 to-blue-700',
  Indus: 'from-amber-500 to-amber-700',
  Siam: 'from-emerald-500 to-emerald-700',
};

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseParticipants(text) {
  return text
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function validate() {
  error.value = '';
  
  const parsed = clubs.value.map(c => ({
    name: c.name.trim() || `Club ${clubs.value.indexOf(c) + 1}`,
    participants: parseParticipants(c.participants),
  }));
  
  if (parsed.some(c => c.participants.length === 0)) {
    error.value = 'Each club must have at least one participant';
    return null;
  }
  
  if (parsed.length < 3) {
    error.value = 'Need at least 3 clubs';
    return null;
  }
  
  return parsed;
}

function computeTeamPlan(parsed) {
  // Strategy: use the minimum count across clubs as the base per club per team
  // This ensures equal representation. Excess participants from larger clubs are not assigned.
  const perClubCounts = parsed.map(c => c.participants.length);
  const minPerClub = Math.min(...perClubCounts);
  const clubsUsed = parsed.filter(c => c.participants.length >= minPerClub);
  
  if (clubsUsed.length < 3) {
    error.value = 'At least 3 clubs must have participants';
    return null;
  }
  
  // How many teams? Use minPerClub (each team gets 1 from each club per round)
  // Total teams = minPerClub (since we assign round-robin)
  const teamsCount = minPerClub;
  
  return {
    clubsUsed,
    teamsCount,
    perClubPerTeam: 1, // each team gets 1 from each club per "slot"
    totalPerTeam: clubsUsed.length,
  };
}

function generateTeams() {
  const parsed = validate();
  if (!parsed) {
    teams.value = null;
    return;
  }
  
  if (mode.value === 'equal') {
    const plan = computeTeamPlan(parsed);
    if (!plan) {
      teams.value = null;
      return;
    }
    
    const { clubsUsed, teamsCount } = plan;
    const clubNames = clubsUsed.map(c => c.name);
    
    // Shuffle each club independently
    const shuffled = {};
    for (const c of clubsUsed) {
      shuffled[c.name] = shuffle(c.participants);
    }
    
    // Round-robin: person i from each club → team i
    const result = {};
    for (const tn of teamNames) result[tn] = [];
    
    for (let i = 0; i < teamsCount; i++) {
      for (let t = 0; t < clubNames.length; t++) {
        const clubName = clubNames[t];
        const person = shuffled[clubName][i];
        const teamName = teamNames[i % teamNames.length];
        const code = `${teamPrefixes[teamName]}${result[teamName].length + 1}`;
        result[teamName].push({ code, name: person, club: clubName });
      }
    }
    
    teams.value = result;
    copied.value = false;
    
    // Show info about excluded participants
    const excluded = [];
    for (const c of clubsUsed) {
      if (c.participants.length > teamsCount) {
        excluded.push(`${c.name}: ${c.participants.length - teamsCount} not assigned`);
      }
    }
    if (excluded.length > 0) {
      error.value = 'Note: ' + excluded.join('; ');
    }
  } else {
    // 'all' mode: assign everyone into 3 teams as evenly as possible
    assignEveryone(parsed);
  }
}

function assignEveryone(parsed) {
  // Pool all participants with their club info
  const pool = [];
  for (const c of parsed) {
    for (const name of shuffle(c.participants)) {
      pool.push({ name, club: c.name });
    }
  }
  
  // Target: 3 teams, as equal as possible
  const teamCount = 3;
  const total = pool.length;
  const baseSize = Math.floor(total / teamCount);
  const extra = total % teamCount; // first 'extra' teams get +1
  
  const teamSizes = teamNames.map((_, i) => baseSize + (i < extra ? 1 : 0));
  
  // Sort pool by club to help distribution, then shuffle within club groups
  // Actually, let's just shuffle the whole pool and distribute round-robin
  // This naturally mixes clubs
  const shuffledPool = shuffle(pool);
  
  const result = {};
  for (const tn of teamNames) result[tn] = [];
  
  let poolIndex = 0;
  for (let t = 0; t < teamNames.length; t++) {
    const teamName = teamNames[t];
    const targetSize = teamSizes[t];
    for (let s = 0; s < targetSize; s++) {
      if (poolIndex < shuffledPool.length) {
        const person = shuffledPool[poolIndex++];
        const code = `${teamPrefixes[teamName]}${result[teamName].length + 1}`;
        result[teamName].push({ code, name: person.name, club: person.club });
      }
    }
  }
  
  teams.value = result;
  copied.value = false;
  error.value = '';
}

function copyMessages() {
  if (!teams.value) return;
  
  let text = '';
  for (const teamName of teamNames) {
    for (const m of teams.value[teamName]) {
      text += `${m.name}: Your team code is ${m.code} (Team ${teamName}). Join at menti.com with your event code\n`;
    }
  }
  
  navigator.clipboard.writeText(text.trim());
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
}

function downloadAssignments() {
  if (!teams.value) return;
  
  let text = '=== TEAM ASSIGNMENTS ===\n\n';
  for (const teamName of teamNames) {
    text += `${teamName} (${teams.value[teamName].length})\n`;
    for (const m of teams.value[teamName]) {
      text += `  ${m.code}  ${m.name}  [${m.club}]\n`;
    }
    text += '\n';
  }
  
  text += '=== MESSAGE TEMPLATES ===\n';
  for (const teamName of teamNames) {
    for (const m of teams.value[teamName]) {
      text += `${m.name}: Your team code is ${m.code} (Team ${teamName}). Join at menti.com with your event code\n`;
    }
  }
  
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'team-assignments.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function addClub() {
  if (clubs.value.length >= 6) return;
  clubs.value.push({ name: '', participants: '' });
}

function removeClub(index) {
  if (clubs.value.length <= 3) return;
  clubs.value.splice(index, 1);
}
</script>

<template>
  <div class="min-h-screen bg-cream p-6">
    <div class="w-full max-w-4xl mx-auto">
      <header class="mb-8">
        <h1 class="font-display text-4xl font-bold text-ink mb-2">Team Randomizer</h1>
        <p class="text-warm-muted">
          Split participants from 3 clubs into 3 mixed teams (Himalaya, Indus, Siam) with equal representation.
        </p>
      </header>

      <!-- Input Section -->
      <section class="bg-warm-surface border border-warm-border rounded-lg p-6 mb-8">
        <h2 class="font-display text-xl font-bold text-ink mb-6">Participants by Club</h2>
        
        <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-sm">
          {{ error }}
        </div>

        <div class="space-y-4" v-for="(club, index) in clubs" :key="index">
          <div class="flex flex-col sm:flex-row gap-4 items-start">
            <div class="flex-1 min-w-0">
              <label class="block text-warm-muted text-sm mb-2">
                Club {{ index + 1 }} Name
              </label>
              <input
                v-model="club.name"
                type="text"
                placeholder="e.g., Patan South"
                class="w-full bg-cream border border-warm-border text-ink py-2 px-3 rounded-sm focus:outline-none focus:ring-2 focus:ring-coral"
              />
            </div>
            
            <div class="flex-1 min-w-0">
              <label class="block text-warm-muted text-sm mb-2">
                Participants (comma-separated)
              </label>
              <textarea
                v-model="club.participants"
                rows="2"
                placeholder="Alice, Bob, Carol, Dave"
                class="w-full bg-cream border border-warm-border text-ink py-2 px-3 rounded-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none text-sm"
              ></textarea>
            </div>

            <div class="flex items-end" v-if="clubs.length > 3">
              <button
                @click="removeClub(index)"
                class="text-coral hover:text-coral/80 text-sm font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-warm-muted text-sm mb-3">Mode</label>
          <div class="flex gap-3">
            <button
              @click="mode = 'equal'"
              :class="[
                'px-4 py-2 rounded-sm font-medium transition-colors',
                mode === 'equal' ? 'bg-coral text-ink' : 'bg-warm-surface text-warm-muted border border-warm-border hover:bg-ink dark:hover:bg-[#1C1C1E] hover:text-white'
              ]"
            >
              Equal representation (min per club)
            </button>
            <button
              @click="mode = 'all'"
              :class="[
                'px-4 py-2 rounded-sm font-medium transition-colors',
                mode === 'all' ? 'bg-coral text-ink' : 'bg-warm-surface text-warm-muted border border-warm-border hover:bg-ink dark:hover:bg-[#1C1C1E] hover:text-white'
              ]"
            >
              Assign everyone (mixed teams)
            </button>
          </div>
          <p class="text-warm-muted text-sm mt-2" v-if="mode === 'equal'">
            Uses the smallest club's count. Excess participants from larger clubs are not assigned.
          </p>
          <p class="text-warm-muted text-sm mt-2" v-if="mode === 'all'">
            Assigns all participants into 3 mixed teams as evenly as possible.
          </p>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="addClub"
            v-if="clubs.length < 6"
            class="px-4 py-2 bg-warm-border hover:bg-warm-border/80 text-ink font-medium rounded-sm transition-colors"
          >
            + Add Club
          </button>
          
          <button
            @click="generateTeams"
            class="flex-1 px-6 py-3 bg-coral hover:bg-coral/80 text-ink font-bold rounded-sm text-lg transition-colors"
          >
            Generate Teams
          </button>
        </div>
      </section>

      <!-- Results Section -->
      <section v-if="teams" class="space-y-6">
        <div class="flex flex-wrap gap-3">
          <button
            @click="copyMessages"
            class="px-4 py-2 bg-mint hover:bg-mint/80 text-ink font-medium rounded-sm transition-colors flex items-center gap-2"
          >
            <span v-if="!copied">📋 Copy Messages</span>
            <span v-else class="text-coral">✅ Copied!</span>
          </button>
          <button
            @click="downloadAssignments"
            class="px-4 py-2 bg-ink hover:bg-ink/80 text-white font-medium rounded-sm transition-colors"
          >
            💾 Download .txt
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            v-for="teamName in teamNames"
            :key="teamName"
            :class="[
              'bg-warm-surface border border-warm-border rounded-lg p-6',
              'relative overflow-hidden'
            ]"
          >
            <!-- Team color accent bar -->
            <div
              :class="['absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r', teamColors[teamName]]"
            ></div>
            
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-display text-2xl font-bold text-ink">
                {{ teamName }}
              </h3>
              <span class="px-2 py-1 bg-ink/10 text-ink text-sm font-mono rounded-sm">
                {{ teams[teamName].length }} members
              </span>
            </div>

            <ul class="space-y-3" v-if="teams[teamName].length > 0">
              <li
                v-for="member in teams[teamName]"
                :key="member.code"
                class="flex items-center justify-between py-2 px-3 bg-cream/50 border border-warm-border rounded-sm hover:bg-cream transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="font-mono text-lg font-bold text-coral bg-coral/10 px-3 py-1 rounded-sm min-w-[3rem] text-center">
                    {{ member.code }}
                  </span>
                  <span class="font-medium text-ink">{{ member.name }}</span>
                </div>
                <span class="text-xs px-2 py-1 bg-warm-border text-warm-muted rounded-sm">
                  {{ member.club }}
                </span>
              </li>
            </ul>

            <p v-if="teams[teamName].length === 0" class="text-warm-muted text-center py-8">
              No members
            </p>
          </div>
        </div>

        <!-- Summary stats -->
        <div class="mt-8 p-4 bg-ink/5 border border-warm-border rounded-lg">
          <h4 class="font-display text-lg font-bold text-ink mb-3">Summary</h4>
          <div class="grid grid-cols-3 gap-4 text-center">
            <div v-for="teamName in teamNames" :key="teamName">
              <div class="font-display text-2xl font-bold text-ink">{{ teams[teamName]?.length || 0 }}</div>
              <div class="text-warm-muted text-sm">{{ teamName }}</div>
            </div>
          </div>
          <p class="text-warm-muted text-sm mt-2 text-center">
            {{ Object.values(teams).reduce((a,b)=>a+b.length,0) }} total assigned • {{ teams.Himalaya?.length || 0 }} per club per team
          </p>
        </div>
      </section>

      <!-- Empty state -->
      <div v-else class="text-center py-16 text-warm-muted">
        <div class="text-6xl mb-4">🎲</div>
        <p class="text-lg">Enter participants above and click <span class="font-bold text-coral">Generate Teams</span></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Uses existing design tokens: ink, cream, warm-surface, warm-border, coral, mint, mustard, etc. */
</style>