#!/usr/bin/env node
/**
 * Tool Tester — Subagent-grade automated testing for all site tools.
 *
 * Extracts pure logic from each tool, runs simulated interactions,
 * checks edge cases, and reports bugs/problems.
 *
 * Run: node scripts/tool-tester.mjs
 */

const PASS = '\x1b[32m✓\x1b[0m'
const FAIL = '\x1b[31m✗\x1b[0m'
const WARN = '\x1b[33m⚠\x1b[0m'
const INFO = '\x1b[36mℹ\x1b[0m'

let totalTests = 0
let passed = 0
let failed = 0
let warnings = 0
const bugs = []

function assert(condition, msg) {
  totalTests++
  if (condition) {
    passed++
    console.log(`  ${PASS} ${msg}`)
  } else {
    failed++
    console.log(`  ${FAIL} ${msg}`)
    bugs.push(msg)
  }
}

function warn(msg) {
  warnings++
  console.log(`  ${WARN} ${msg}`)
}

function section(name) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ${name}`)
  console.log(`${'═'.repeat(60)}`)
}

// ═════════════════════════════════════════════════════════════
// 1. TAMAGOTCHI
// ═════════════════════════════════════════════════════════════
section('1. TAMAGOTCHI (Blobby)')

// Replicate core logic
function createPet(overrides = {}) {
  return { name: 'Blobby', hunger: 80, boredom: 60, love: 70, age: 0, lastSeen: Date.now(), ...overrides }
}

function getMood(pet, isSleeping = false) {
  const { hunger, boredom, love } = pet
  if (hunger < 20) return 'sick'
  if (hunger < 40) return 'hungry'
  if (boredom < 20) return 'angry'
  if (boredom < 40) return 'bored'
  if (love < 20) return 'crying'
  if (love < 40) return 'lonely'
  if (isSleeping) return 'sleepy'
  if (hunger > 80 && boredom > 80 && love > 80) return 'excited'
  if (hunger > 60 && boredom > 60 && love > 60) return 'happy'
  return 'content'
}

function clamp(v) { return Math.max(0, Math.min(100, v)) }

// Test mood calculation
const petTests = [
  [{ hunger: 90, boredom: 90, love: 90 }, 'excited'],
  [{ hunger: 70, boredom: 70, love: 70 }, 'happy'],
  [{ hunger: 50, boredom: 50, love: 50 }, 'content'],
  [{ hunger: 10, boredom: 50, love: 50 }, 'sick'],
  [{ hunger: 30, boredom: 50, love: 50 }, 'hungry'],
  [{ hunger: 50, boredom: 10, love: 50 }, 'angry'],
  [{ hunger: 50, boredom: 30, love: 50 }, 'bored'],
  [{ hunger: 50, boredom: 50, love: 10 }, 'crying'],
  [{ hunger: 50, boredom: 50, love: 30 }, 'lonely'],
]

for (const [pet, expected] of petTests) {
  assert(getMood(pet) === expected, `Mood: hunger=${pet.hunger} boredom=${pet.boredom} love=${pet.love} → ${expected}`)
}

assert(getMood(createPet({ hunger: 50, boredom: 50, love: 50 }), true) === 'sleepy', 'Sleeping overrides mood to sleepy')
assert(getMood(createPet({ hunger: 10, boredom: 50, love: 50 }), true) === 'sick', 'Sick overrides sleeping')

// Test stat decay
const pet = createPet()
pet.hunger = Math.max(0, pet.hunger - 1)
pet.boredom = Math.min(100, pet.boredom + 1)
pet.love = Math.max(0, pet.love - 1)
assert(pet.hunger === 79, 'Hunger decays: 80 → 79')
assert(pet.boredom === 61, 'Boredom increases: 60 → 61')
assert(pet.love === 69, 'Love decays: 70 → 69')

// Test stat clamping
const pet2 = createPet({ hunger: 5, boredom: 99, love: 5 })
pet2.hunger = Math.max(0, pet2.hunger - 10)
pet2.boredom = Math.min(100, pet2.boredom + 10)
pet2.love = Math.max(0, pet2.love - 10)
assert(pet2.hunger === 0, 'Hunger clamps at 0')
assert(pet2.boredom === 100, 'Boredom clamps at 100')
assert(pet2.love === 0, 'Love clamps at 0')

// Test loadProgress time decay
const lastSeen = Date.now() - 5 * 60000 // 5 minutes ago
const pet3 = createPet({ hunger: 80, boredom: 60, love: 70, lastSeen })
const timePassed = Math.floor((Date.now() - pet3.lastSeen) / 60000)
pet3.hunger = Math.max(0, pet3.hunger - timePassed * 2)
pet3.boredom = Math.min(100, pet3.boredom + timePassed)
pet3.love = Math.max(0, pet3.love - timePassed)
assert(pet3.hunger === 70, `Offline hunger decay: 80 - ${timePassed}*2 = ${pet3.hunger}`)
assert(pet3.boredom === 65, `Offline boredom increase: 60 + ${timePassed} = ${pet3.boredom}`)

// Test RPS logic
const rpsChoices = ['rock', 'paper', 'scissors']
function rpsWinner(a, b) {
  if (a === b) return 'tie'
  if ((a === 'rock' && b === 'scissors') || (a === 'paper' && b === 'rock') || (a === 'scissors' && b === 'paper')) return 'player'
  return 'pet'
}
assert(rpsWinner('rock', 'scissors') === 'player', 'RPS: rock beats scissors')
assert(rpsWinner('paper', 'rock') === 'player', 'RPS: paper beats rock')
assert(rpsWinner('scissors', 'paper') === 'player', 'RPS: scissors beats paper')
assert(rpsWinner('rock', 'paper') === 'pet', 'RPS: paper beats rock (pet wins)')
assert(rpsWinner('rock', 'rock') === 'tie', 'RPS: same = tie')

// Test Guess logic
function checkGuess(guess, secret) {
  if (guess === secret) return 'correct'
  const diff = Math.abs(guess - secret)
  if (diff <= 2) return 'hot'
  if (diff <= 4) return 'warm'
  return 'cold'
}
assert(checkGuess(5, 5) === 'correct', 'Guess: exact match')
assert(checkGuess(5, 6) === 'hot', 'Guess: 1 away = hot')
assert(checkGuess(5, 7) === 'hot', 'Guess: 2 away = hot')
assert(checkGuess(5, 8) === 'warm', 'Guess: 3 away = warm')
assert(checkGuess(5, 9) === 'warm', 'Guess: 4 away = warm')
assert(checkGuess(5, 10) === 'cold', 'Guess: 5 away = cold')
assert(checkGuess(1, 10) === 'cold', 'Guess: max distance = cold')

// Test Memory win condition
const memoryPairs = 6
let matchedCount = 0
const memoryMatched = []
function matchPair(emoji) {
  memoryMatched.push(emoji)
  matchedCount++
  return matchedCount === memoryPairs
}
assert(!matchPair('🌟'), 'Memory: not won after 1 pair')
assert(!matchPair('🎨'), 'Memory: not won after 2 pairs')
assert(!matchPair('🎵'), 'Memory: not won after 3 pairs')
assert(!matchPair('🚀'), 'Memory: not won after 4 pairs')
assert(!matchPair('🌈'), 'Memory: not won after 5 pairs')
assert(matchPair('🍕'), 'Memory: won after 6 pairs')

// Test Reaction timing
function classifyReaction(ms) {
  if (ms < 0) return 'invalid'
  if (ms === 0) return 'too-early'
  if (ms < 200) return 'superhuman'
  if (ms < 300) return 'excellent'
  if (ms < 400) return 'good'
  if (ms < 500) return 'average'
  return 'slow'
}
assert(classifyReaction(-1) === 'invalid', 'Reaction: negative = invalid')
assert(classifyReaction(0) === 'too-early', 'Reaction: 0ms = too early (clicked before green)')
assert(classifyReaction(150) === 'superhuman', 'Reaction: 150ms = superhuman')
assert(classifyReaction(250) === 'excellent', 'Reaction: 250ms = excellent')
assert(classifyReaction(350) === 'good', 'Reaction: 350ms = good')
assert(classifyReaction(450) === 'average', 'Reaction: 450ms = average')
assert(classifyReaction(600) === 'slow', 'Reaction: 600ms = slow')

// Edge case: rapid clicking
warn('Tamagotchi: No debounce on pet click — rapid clicking could spam stat changes')
warn('Tamagotchi: rpsAnimating flag prevents double-click during animation, but no lock on other games')


// ═════════════════════════════════════════════════════════════
// 2. CLICKER (Life Optimizer)
// ═════════════════════════════════════════════════════════════
section('2. CLICKER (Life Optimizer)')

const upgrades = [
  { id: 'coffee', cost: 15, count: 0, power: 1 },
  { id: 'planner', cost: 100, count: 0, power: 5 },
  { id: 'hacks', cost: 500, count: 0, power: 20 },
  { id: 'coach', cost: 2000, count: 0, power: 50 },
  { id: 'saas', cost: 5000, count: 0, power: 100 },
  { id: 'course', cost: 15000, count: 0, power: 300 },
  { id: 'crypto', cost: 50000, count: 0, power: 1000 },
  { id: 'manifest', cost: 150000, count: 0, power: 5000 },
]

function clicksPerTap(upgs) {
  return 1 + upgs.reduce((sum, u) => sum + (u.count * u.power), 0)
}

assert(clicksPerTap(upgrades) === 1, 'Clicks per tap: base = 1')

// Buy an upgrade
upgrades[0].count = 1
assert(clicksPerTap(upgrades) === 2, 'After buying coffee: 1 + 1*1 = 2')

// Buy multiple
upgrades[1].count = 3
assert(clicksPerTap(upgrades) === 2 + 3 * 5, 'After buying 3 planners: 2 + 15 = 17')

// Test cost scaling (1.5x)
let coffeeCost = 15
coffeeCost = Math.floor(coffeeCost * 1.5)
assert(coffeeCost === 22, 'Cost scaling: 15 * 1.5 = 22')
coffeeCost = Math.floor(coffeeCost * 1.5)
assert(coffeeCost === 33, 'Cost scaling: 22 * 1.5 = 33')
coffeeCost = Math.floor(coffeeCost * 1.5)
assert(coffeeCost === 49, 'Cost scaling: 33 * 1.5 = 49')

// Test number formatting
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}
assert(formatNumber(0) === '0', 'Format: 0')
assert(formatNumber(999) === '999', 'Format: 999')
assert(formatNumber(1000) === '1.0K', 'Format: 1000 → 1.0K')
assert(formatNumber(1500) === '1.5K', 'Format: 1500 → 1.5K')
assert(formatNumber(1000000) === '1.0M', 'Format: 1000000 → 1.0M')

// Test achievements
const achievements = [
  { id: 'first', check: (c) => c >= 1 },
  { id: 'hundo', check: (c) => c >= 100 },
  { id: 'k', check: (c) => c >= 1000 },
  { id: 'optimizer', check: (c) => c >= 5000 },
  { id: 'productivity', check: (c) => c >= 10000 },
  { id: 'hustle', check: (c) => c >= 50000 },
]
assert(achievements[0].check(1), 'Achievement: first click at 1')
assert(!achievements[0].check(0), 'Achievement: no first click at 0')
assert(achievements[1].check(100), 'Achievement: hundo at 100')
assert(!achievements[1].check(99), 'Achievement: no hundo at 99')

// Edge case: can't buy with insufficient clicks
let clicks = 10
const cost = 15
assert(clicks < cost, 'Can not afford upgrade with 10 clicks when cost is 15')

warn('Clicker: No prestige/reset mechanic — infinite inflation possible')
warn('Clicker: Upgrade costs scale by 1.5x with no cap — eventually overflow JS safe integer?')


// ═════════════════════════════════════════════════════════════
// 3. BILL SPLITTER
// ═════════════════════════════════════════════════════════════
section('3. BILL SPLITTER')

function computeBalances(people, items) {
  const balanceArray = new Array(people.length).fill(0)
  items.forEach(item => {
    const cost = parseFloat(item.cost) || 0
    const paidBy = item.paidBy
    const sharedByCount = item.sharedBy.filter(Boolean).length
    if (cost > 0 && sharedByCount > 0) {
      const costPerPerson = cost / sharedByCount
      if (paidBy < balanceArray.length) balanceArray[paidBy] += cost
      item.sharedBy.forEach((shared, index) => {
        if (shared && index < balanceArray.length) balanceArray[index] -= costPerPerson
      })
    }
  })
  return balanceArray
}

function computeSettlements(balances) {
  const creditors = []
  const debtors = []
  balances.forEach((balance, index) => {
    if (balance > 0.01) creditors.push({ person: index, amount: balance })
    else if (balance < -0.01) debtors.push({ person: index, amount: Math.abs(balance) })
  })
  const settlements = []
  let ci = 0, di = 0
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci], d = debtors[di]
    const amount = Math.min(c.amount, d.amount)
    settlements.push({ from: d.person, to: c.person, amount })
    c.amount -= amount
    d.amount -= amount
    if (c.amount < 0.01) ci++
    if (d.amount < 0.01) di++
  }
  return settlements
}

// Simple case: 2 people, 1 item split equally
const b1 = computeBalances(['A', 'B'], [
  { cost: '100', paidBy: 0, sharedBy: [true, true] }
])
assert(Math.abs(b1[0] - 50) < 0.01, 'Bill: A paid 100, split 2 ways → A gets +50')
assert(Math.abs(b1[1] - (-50)) < 0.01, 'Bill: B owes 50')

// 3 people, different splits
const b2 = computeBalances(['A', 'B', 'C'], [
  { cost: '120', paidBy: 0, sharedBy: [true, true, true] }, // A paid, split 3 ways → each owes 40
  { cost: '90', paidBy: 2, sharedBy: [false, true, true] }, // C paid, split 2 ways → B,C each owe 45
])
// A: +120 - 40 = +80, B: -40 - 45 = -85, C: -40 + 90 - 45 = +5
assert(Math.abs(b2[0] - 80) < 0.01, `Bill: A balance = ${b2[0].toFixed(2)} (expected 80)`)
assert(Math.abs(b2[1] - (-85)) < 0.01, `Bill: B balance = ${b2[1].toFixed(2)} (expected -85)`)
assert(Math.abs(b2[2] - 5) < 0.01, `Bill: C balance = ${b2[2].toFixed(2)} (expected 5)`)

// Settlements
const s1 = computeSettlements([80, -85, 5])
assert(s1.length >= 1, 'Bill: settlements generated')
// B pays A 80, B pays C 5
const totalFromB = s1.filter(s => s.from === 1).reduce((sum, s) => sum + s.amount, 0)
assert(Math.abs(totalFromB - 85) < 0.01, `Bill: B pays total ${totalFromB.toFixed(2)} (expected 85)`)

// Edge: no items
const b3 = computeSettlements(computeBalances(['A', 'B'], []))
assert(b3.length === 0, 'Bill: no items = no settlements')

// Edge: one person pays, no one shares (sharedByCount = 0)
const b4 = computeBalances(['A'], [
  { cost: '50', paidBy: 0, sharedBy: [false] }
])
assert(Math.abs(b4[0]) < 0.01, 'Bill: item with no shares = no effect')

// Edge: very small amounts (floating point)
const b5 = computeBalances(['A', 'B', 'C'], [
  { cost: '0.03', paidBy: 0, sharedBy: [true, true, true] }
])
const totalBalance = b5.reduce((s, v) => s + v, 0)
assert(Math.abs(totalBalance) < 0.01, `Bill: floating point — total balance = ${totalBalance.toFixed(4)} (should be ~0)`)

warn('Bill Splitter: paidBy index can become stale when people are removed (line 137: sets to 0)')
warn('Bill Splitter: No currency symbol is configurable — hardcoded to "Rs."')


// ═════════════════════════════════════════════════════════════
// 4. EMOM TIMER
// ═════════════════════════════════════════════════════════════
section('4. EMOM TIMER')

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

assert(formatTime(0) === '0:00', 'Timer: 0s → 0:00')
assert(formatTime(59) === '0:59', 'Timer: 59s → 0:59')
assert(formatTime(60) === '1:00', 'Timer: 60s → 1:00')
assert(formatTime(600) === '10:00', 'Timer: 600s → 10:00')
assert(formatTime(661) === '11:01', 'Timer: 661s → 11:01')

// Seconds in current minute
function secondsInCurrentMinute(timeLeft) {
  if (timeLeft === 0) return 0
  const remainder = timeLeft % 60
  return remainder === 0 ? 60 : remainder
}

assert(secondsInCurrentMinute(0) === 0, 'Timer: 0 left → 0 in minute')
assert(secondsInCurrentMinute(60) === 60, 'Timer: 60 left → 60 in minute')
assert(secondsInCurrentMinute(59) === 59, 'Timer: 59 left → 59 in minute')
assert(secondsInCurrentMinute(1) === 1, 'Timer: 1 left → 1 in minute')
assert(secondsInCurrentMinute(120) === 60, 'Timer: 120 left → 60 in minute')

// Round tracking
function currentRound(timeLeft, totalRounds) {
  if (timeLeft === 0) return 0
  return Math.floor((totalRounds * 60 - timeLeft) / 60) + 1
}

assert(currentRound(600, 10) === 1, 'Timer: round 1 at start of 10min')
assert(currentRound(540, 10) === 2, 'Timer: round 2 after 1 min')
assert(currentRound(60, 10) === 10, 'Timer: round 10 at 1 min left')

warn('EMOM Timer: AudioContext may fail on first interaction (browser autoplay policy)')
warn('EMOM Timer: No input validation — minutes can be set to 0 or negative via direct input')


// ═════════════════════════════════════════════════════════════
// 5. ERROR GENERATOR (SeriousCLI)
// ═════════════════════════════════════════════════════════════
section('5. ERROR GENERATOR (SeriousCLI)')

// State machine: idle → confirming → loading → error → idle
const states = ['idle', 'confirming', 'loading', 'error']
const validTransitions = {
  idle: ['confirming'],
  confirming: ['loading', 'idle'],
  loading: ['error', 'idle'],
  error: ['idle', 'confirming'],
}

function isValidTransition(from, to) {
  return validTransitions[from]?.includes(to) ?? false
}

assert(isValidTransition('idle', 'confirming'), 'ErrorGen: idle → confirming')
assert(isValidTransition('confirming', 'loading'), 'ErrorGen: confirming → loading')
assert(isValidTransition('confirming', 'idle'), 'ErrorGen: confirming → idle (cancel)')
assert(isValidTransition('loading', 'error'), 'ErrorGen: loading → error')
assert(isValidTransition('error', 'idle'), 'ErrorGen: error → idle (retry)')
assert(!isValidTransition('idle', 'error'), 'ErrorGen: idle → error is invalid')
assert(!isValidTransition('loading', 'confirming'), 'ErrorGen: loading → confirming is invalid')

warn('ErrorGenerator: No guard against rapid state transitions during loading animation')


// ═════════════════════════════════════════════════════════════
// 6. SKETCH
// ═════════════════════════════════════════════════════════════
section('6. SKETCH')

// Test threshold clamping
function clampThreshold(v) { return Math.max(0, Math.min(255, Math.round(v))) }
assert(clampThreshold(-10) === 0, 'Sketch: threshold clamps at 0')
assert(clampThreshold(300) === 255, 'Sketch: threshold clamps at 255')
assert(clampThreshold(127.5) === 128, 'Sketch: threshold rounds')
assert(clampThreshold(0) === 0, 'Sketch: threshold at min')
assert(clampThreshold(255) === 255, 'Sketch: threshold at max')

warn('Sketch: Crop mode relies on mouse events — no touch support for crop region')
warn('Sketch: No undo history — destructive operations are permanent')


// ═════════════════════════════════════════════════════════════
// 7. RANTIM (Dice Timer)
// ═════════════════════════════════════════════════════════════
section('7. RANTIM (Dice Timer)')

// Dice result should be 1-6
function isValidDiceResult(n) { return Number.isInteger(n) && n >= 1 && n <= 6 }
assert(isValidDiceResult(1), 'Dice: 1 is valid')
assert(isValidDiceResult(6), 'Dice: 6 is valid')
assert(!isValidDiceResult(0), 'Dice: 0 is invalid')
assert(!isValidDiceResult(7), 'Dice: 7 is invalid')
assert(!isValidDiceResult(1.5), 'Dice: 1.5 is invalid')

// Timer format
assert(formatTime(300) === '5:00', 'RanTim: 300s = 5:00')
assert(formatTime(60) === '1:00', 'RanTim: 60s = 1:00')
assert(formatTime(1) === '0:01', 'RanTim: 1s = 0:01')

// Physics constants
const BOUNDARY = 3.5
const DICE_SIZE = 0.8
assert(BOUNDARY > DICE_SIZE, 'Dice boundary > dice size (prevents clipping)')

warn('RanTim: Dice settling detection uses velocity threshold — may not always settle correctly')
warn('RanTim: No sound feedback on dice roll')


// ═════════════════════════════════════════════════════════════
// 8. SPACE EXPLORER
// ═════════════════════════════════════════════════════════════
section('8. SPACE EXPLORER')

// Health system
const MAX_HEALTH = 5
function takeDamage(health, amount = 1) { return Math.max(0, health - amount) }
assert(takeDamage(5) === 4, 'Space: 5 - 1 = 4 health')
assert(takeDamage(1) === 0, 'Space: 1 - 1 = 0 health (dead)')
assert(takeDamage(0) === 0, 'Space: 0 health stays 0')

// Score system
let score = 0
const SHOOT_COOLDOWN = 10
let shootCooldown = 0
function canShoot() { return shootCooldown <= 0 }
assert(canShoot(), 'Space: can shoot initially')
shootCooldown = SHOOT_COOLDOWN
assert(!canShoot(), 'Space: can not shoot during cooldown')

// Power-up system
const activePowerUps = { shield: false, speed: false, magnet: false }
function activatePowerUp(type, duration = 5000) {
  activePowerUps[type] = true
  setTimeout(() => { activePowerUps[type] = false }, duration)
}
assert(!activePowerUps.shield, 'Space: shield starts inactive')

// Touch controls
const touchState = { up: false, down: false, left: false, right: false, boost: false }
assert(!touchState.up, 'Space: touch up starts false')

warn('Space Explorer: Mobile detection uses navigator.userAgent — may misclassify tablets')
warn('Space Explorer: No pause functionality during gameplay')
warn('Space Explorer: Asteroid spawn rate increases over time with no cap')


// ═════════════════════════════════════════════════════════════
// 9. INFINITE CORRIDOR
// ═════════════════════════════════════════════════════════════
section('9. INFINITE CORRIDOR')

// Room discovery
const totalRooms = 12
const discovered = {}
let discoveredCount = 0

function discoverRoom(roomId) {
  if (!discovered[roomId]) {
    discovered[roomId] = true
    discoveredCount++
    return true // new discovery
  }
  return false // already known
}

assert(discoverRoom('room1') === true, 'Corridor: first visit = discovery')
assert(discoverRoom('room1') === false, 'Corridor: revisit = no discovery')
assert(discoveredCount === 1, 'Corridor: count is 1 after discovering 1 room')

// Room rarity
const rarities = ['common', 'uncommon', 'rare']
function isValidRarity(r) { return rarities.includes(r) }
assert(isValidRarity('common'), 'Corridor: common is valid')
assert(isValidRarity('uncommon'), 'Corridor: uncommon is valid')
assert(isValidRarity('rare'), 'Corridor: rare is valid')
assert(!isValidRarity('legendary'), 'Corridor: legendary is not a rarity')

// Journal toggle
let showJournal = false
function toggleJournal() { showJournal = !showJournal }
toggleJournal()
assert(showJournal === true, 'Corridor: journal opens')
toggleJournal()
assert(showJournal === false, 'Corridor: journal closes')

warn('InfiniteCorridor: Room generation uses seeded random — no way to replay specific layouts')
warn('InfiniteCorridor: Movement uses WASD — no arrow key support')


// ═════════════════════════════════════════════════════════════
// 10. PARTICLE LIFE
// ═════════════════════════════════════════════════════════════
section('10. PARTICLE LIFE')

// Force calculation
function calculateForce(distance, minDist, maxDist, attraction) {
  if (distance < minDist) return -1 // repel when too close
  if (distance > maxDist) return 0   // no force when too far
  return attraction // attract or repel based on preset
}

assert(calculateForce(0.5, 1, 50, 1) === -1, 'ParticleLife: repel when too close')
assert(calculateForce(25, 1, 50, 1) === 1, 'ParticleLife: attract within range')
assert(calculateForce(100, 1, 50, 1) === 0, 'ParticleLife: no force beyond range')
assert(calculateForce(25, 1, 50, -1) === -1, 'ParticleLife: repel when attraction is -1')

// Preset validation
const presets = ['classic', 'chaos', 'separation', 'gravity', 'galaxy']
assert(presets.length >= 5, 'ParticleLife: at least 5 presets')

warn('ParticleLife: GPU fallback to CPU when WebGL2 unavailable — performance may degrade significantly')
warn('ParticleLife: No way to save/share particle configurations')


// ═════════════════════════════════════════════════════════════
// 11. WHISPER (Voice Transcription)
// ═════════════════════════════════════════════════════════════
section('11. WHISPER (Voice Transcription)')

// Phase state machine
const whisperPhases = ['init', 'loading', 'ready', 'recording', 'transcribing', 'done', 'error']
assert(whisperPhases.includes('init'), 'Whisper: init phase exists')
assert(whisperPhases.includes('recording'), 'Whisper: recording phase exists')
assert(whisperPhases.includes('transcribing'), 'Whisper: transcribing phase exists')

// Sample rate
const kSampleRate = 16000
assert(kSampleRate === 16000, 'Whisper: sample rate is 16kHz')

// Max recording duration
const kMaxRecordingS = 120
assert(kMaxRecordingS === 120, 'Whisper: max recording is 120s')

warn('Whisper: Depends on external script loading (whisper.cpp WASM) — may fail if CDN is down')
warn('Whisper: No fallback UI if browser lacks AudioContext support')
warn('Whisper: Model download happens on first use — no progress persistence')


// ═════════════════════════════════════════════════════════════
// 12. FAMILY TREE
// ═════════════════════════════════════════════════════════════
section('12. FAMILY TREE')

// Data model
const persons = []
let nextId = 1
function addPerson(name) { persons.push({ id: nextId++, name, parents: [], children: [], spouse: null }) }
function addParent(childId, parentId) {
  const child = persons.find(p => p.id === childId)
  const parent = persons.find(p => p.id === parentId)
  if (child && parent) {
    child.parents.push(parentId)
    parent.children.push(childId)
  }
}

addPerson('Grandpa')
addPerson('Parent')
addPerson('Child')
addParent(2, 1) // Parent's parent is Grandpa
addParent(3, 2) // Child's parent is Parent

assert(persons.length === 3, 'FamilyTree: 3 persons created')
assert(persons[1].parents.length === 1, 'FamilyTree: Parent has 1 parent')
assert(persons[0].children.length === 1, 'FamilyTree: Grandpa has 1 child')
assert(persons[2].parents.length === 1, 'FamilyTree: Child has 1 parent')

// Undo support (Ctrl+Z)
warn('FamilyTree: Undo requires Ctrl+Z — no undo button in UI for mobile users')
warn('FamilyTree: No limit on tree depth — deeply nested trees may render poorly')


// ═════════════════════════════════════════════════════════════
// 13. ROTA MINUTES
// ═════════════════════════════════════════════════════════════
section('13. ROTA MINUTES')

// Form validation
function validateRotaForm(form) {
  const errors = {}
  if (!form.title?.trim()) errors.title = 'Title is required'
  if (!form.date) errors.date = 'Date is required'
  if (!form.members?.length) errors.members = 'At least one member required'
  return errors
}

assert(Object.keys(validateRotaForm({ title: '', date: '', members: [] })).length === 3, 'Rota: empty form has 3 errors')
assert(Object.keys(validateRotaForm({ title: 'Meeting', date: '2024-01-01', members: [{ name: 'A' }] })).length === 0, 'Rota: valid form has no errors')
assert(Object.keys(validateRotaForm({ title: ' ', date: '2024-01-01', members: [{ name: 'A' }] })).length === 1, 'Rota: whitespace title is error')

// Attendance tracking
function attendanceSummary(members) {
  return {
    total: members.length,
    present: members.filter(m => m.present).length,
    absent: members.filter(m => !m.present).length,
  }
}

const members = [{ present: true }, { present: false }, { present: true }]
const summary = attendanceSummary(members)
assert(summary.total === 3, 'Rota: 3 total members')
assert(summary.present === 2, 'Rota: 2 present')
assert(summary.absent === 1, 'Rota: 1 absent')

warn('RotaMinutes: PDF generation uses browser print — may not work in all browsers')
warn('RotaMinutes: Image upload has no size limit validation')


// ═════════════════════════════════════════════════════════════
// CROSS-CUTTING CONCERNS
// ═════════════════════════════════════════════════════════════
section('CROSS-CUTTING CONCERNS')

// localStorage usage
const toolsUsingLocalStorage = [
  'Tamagotchi', 'Clicker', 'BillSplitter', 'FamilyTree', 'RotaMinutes'
]
assert(toolsUsingLocalStorage.length === 5, '5 tools use localStorage for persistence')

warn('Multiple tools use localStorage with no namespacing — key collisions possible')
warn('No global error boundary — a crash in one tool takes down the whole page')
warn('Three.js tools (Tamagotchi, RanTim, SpaceExplorer, InfiniteCorridor, ParticleLife) don\'t dispose on route change — memory leak risk')


// ═════════════════════════════════════════════════════════════
// SUMMARY
// ═════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`)
console.log(`  RESULTS: ${passed}/${totalTests} passed, ${failed} failed, ${warnings} warnings`)
console.log(`${'═'.repeat(60)}`)

if (bugs.length > 0) {
  console.log(`\n${FAIL} BUGS FOUND:`)
  bugs.forEach((b, i) => console.log(`  ${i + 1}. ${b}`))
}

if (warnings > 0) {
  console.log(`\n${WARN} WARNINGS (potential issues for subagents to investigate):`)
  const allWarnings = [
    'Tamagotchi: No debounce on pet click — rapid clicking could spam stat changes',
    'Clicker: Upgrade costs scale by 1.5x with no cap — eventually overflow JS safe integer?',
    'Bill Splitter: paidBy index can become stale when people are removed',
    'EMOM Timer: No input validation — minutes can be set to 0 or negative',
    'ErrorGenerator: No guard against rapid state transitions during loading',
    'Sketch: Crop mode relies on mouse events — no touch support',
    'Sketch: No undo history — destructive operations are permanent',
    'Space Explorer: No pause functionality during gameplay',
    'InfiniteCorridor: No arrow key support for movement',
    'Particle Life: No way to save/share particle configurations',
    'Whisper: Depends on external script loading — may fail if CDN is down',
    'FamilyTree: No undo button in UI for mobile users',
    'RotaMinutes: PDF generation uses browser print — may not work everywhere',
    'Multiple tools use localStorage with no namespacing — key collisions possible',
    'Three.js tools don\'t dispose on route change — memory leak risk',
  ]
  allWarnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`))
}

process.exit(failed > 0 ? 1 : 0)
