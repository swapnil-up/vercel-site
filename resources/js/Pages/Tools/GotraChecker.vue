<template>
  <div class="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 min-h-screen">
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center justify-center">
        <Heart class="mr-3 h-8 w-8 text-red-500" />
        गोत्र Compatibility Checker
        <Heart class="ml-3 h-8 w-8 text-red-500" />
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-2">
        Enter surnames and let the aunties judge your future! 👵
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-500 italic">
        * Based on traditional Nepali Thar-Gotra mappings. Results may cause family drama.
      </p>
    </div>

    <div v-if="!result" class="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg shadow-lg mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Person 1 -->
        <div class="space-y-4">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <Users class="mr-2 h-5 w-5" />
            Person 1
          </h3>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name
            </label>
            <input
              v-model="person1.firstName"
              type="text"
              placeholder="Enter first name"
              class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Surname (Thar) 
            </label>
            <input
              v-model="person1.surname"
              type="text"
              placeholder="e.g., Sharma, Poudel, Adhikari"
              list="surname-list"
              class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div v-if="person1.detectedGotra" class="mt-2 text-sm text-blue-600 dark:text-blue-400">
              📝 Detected Gotra: {{ person1.detectedGotra }}
            </div>
            <div v-else-if="person1.surname && !person1.detectedGotra" class="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Gotra not found in database. Please check spelling or add manually.
            </div>
          </div>
        </div>

        <!-- Person 2 -->
        <div class="space-y-4">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <Users class="mr-2 h-5 w-5" />
            Person 2
          </h3>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name
            </label>
            <input
              v-model="person2.firstName"
              type="text"
              placeholder="Enter first name"
              class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Surname (Thar)
            </label>
            <input
              v-model="person2.surname"
              type="text"
              placeholder="e.g., Bhattarai, Koirala, Ghimire"
              list="surname-list"
              class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div v-if="person2.detectedGotra" class="mt-2 text-sm text-blue-600 dark:text-blue-400">
              📝 Detected Gotra: {{ person2.detectedGotra }}
            </div>
            <div v-else-if="person2.surname && !person2.detectedGotra" class="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Gotra not found in database. Please check spelling or add manually.
            </div>
          </div>
        </div>
      </div>

      <div class="text-center mt-8">
        <button
          @click="checkCompatibility"
          :disabled="isChecking || !person1.surname || !person2.surname"
          class="px-8 py-4 bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold rounded-lg hover:from-pink-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center mx-auto text-lg"
        >
          <Sparkles v-if="isChecking" class="animate-spin mr-2 h-6 w-6" />
          <Heart v-else class="mr-2 h-6 w-6" />
          {{ isChecking ? 'Consulting the Village Elders...' : 'Check Compatibility' }}
        </button>
      </div>
    </div>

    <div v-if="result" class="bg-gray-50 dark:bg-gray-800 p-8 rounded-lg shadow-lg">
      <div class="text-center mb-6">
        <div class="flex items-center justify-center mb-4">
          <CheckCircle v-if="result.status === 'compatible'" class="h-8 w-8 text-green-600" />
          <XCircle v-else-if="result.status === 'incompatible'" class="h-8 w-8 text-red-600" />
          <AlertTriangle v-else class="h-8 w-8 text-yellow-600" />
        </div>
        <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          {{ result.title }}
        </h2>
        <p class="text-lg text-gray-700 dark:text-gray-300 mb-4">
          {{ result.message }}
        </p>
        
        <!-- Show the Gotra details -->
        <div class="bg-white dark:bg-gray-700 p-4 rounded-lg mb-6">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">🔍 Gotra Analysis:</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="text-center">
              <strong>{{ person1.firstName || 'Person 1' }}</strong><br>
              <span class="text-gray-600 dark:text-gray-400">{{ person1.surname }}</span><br>
              <span :class="result.status === 'compatible' ? 'text-green-600' : result.status === 'incompatible' ? 'text-red-600' : 'text-yellow-600'">
                {{ person1.detectedGotra || 'Unknown Gotra' }}
              </span>
            </div>
            <div class="text-center">
              <strong>{{ person2.firstName || 'Person 2' }}</strong><br>
              <span class="text-gray-600 dark:text-gray-400">{{ person2.surname }}</span><br>
              <span :class="result.status === 'compatible' ? 'text-green-600' : result.status === 'incompatible' ? 'text-red-600' : 'text-yellow-600'">
                {{ person2.detectedGotra || 'Unknown Gotra' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-700 p-6 rounded-lg">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            💡 Practical Advice:
          </h3>
          <p class="text-gray-700 dark:text-gray-300">
            {{ result.advice }}
          </p>
        </div>

        <div class="bg-white dark:bg-gray-700 p-6 rounded-lg">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            👪 Expected Family Reaction:
          </h3>
          <p class="text-gray-700 dark:text-gray-300">
            {{ result.familyReaction }}
          </p>
        </div>
      </div>

      <div class="text-center mb-6">
        <span :class="`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${result.riskColor} bg-gray-100 dark:bg-gray-600`">
          <AlertTriangle class="mr-2 h-4 w-4" />
          Risk Level: {{ result.riskLevel }}
        </span>
      </div>

      <div class="text-center">
        <button
          @click="resetChecker"
          class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors mr-3"
        >
          Check Another Pair
        </button>
        <button
          @click="showGotraInfo = !showGotraInfo"
          class="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
        >
          {{ showGotraInfo ? 'Hide' : 'Show' }} Gotra Info
        </button>
      </div>

      <!-- Gotra Information Panel -->
      <div v-if="showGotraInfo" class="mt-6 bg-white dark:bg-gray-700 p-6 rounded-lg">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">📚 About These Gotras:</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div v-if="person1.detectedGotra">
            <strong class="text-blue-600">{{ person1.detectedGotra }} Gotra:</strong>
            <p class="text-gray-600 dark:text-gray-400 mt-1">
              {{ getGotraInfo(person1.detectedGotra) }}
            </p>
          </div>
          <div v-if="person2.detectedGotra">
            <strong class="text-blue-600">{{ person2.detectedGotra }} Gotra:</strong>
            <p class="text-gray-600 dark:text-gray-400 mt-1">
              {{ getGotraInfo(person2.detectedGotra) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Datalist for common surnames -->
    <datalist id="surname-list">
      <option v-for="surname in Object.keys(surnameToGotraMap)" :key="surname" :value="surname" />
    </datalist>

    <!-- Disclaimer -->
    <div class="mt-8 text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
      <p class="mb-2">
        ⚠️ <strong>Disclaimer:</strong> This tool is for entertainment purposes only and based on traditional mappings.
      </p>
      <p class="mb-2">
        Some surnames may belong to multiple gotras depending on region and family history.
      </p>
      <p>
        Actual compatibility depends on many factors beyond gotra - like whether they laugh at your jokes! 😄
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Heart, AlertTriangle, CheckCircle, XCircle, Users, Sparkles } from 'lucide-react'

const person1 = ref({ firstName: '', surname: '', detectedGotra: '' })
const person2 = ref({ firstName: '', surname: '', detectedGotra: '' })
const result = ref(null)
const isChecking = ref(false)
const showGotraInfo = ref(false)

// Comprehensive surname to gotra mapping based on the research
const surnameToGotraMap = {
  // A
  'Acharya': 'Kaudinya',
  'Adhikari': 'Bharadwaj',
  'Aryal': 'Atreya',
  'Awasthi': 'Bhargava',
  
  // B
  'Baral': 'Ghritakaushika',
  'Bastola': 'Garga',
  'Basnet': 'Dhananjaya',
  'Bhandari': 'Vashishtha',
  'Bhattarai': 'Vashishtha',
  'Bhatta': 'Vishwamitra',
  'Budhathoki': 'Dhananjaya',
  
  // C-D
  'Chalise': 'Vashishtha',
  'Dahal': 'Vatsa',
  'Devkota': 'Bharadwaj',
  'Dhakal': 'Upamanyu',
  'Dhungana': 'Kaushika',
  
  // G
  'Ghimire': 'Kashyap',
  'Gautam': 'Gautam',
  'Gyawali': 'Mandavya',
  'Gaire': 'Kaudinya',
  
  // J-K
  'Joshi': 'Gautam',
  'Kandel': 'Bharadwaj',
  'Khanal': 'Ghritakaushika',
  'Kharel': 'Vashishtha',
  'Khadka': 'Kaudinya',
  'Koirala': 'Maudgalya',
  
  // L
  'Lamichhane': 'Kaushika',
  'Lamsal': 'Vatsa',
  'Lohani': 'Bharadwaj',
  'Luitel': 'Kaushika',
  
  // M-N
  'Mainali': 'Upamanyu',
  'Neupane': 'Kaudinya',
  'Niraula': 'Bharadwaj',
  
  // O-P
  'Ojha': 'Atri',
  'Pandey': 'Bharadwaj',
  'Panthi': 'Mandavya',
  'Paudel': 'Atreya',
  'Pokharel': 'Bharadwaj',
  'Prasai': 'Shandilya',
  'Puri': 'Bharadwaj',
  
  // R
  'Rawal': 'Kaudinya',
  'Regmi': 'Kaushika',
  'Rijal': 'Dhananjaya',
  
  // S
  'Sapkota': 'Kaudinya',
  'Sharma': 'Bharadwaj',
  'Sigdel': 'Atreya',
  'Sitaula': 'Bharadwaj',
  'Subedi': 'Bharadwaj',
  
  // T-U
  'Timilsina': 'Vashishtha',
  'Tiwari': 'Kashyap',
  'Upreti': 'Upamanyu',
  
  // W-Y
  'Wagle': 'Bharadwaj',
  'Yogi': 'Kashyap',
  
  // Additional common surnames
  'Amatya': 'Kashyap',
  'Basyal': 'Dhananjaya',
  'Bohara': 'Bharadwaj',
  'Chaudhary': 'Bharadwaj',
  'Dulal': 'Atreya',
  'Kafle': 'Shandilya',
  'Karki': 'Dhananjaya',
  'Kattel': 'Parashara',
  'Kunwar': 'Vatsa',
  'Mishra': 'Kashyap',
  'Pant': 'Parashara',
  'Pathak': 'Vashishtha',
  'Rana': 'Vatsa',
  'Rimal': 'Kaushika',
  'Shrestha': 'Kashyap',
  'Thapa': 'Atreya',
  'Timalsena': 'Maudgalya'
}

// Gotra information
const gotraInfo = {
  'Bharadwaj': 'One of the seven great sages (Saptarishi). Known for wisdom and learning.',
  'Kashyap': 'Ancient sage, considered the father of all living beings in some texts.',
  'Vashishtha': 'Royal guru of the Raghu dynasty, known for spiritual power.',
  'Atreya': 'Great physician sage, father of Ayurveda.',
  'Kaudinya': 'First disciple of Buddha, represents enlightenment.',
  'Gautam': 'Sage known for penning important religious texts.',
  'Kaushika': 'Originally a Kshatriya who became a Brahmin through penance.',
  'Garga': 'Court astrologer of King Nanda, expert in astronomy.',
  'Mandavya': 'Sage known for his truthfulness and justice.',
  'Maudgalya': 'Descendant of sage Mudgala, known for righteousness.',
  'Dhananjaya': 'Represents prosperity and victory.',
  'Upamanyu': 'Student of Ayoda-Dhaumya, known for devotion.',
  'Vatsa': 'Ancient sage lineage, associated with prosperity.',
  'Vishwamitra': 'Great sage who rose from Kshatriya to Brahmin status.',
  'Shandilya': 'Known for devotional practices and spiritual texts.',
  'Parashara': 'Father of Ved Vyasa, author of many Puranas.',
  'Ghritakaushika': 'Sub-lineage of Kaushika, known for ritual knowledge.',
  'Bhargava': 'Descendant of sage Bhrigu, known for astrological knowledge.',
  'Angirasa': 'One of the Saptarishi, associated with fire sacrifices.'
}

// Watch for surname changes and detect gotra
watch(() => person1.value.surname, (newSurname) => {
  person1.value.detectedGotra = surnameToGotraMap[newSurname] || ''
})

watch(() => person2.value.surname, (newSurname) => {
  person2.value.detectedGotra = surnameToGotraMap[newSurname] || ''
})

const compatibleResults = [
  {
    status: 'compatible',
    title: '✅ Aunty Approval Secured!',
    message: 'Different gotras confirmed! The family WhatsApp group can celebrate.',
    advice: 'Time to start planning that wedding everyone has been waiting for.',
    familyReaction: 'Your mother is already calculating jewelry costs and guest lists.',
    riskLevel: 'Low Drama',
    riskColor: 'text-green-600'
  },
  {
    status: 'compatible',
    title: '💚 Traditionally Blessed Match',
    message: 'Your gotras are perfectly compatible according to ancient traditions.',
    advice: 'Perfect! Now you just need to worry about whose cooking is better.',
    familyReaction: 'Aunties are already discussing which astrologer to consult for the wedding date.',
    riskLevel: 'Minimal Gossip',
    riskColor: 'text-green-700'
  },
  {
    status: 'compatible',
    title: '🎉 Village Elder Approved',
    message: 'Different ancestral lineages detected! Even the most traditional families will approve.',
    advice: 'Congratulations! Now the real challenge: agreeing on dal-bhat vs pizza for dinner.',
    familyReaction: 'Your grandfather is nodding approvingly and sharing stories of his own wedding.',
    riskLevel: 'Zero Controversy',
    riskColor: 'text-green-500'
  }
]

const incompatibleResults = [
  {
    status: 'incompatible',
    title: '🚨 FAMILY EMERGENCY DECLARED',
    message: 'Same gotra detected! The village elders have been notified.',
    advice: 'Prepare for family meetings, concerned phone calls, and possible interventions.',
    familyReaction: 'Your mother has called three aunties and they\'re planning a strategy meeting.',
    riskLevel: 'High Drama Alert',
    riskColor: 'text-red-600'
  },
  {
    status: 'incompatible',
    title: '💥 Ancestral Alarm Activated',
    message: 'Same gotra means same Rishi lineage. The ancestors are not pleased.',
    advice: 'Consider moving to a different district. Or planet.',
    familyReaction: 'The family group chat has more activity than a political rally.',
    riskLevel: 'Maximum Scandal',
    riskColor: 'text-red-700'
  },
  {
    status: 'incompatible',
    title: '⚠️ Traditional Code Red',
    message: 'Same gotra marriage detected! This will be discussed in seven villages.',
    advice: 'Time to either find a family historian who says you\'re wrong, or learn to love long-distance relationships.',
    familyReaction: 'Distant relatives are emerging from retirement to share their opinions.',
    riskLevel: 'Cultural Crisis',
    riskColor: 'text-red-500'
  }
]

const uncertainResults = [
  {
    status: 'uncertain',
    title: '🤔 Database Confusion Detected',
    message: 'One or both surnames not found in our gotra database. Manual investigation required.',
    advice: 'Time to call that uncle who knows everyone\'s family history back to 1850.',
    familyReaction: 'Three different aunties are now arguing about the correct family lineage.',
    riskLevel: 'Research Needed',
    riskColor: 'text-yellow-600'
  },
  {
    status: 'uncertain',
    title: '📚 Genealogy Investigation Required',
    message: 'Surname(s) not recognized. Could be regional variation or modern spelling.',
    advice: 'Consult the village pundit or that relative who maintains detailed family records.',
    familyReaction: 'The family is now split into research committees trying to trace your lineage.',
    riskLevel: 'Documentation Hunt',
    riskColor: 'text-yellow-500'
  }
]

const checkCompatibility = () => {
  isChecking.value = true
  
  setTimeout(() => {
    const gotra1 = person1.value.detectedGotra
    const gotra2 = person2.value.detectedGotra
    
    let selectedResult
    
    if (!gotra1 || !gotra2) {
      selectedResult = uncertainResults[Math.floor(Math.random() * uncertainResults.length)]
    } else if (gotra1 === gotra2) {
      selectedResult = incompatibleResults[Math.floor(Math.random() * incompatibleResults.length)]
    } else {
      selectedResult = compatibleResults[Math.floor(Math.random() * compatibleResults.length)]
    }
    
    result.value = selectedResult
    isChecking.value = false
  }, 3000)
}

const resetChecker = () => {
  person1.value = { firstName: '', surname: '', detectedGotra: '' }
  person2.value = { firstName: '', surname: '', detectedGotra: '' }
  result.value = null
  showGotraInfo.value = false
}

const getGotraInfo = (gotra) => {
  return gotraInfo[gotra] || 'Ancient sage lineage with rich spiritual heritage.'
}
</script>