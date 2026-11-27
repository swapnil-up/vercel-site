<script setup>
import { ref, computed, onMounted } from 'vue';

const projectTypes = [
  { value: 'Hosted', label: 'Hosted' },
  { value: 'Collaborated', label: 'Collaborated' },
  { value: 'Participated', label: 'Participated' },
  { value: 'Volunteered', label: 'Volunteered for organizations' },
];

const avenues = [
  'Service Project',
  'International Service',
  'Membership Development',
  'Club Administration',
  'Professional Development',
  'Finance',
  'Rotary Foundation',
  'Public Image',
  'Young Leaders Contact',
];

const categories = [
  { value: 'Tree Plantation', label: 'Tree Plantation', hasCount: true },
  { value: 'Letterhead Exchange', label: 'Letterhead Exchange', hasCount: false },
  { value: 'Fellowship', label: 'Fellowship', hasCount: false },
  { value: 'Community Service', label: 'Community Service', hasCount: true },
  { value: 'Blood Donation', label: 'Blood Donation', hasCount: true },
  { value: 'Health Camp', label: 'Health Camp', hasCount: true },
  { value: 'Environment', label: 'Environment', hasCount: true },
  { value: 'Education', label: 'Education', hasCount: true },
  { value: 'Peace', label: 'Peace', hasCount: false },
];

const sdgOptions = [
  'No Poverty',
  'Zero Hunger',
  'Good Health and Well-being',
  'Quality Education',
  'Gender Equality',
  'Clean Water and Sanitation',
  'Affordable and Clean Energy',
  'Decent Work and Economic Growth',
  'Industry, Innovation and Infrastructure',
  'Reduced Inequalities',
  'Sustainable Cities and Communities',
  'Responsible Consumption and Production',
  'Climate Action',
  'Life Below Water',
  'Life on Land',
  'Peace, Justice and Strong Institutions',
  'Partnerships for the Goals',
  'Global Partnership',
  'peaceful and inclusive',
  'climate change',
  'terrestrial ecosystems',
];

const commonGoals = [
  'Community service',
  'Strengthen cooperation and collaboration among clubs',
  'Membership Retention and growth',
];

const form = ref({
  key: '',
  title: '',
  projectType: 'Hosted',
  goals: [],
  jointlyOthers: [],
  selectedClubs: [],
  collaboratedWith: [],
  countries: [],
  riDistricts: [],
  collaboratedWithOthers: [],
  organizedBy: [],
  organizedOthers: [],
  volunteeredOthers: [],
  avenue: 'Service Project',
  category: 'Tree Plantation',
  benefitCount: '',
  sdg: [],
  startDate: '',
  endDate: '',
  venue: '',
  duration: '',
  totalHours: '',
  expenseAmount: '0',
  rotaractors: '0',
  rotarians: '0',
  otherVisitors: '0',
  members: { type: 'count', count: 0, names: [] },
  coordinators: [],
  benefitNote: '',
  description: '',
  objectives: '',
  images: [],
});

const showCountField = computed(() => {
  const cat = categories.find(c => c.value === form.value.category);
  return cat?.hasCount ?? false;
});

const activeSectionFields = computed(() => {
  switch (form.value.projectType) {
    case 'Hosted':
      return ['goals', 'jointlyOthers', 'selectedClubs'];
    case 'Collaborated':
      return ['goals', 'collaboratedWith', 'countries', 'riDistricts', 'collaboratedWithOthers'];
    case 'Participated':
      return ['goals', 'organizedBy', 'organizedOthers'];
    case 'Volunteered':
      return ['goals', 'volunteeredOthers'];
    default:
      return ['goals'];
  }
});

function addItem(arr) {
  arr.push('');
}

function removeItem(arr, index) {
  if (arr.length > 1) arr.splice(index, 1);
}

function formatDateForExport(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

function getExportData() {
  return {
    events: [{
      key: form.value.key,
      title: form.value.title,
      projectType: form.value.projectType,
      goals: form.value.goals.filter(Boolean),
      avenue: form.value.avenue,
      category: form.value.category,
      benefitCount: form.value.benefitCount || undefined,
      sdg: form.value.sdg.filter(Boolean),
      startDate: formatDateForExport(form.value.startDate),
      endDate: form.value.endDate ? formatDateForExport(form.value.endDate) : undefined,
      venue: form.value.venue,
      duration: form.value.duration,
      totalHours: form.value.totalHours,
      expenseAmount: form.value.expenseAmount,
      rotaractors: form.value.rotaractors,
      rotarians: form.value.rotarians,
      otherVisitors: form.value.otherVisitors,
      members: form.value.members.type === 'names'
        ? { names: form.value.members.names.filter(Boolean) }
        : { count: form.value.members.count },
      coordinators: form.value.coordinators.filter(Boolean),
      benefitNote: form.value.benefitNote,
      description: form.value.description,
      objectives: form.value.objectives,
      images: form.value.images.filter(Boolean),
      ...(form.value.projectType === 'Hosted' && {
        jointlyOthers: form.value.jointlyOthers.filter(Boolean),
        selectedClubs: form.value.selectedClubs.filter(Boolean),
      }),
      ...(form.value.projectType === 'Collaborated' && {
        collaboratedWith: form.value.collaboratedWith.filter(Boolean),
        countries: form.value.countries.filter(Boolean),
        riDistricts: form.value.riDistricts.filter(Boolean),
        collaboratedWithOthers: form.value.collaboratedWithOthers.filter(Boolean),
      }),
      ...(form.value.projectType === 'Participated' && {
        organizedBy: form.value.organizedBy.filter(Boolean),
        organizedOthers: form.value.organizedOthers.filter(Boolean),
      }),
      ...(form.value.projectType === 'Volunteered' && {
        volunteeredOthers: form.value.volunteeredOthers.filter(Boolean),
      }),
    }],
  };
}

function copyJson() {
  const exportData = getExportData();
  navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
  alert('Copied to clipboard!');
}

function clearForm() {
  if (confirm('Clear all fields? This cannot be undone.')) {
    form.value = {
      key: '',
      title: '',
      projectType: 'Hosted',
      goals: ['Community service'],
      jointlyOthers: [''],
      selectedClubs: [''],
      collaboratedWith: ['Rotaract'],
      countries: [''],
      riDistricts: [''],
      collaboratedWithOthers: [''],
      organizedBy: [''],
      organizedOthers: [''],
      volunteeredOthers: [''],
      avenue: 'Service Project',
      category: 'Tree Plantation',
      benefitCount: '',
      sdg: [''],
      startDate: '',
      endDate: '',
      venue: '',
      duration: '',
      totalHours: '',
      expenseAmount: '0',
      rotaractors: '0',
      rotarians: '0',
      otherVisitors: '0',
      members: { type: 'count', count: 0, names: [''] },
      coordinators: [''],
      benefitNote: '',
      description: '',
      objectives: '',
      images: [''],
    };
  }
}

function loadExample(type) {
  const examples = {
    tree: {
      key: 'tree',
      title: 'Tree Plantation Drive 2026-27',
      projectType: 'Hosted',
      goals: ['Community service'],
      jointlyOthers: ['Partner Rotary Club'],
      selectedClubs: [],
      avenue: 'Service Project',
      category: 'Tree Plantation',
      benefitCount: '150',
      sdg: ['Climate Action', 'Life on Land'],
      startDate: '2026-07-26T08:00',
      endDate: '2026-07-26T12:00',
      venue: 'Local Forest / Park',
      duration: '4 hours',
      totalHours: '30',
      expenseAmount: '15000',
      rotaractors: '0',
      rotarians: '5',
      otherVisitors: '3',
      members: { type: 'names', count: 1, names: ['Coordinator Name'] },
      coordinators: ['President Name', 'Coordinator Name'],
      benefitNote: 'Planted native tree saplings as part of a district-wide tree plantation campaign. Contributed to climate action, reforestation and biodiversity conservation, benefiting the local community and wildlife.',
      description: 'The tree plantation was conducted at a local forest as part of a district Governor\'s initiative. Members joined the partner Rotary Club to plant native saplings. The event was coordinated with local forest office and stakeholders.',
      objectives: 'Plant native saplings at the selected site. Support the district tree plantation drive. Promote environmental awareness among members. Strengthen fellowship with the partner Rotary Club.',
      images: ['tree-plantation-1.jpeg', 'tree-plantation-2.jpeg'],
    },
    letterhead: {
      key: 'letterhead',
      title: 'Letterhead Exchange with Partner Rotaract Club 2026-27',
      projectType: 'Collaborated',
      goals: ['Strengthen cooperation and collaboration among clubs'],
      collaboratedWith: ['Rotaract'],
      countries: ['Partner Country'],
      riDistricts: ['Partner District'],
      collaboratedWithOthers: ['Partner Rotaract Club Name'],
      avenue: 'International Service',
      category: 'Letterhead Exchange',
      benefitCount: '',
      sdg: ['Partnerships for the Goals', 'Peace, Justice and Strong Institutions'],
      startDate: '2026-11-15T19:00',
      endDate: '2026-11-15T20:00',
      venue: 'Online (Google Meet / Zoom)',
      duration: '1 hour',
      totalHours: '7',
      expenseAmount: '0',
      rotaractors: '7',
      rotarians: '0',
      otherVisitors: '0',
      members: { type: 'count', count: 5, names: [''] },
      coordinators: ['President Name', 'Coordinator Name'],
      benefitNote: 'Exchanged club letterheads between our club and the partner Rotaract Club. Both clubs presented their flagship projects and shared best practices. Future collaboration, including joint service initiatives, was discussed.',
      description: 'Conducted online with Rotaractors from both clubs. The session included introductions, presentation of each club\'s flagship projects, discussion of member journeys, and the official exchange of club letterheads. Ideas for future joint projects were explored.',
      objectives: 'Exchange official club letterheads with the partner club. Share experiences, flagship projects and best practices. Explore future opportunities for joint international service and collaboration.',
      images: ['letterhead-exchange.jpeg'],
    },
    fpl: {
      key: 'fpl',
      title: 'Fantasy Premier League 2026-27',
      projectType: 'Hosted',
      goals: ['Membership Retention and growth'],
      jointlyOthers: [],
      selectedClubs: [],
      avenue: 'Membership Development',
      category: 'Fellowship',
      benefitCount: '',
      sdg: ['Peace, Justice and Strong Institutions'],
      startDate: '2026-08-15T00:00',
      endDate: '2027-05-23T23:00',
      venue: 'Online (Fantasy Premier League platform)',
      duration: 'Season-long (38 gameweeks)',
      totalHours: '50',
      expenseAmount: '0',
      rotaractors: '0',
      rotarians: '0',
      otherVisitors: '0',
      members: { type: 'count', count: 15, names: [''] },
      coordinators: ['President Name', 'Coordinator Name'],
      benefitNote: 'A season-long fellowship activity engaging members in friendly competition. Participants take part across the 2026-27 Premier League season, fostering regular interaction, camaraderie and club bonding. Free of cost and open to all members.',
      description: 'Fantasy Premier League is an annual season-long fellowship activity in which members manage FPL teams in a private club league. The 2026-27 edition continues the tradition. Members joined the league at Gameweek 1 and compete through Gameweek 38, with weekly updates shared in the club group. Free entry, purely for fellowship.',
      objectives: 'Provide a year-round fellowship opportunity for members. Encourage regular engagement through friendly competition. Build camaraderie across batches and seniority levels. Offer a low-barrier activity that welcomes new members.',
      images: ['fpl-banner.jpeg'],
    },
  };

  const ex = examples[type];
  if (ex) {
    Object.keys(ex).forEach(k => {
      if (k === 'members') {
        form.value.members = { ...ex.members };
      } else if (Array.isArray(ex[k])) {
        form.value[k] = [...ex[k]];
      } else {
        form.value[k] = ex[k];
      }
    });
  }
}

const validationErrors = computed(() => {
  const errors = [];
  if (!form.value.key) errors.push('Key is required');
  if (!form.value.title) errors.push('Title is required');
  if (!form.value.projectType) errors.push('Project type is required');
  if (!form.value.goals.some(g => g)) errors.push('At least one goal is required');
  if (!form.value.avenue) errors.push('Avenue is required');
  if (!form.value.category) errors.push('Category is required');
  if (!form.value.startDate) errors.push('Start date is required');
  if (!form.value.venue) errors.push('Venue is required');
  if (!form.value.duration) errors.push('Duration is required');
  if (!form.value.totalHours) errors.push('Total hours is required');
  if (!form.value.coordinators.some(c => c)) errors.push('At least one coordinator is required');
  if (!form.value.benefitNote) errors.push('Benefit note is required');
  if (!form.value.description) errors.push('Description is required');
  if (!form.value.objectives) errors.push('Objectives is required');
  if (showCountField.value && !form.value.benefitCount) errors.push('Benefit count is required for this category');
  return errors;
});

const isValid = computed(() => validationErrors.value.length === 0);
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-12">
    <div class="mb-8">
      <h1 class="font-display text-4xl font-bold text-ink mb-2">
        Rotaract Report Form
      </h1>
      <p class="text-warm-muted">
        Fill in project report data and export as JSON for the submission script. Matches the schema used by <code class="bg-warm-border px-1.5 py-0.5 rounded text-xs font-mono">portal/scraper/submit_reports.cjs</code>.
      </p>
    </div>

    <!-- Quick Load Examples -->
    <div class="mb-8 p-4 bg-warm-surface border-2 border-warm-border rounded-lg">
      <p class="font-medium text-ink mb-3">Quick load example:</p>
      <div class="flex flex-wrap gap-3">
        <button @click="loadExample('tree')" class="px-4 py-2 bg-coral text-cream font-medium rounded hover:bg-coral-ink transition-colors">
          Tree Plantation
        </button>
        <button @click="loadExample('letterhead')" class="px-4 py-2 bg-coral text-cream font-medium rounded hover:bg-coral-ink transition-colors">
          Letterhead Exchange
        </button>
        <button @click="loadExample('fpl')" class="px-4 py-2 bg-coral text-cream font-medium rounded hover:bg-coral-ink transition-colors">
          Fantasy Premier League
        </button>
      </div>
    </div>

    <!-- Validation Errors -->
    <div v-if="validationErrors.length" class="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-800">
      <p class="font-medium mb-2">Please fix the following:</p>
      <ul class="list-disc list-inside space-y-1">
        <li v-for="err in validationErrors" :key="err">{{ err }}</li>
      </ul>
    </div>

    <form class="space-y-8" @submit.prevent>
      <!-- Basic Info -->
      <fieldset class="border-2 border-warm-border rounded-lg p-6">
        <legend class="font-display text-xl font-bold text-ink px-2">Basic Information</legend>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Key <span class="text-coral">*</span></label>
            <input v-model="form.key" type="text" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="tree, letterhead, fpl" />
            <p class="text-xs text-warm-muted mt-1">Unique identifier used by <code class="font-mono">--only=</code></p>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Image Directory</label>
            <input v-model="form.imageDir" type="text" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="/home/swap/Downloads/rota-event" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-ink mb-1">Title <span class="text-coral">*</span></label>
            <input v-model="form.title" type="text" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" maxlength="200" placeholder="Tree Plantation Drive 2026-27" />
            <p class="text-xs text-warm-muted mt-1">Max 200 characters</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Project Type <span class="text-coral">*</span></label>
            <select v-model="form.projectType" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none">
              <option v-for="pt in projectTypes" :key="pt.value" :value="pt.value">{{ pt.label }}</option>
            </select>
          </div>
        </div>
      </fieldset>

      <!-- Project-Type Specific Fields -->
      <fieldset class="border-2 border-warm-border rounded-lg p-6">
        <legend class="font-display text-xl font-bold text-ink px-2">{{ form.projectType }} – Specific Fields</legend>
        
        <!-- Hosted fields -->
        <div v-if="form.projectType === 'Hosted'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Jointly With (Organizations)</label>
            <div class="space-y-2">
              <div v-for="(org, i) in form.jointlyOthers" :key="i" class="flex gap-2">
                <input v-model="form.jointlyOthers[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="Rotary Club of Patan South" />
                <button type="button" @click="removeItem(form.jointlyOthers, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.jointlyOthers.length === 1">Remove</button>
              </div>
              <button type="button" @click="addItem(form.jointlyOthers)" class="text-sm text-coral hover:text-coral-ink">+ Add organization</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Selected Clubs (Jointly With)</label>
            <div class="space-y-2">
              <div v-for="(club, i) in form.selectedClubs" :key="i" class="flex gap-2">
                <input v-model="form.selectedClubs[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="RAC Kathmandu" />
                <button type="button" @click="removeItem(form.selectedClubs, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.selectedClubs.length === 1">Remove</button>
              </div>
              <button type="button" @click="addItem(form.selectedClubs)" class="text-sm text-coral hover:text-coral-ink">+ Add club</button>
            </div>
          </div>
        </div>

        <!-- Collaborated fields -->
        <div v-if="form.projectType === 'Collaborated'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Collaborated With <span class="text-coral">*</span></label>
            <div class="space-y-2">
              <div v-for="(cw, i) in form.collaboratedWith" :key="i" class="flex gap-2">
                <input v-model="form.collaboratedWith[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="Rotaract" />
                <button type="button" @click="removeItem(form.collaboratedWith, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.collaboratedWith.length === 1">Remove</button>
              </div>
              <button type="button" @click="addItem(form.collaboratedWith)" class="text-sm text-coral hover:text-coral-ink">+ Add</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Countries</label>
            <div class="space-y-2">
              <div v-for="(ctr, i) in form.countries" :key="i" class="flex gap-2">
                <input v-model="form.countries[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="Sri Lanka" />
                <button type="button" @click="removeItem(form.countries, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.countries.length === 1">Remove</button>
              </div>
              <button type="button" @click="addItem(form.countries)" class="text-sm text-coral hover:text-coral-ink">+ Add country</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">RI Districts</label>
            <div class="space-y-2">
              <div v-for="(dist, i) in form.riDistricts" :key="i" class="flex gap-2">
                <input v-model="form.riDistricts[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="3220" />
                <button type="button" @click="removeItem(form.riDistricts, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.riDistricts.length === 1">Remove</button>
              </div>
              <button type="button" @click="addItem(form.riDistricts)" class="text-sm text-coral hover:text-coral-ink">+ Add district</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Collaborated With Others (Tags)</label>
            <div class="space-y-2">
              <div v-for="(cwo, i) in form.collaboratedWithOthers" :key="i" class="flex gap-2">
                <input v-model="form.collaboratedWithOthers[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="Rotaract Club of University of Colombo FMF" />
                <button type="button" @click="removeItem(form.collaboratedWithOthers, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.collaboratedWithOthers.length === 1">Remove</button>
              </div>
              <button type="button" @click="addItem(form.collaboratedWithOthers)" class="text-sm text-coral hover:text-coral-ink">+ Add</button>
            </div>
          </div>
        </div>

        <!-- Participated fields -->
        <div v-if="form.projectType === 'Participated'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Organized By</label>
            <div class="space-y-2">
              <div v-for="(ob, i) in form.organizedBy" :key="i" class="flex gap-2">
                <input v-model="form.organizedBy[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="RAC Kathmandu" />
                <button type="button" @click="removeItem(form.organizedBy, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.organizedBy.length === 1">Remove</button>
              </div>
              <button type="button" @click="addItem(form.organizedBy)" class="text-sm text-coral hover:text-coral-ink">+ Add club</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Organized Others (Tags)</label>
            <div class="space-y-2">
              <div v-for="(oo, i) in form.organizedOthers" :key="i" class="flex gap-2">
                <input v-model="form.organizedOthers[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="Other organizer" />
                <button type="button" @click="removeItem(form.organizedOthers, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.organizedOthers.length === 1">Remove</button>
              </div>
              <button type="button" @click="addItem(form.organizedOthers)" class="text-sm text-coral hover:text-coral-ink">+ Add</button>
            </div>
          </div>
        </div>

        <!-- Volunteered fields -->
        <div v-if="form.projectType === 'Volunteered'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Volunteered Others (Tags)</label>
            <div class="space-y-2">
              <div v-for="(vo, i) in form.volunteeredOthers" :key="i" class="flex gap-2">
                <input v-model="form.volunteeredOthers[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="Organization name" />
                <button type="button" @click="removeItem(form.volunteeredOthers, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.volunteeredOthers.length === 1">Remove</button>
              </div>
              <button type="button" @click="addItem(form.volunteeredOthers)" class="text-sm text-coral hover:text-coral-ink">+ Add</button>
            </div>
          </div>
        </div>
      </fieldset>

      <!-- Goals (always present) -->
      <fieldset class="border-2 border-warm-border rounded-lg p-6">
        <legend class="font-display text-xl font-bold text-ink px-2">Club Goals <span class="text-coral">*</span></legend>
        <div class="space-y-2">
          <div v-for="(goal, i) in form.goals" :key="i" class="flex gap-2">
            <input v-model="form.goals[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="Community service" list="goals-list" />
            <button type="button" @click="removeItem(form.goals, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.goals.length === 1">Remove</button>
          </div>
          <button type="button" @click="addItem(form.goals)" class="text-sm text-coral hover:text-coral-ink">+ Add goal</button>
        </div>
        <datalist id="goals-list">
          <option v-for="g in commonGoals" :key="g" :value="g" />
        </datalist>
        <p class="text-xs text-warm-muted mt-2">Type or pick from suggestions. These are resolved by label on the portal.</p>
      </fieldset>

      <!-- Classification -->
      <fieldset class="border-2 border-warm-border rounded-lg p-6">
        <legend class="font-display text-xl font-bold text-ink px-2">Classification <span class="text-coral">*</span></legend>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Avenue <span class="text-coral">*</span></label>
            <select v-model="form.avenue" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none">
              <option v-for="a in avenues" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Category <span class="text-coral">*</span></label>
            <select v-model="form.category" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none">
              <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}{{ c.hasCount ? ' (has count)' : '' }}</option>
            </select>
          </div>
          <div v-if="showCountField">
            <label class="block text-sm font-medium text-ink mb-1">Benefit Count <span class="text-coral">*</span></label>
            <input v-model="form.benefitCount" type="number" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="150" />
          </div>
        </div>
      </fieldset>

      <!-- SDGs -->
      <fieldset class="border-2 border-warm-border rounded-lg p-6">
        <legend class="font-display text-xl font-bold text-ink px-2">SDGs</legend>
        <div class="space-y-2">
          <div v-for="(sdg, i) in form.sdg" :key="i" class="flex gap-2">
            <input v-model="form.sdg[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="Climate Action" list="sdg-list" />
            <button type="button" @click="removeItem(form.sdg, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.sdg.length === 1">Remove</button>
          </div>
          <button type="button" @click="addItem(form.sdg)" class="text-sm text-coral hover:text-coral-ink">+ Add SDG</button>
        </div>
        <datalist id="sdg-list">
          <option v-for="s in sdgOptions" :key="s" :value="s" />
        </datalist>
      </fieldset>

      <!-- Dates & Venue -->
      <fieldset class="border-2 border-warm-border rounded-lg p-6">
        <legend class="font-display text-xl font-bold text-ink px-2">Date, Time & Venue <span class="text-coral">*</span></legend>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Start Date & Time <span class="text-coral">*</span></label>
            <input v-model="form.startDate" type="datetime-local" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" />
            <p class="text-xs text-warm-muted mt-1">Format: YYYY-MM-DDTHH:MM (exported as "YYYY-MM-DD HH:MM AM/PM")</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">End Date & Time</label>
            <input v-model="form.endDate" type="datetime-local" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" />
            <p class="text-xs text-warm-muted mt-1">Optional for single-instant events</p>
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-ink mb-1">Venue <span class="text-coral">*</span></label>
            <input v-model="form.venue" type="text" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="Gokarna Forest, Kathmandu" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Duration <span class="text-coral">*</span></label>
            <input v-model="form.duration" type="text" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="4 hours" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Total Hours <span class="text-coral">*</span></label>
            <input v-model="form.totalHours" type="number" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="30" />
          </div>
        </div>
      </fieldset>

      <!-- Numbers -->
      <fieldset class="border-2 border-warm-border rounded-lg p-6">
        <legend class="font-display text-xl font-bold text-ink px-2">Numbers & Counts</legend>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Expense (NPR)</label>
            <input v-model="form.expenseAmount" type="number" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="0" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Rotaractors (other clubs)</label>
            <input v-model="form.rotaractors" type="number" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="0" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Rotarians</label>
            <input v-model="form.rotarians" type="number" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="0" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Other Visitors</label>
            <input v-model="form.otherVisitors" type="number" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="0" />
          </div>
        </div>
      </fieldset>

      <!-- Members Present -->
      <fieldset class="border-2 border-warm-border rounded-lg p-6">
        <legend class="font-display text-xl font-bold text-ink px-2">Members Present <span class="text-coral">*</span></legend>
        <div class="mb-4">
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input type="radio" v-model="form.members.type" value="count" class="accent-coral" />
            <span class="text-sm">By count (first N from portal roster)</span>
          </label>
          <label class="inline-flex items-center gap-2 cursor-pointer ml-6">
            <input type="radio" v-model="form.members.type" value="names" class="accent-coral" />
            <span class="text-sm">By explicit names (matched against portal roster)</span>
          </label>
        </div>
        <div v-if="form.members.type === 'count'" class="mb-4">
          <label class="block text-sm font-medium text-ink mb-1">Number of members</label>
          <input v-model.number="form.members.count" type="number" min="0" class="w-full max-w-xs px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" />
        </div>
        <div v-if="form.members.type === 'names'" class="space-y-2">
          <div v-for="(name, i) in form.members.names" :key="i" class="flex gap-2">
            <input v-model="form.members.names[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="Swapnil Upadhyay" />
            <button type="button" @click="removeItem(form.members.names, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.members.names.length === 1">Remove</button>
          </div>
          <button type="button" @click="addItem(form.members.names)" class="text-sm text-coral hover:text-coral-ink">+ Add member name</button>
        </div>
      </fieldset>

      <!-- Coordinators -->
      <fieldset class="border-2 border-warm-border rounded-lg p-6">
        <legend class="font-display text-xl font-bold text-ink px-2">Coordinators <span class="text-coral">*</span></legend>
        <div class="space-y-2">
          <div v-for="(coord, i) in form.coordinators" :key="i" class="flex gap-2">
            <input v-model="form.coordinators[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="Yukie Maharjan" />
            <button type="button" @click="removeItem(form.coordinators, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.coordinators.length === 1">Remove</button>
          </div>
          <button type="button" @click="addItem(form.coordinators)" class="text-sm text-coral hover:text-coral-ink">+ Add coordinator</button>
        </div>
        <p class="text-xs text-warm-muted mt-2">Resolved by label substring against portal member list.</p>
      </fieldset>

      <!-- Text Areas -->
      <fieldset class="border-2 border-warm-border rounded-lg p-6">
        <legend class="font-display text-xl font-bold text-ink px-2">Descriptions <span class="text-coral">*</span></legend>
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Benefit Note <span class="text-coral">*</span></label>
            <textarea v-model="form.benefitNote" rows="4" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none font-mono text-sm" placeholder="Planted 150 native tree saplings..."></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Description <span class="text-coral">*</span></label>
            <textarea v-model="form.description" rows="5" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none font-mono text-sm" placeholder="The tree plantation was conducted on..."></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink mb-1">Objectives <span class="text-coral">*</span></label>
            <textarea v-model="form.objectives" rows="4" class="w-full px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none font-mono text-sm" placeholder="Plant 150 native saplings..."></textarea>
          </div>
        </div>
      </fieldset>

      <!-- Images -->
      <fieldset class="border-2 border-warm-border rounded-lg p-6">
        <legend class="font-display text-xl font-bold text-ink px-2">Images (max 6, ≤5MB each)</legend>
        <div class="space-y-2">
          <div v-for="(img, i) in form.images" :key="i" class="flex gap-2">
            <input v-model="form.images[i]" type="text" class="flex-1 px-4 py-2 border-2 border-warm-border bg-cream rounded focus:border-coral focus:outline-none" placeholder="tree-plantation.jpeg" />
            <button type="button" @click="removeItem(form.images, i)" class="px-3 py-2 text-red-600 hover:text-red-800" :disabled="form.images.length === 1">Remove</button>
          </div>
          <button type="button" @click="addItem(form.images)" class="text-sm text-coral hover:text-coral-ink">+ Add image filename</button>
        </div>
        <p class="text-xs text-warm-muted mt-2">Filenames relative to your images folder (configured in the submission script). Leave empty to skip.</p>
      </fieldset>

      <!-- Export Actions -->
      <div class="flex flex-wrap gap-4 pt-4 border-t-2 border-warm-border">
        <button type="button" @click="exportJson" class="px-6 py-3 bg-coral text-cream font-medium rounded-lg hover:bg-coral-ink transition-colors" :disabled="!isValid">
          Download JSON
        </button>
        <button type="button" @click="copyJson" class="px-6 py-3 border-2 border-warm-border text-ink font-medium rounded-lg hover:bg-warm-border transition-colors" :disabled="!isValid">
          Copy JSON to Clipboard
        </button>
        <button type="button" @click="clearForm" class="px-6 py-3 border-2 border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors">
          Clear Form
        </button>
        <span v-if="!isValid" class="flex items-center text-sm text-red-600">Fix validation errors to enable export</span>
      </div>
    </form>
  </div>
</template>

<style scoped>
/* Ensure form elements look consistent */
input[type="text"],
input[type="number"],
input[type="datetime-local"],
select,
textarea {
  font-family: var(--font-body);
  font-size: 1rem;
}

input[type="radio"] {
  width: 16px;
  height: 16px;
}

fieldset {
  background: var(--color-warm-surface);
}

legend {
  background: var(--color-cream);
  padding: 0 8px;
}
</style>