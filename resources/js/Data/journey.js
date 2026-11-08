// Dulna Jaam — homepage walk chapters.
//
// The walk is now a short, escapable intro: five chapters, each a real part of
// the site with a plain-language label and a destination link. `scene` maps to a
// landmark in StopScene.vue and `id` maps to the stop component rendered inside
// the chapter paper (see HeroJourney.vue).
export const chapters = [
  {
    id: 'ghar',
    scene: 'ghar',
    label: 'Ghar',
    sub: 'the courtyard',
    hint: 'Start here',
    href: '/about',
    cta: 'About',
  },
  {
    id: 'writing',
    scene: 'writing',
    label: 'Pustak Pasal',
    sub: 'the bookstall',
    hint: 'Writing & books',
    href: '/posts',
    cta: 'Writing',
  },
  {
    id: 'graph',
    scene: 'graph',
    label: 'Bari',
    sub: 'the garden of maps',
    hint: 'The knowledge graph',
    href: '/graph',
    cta: 'Graph',
  },
  {
    id: 'tools',
    scene: 'tools',
    label: 'Bazaar',
    sub: 'the gadget stalls',
    hint: 'Tools & toys',
    href: '/tools',
    cta: 'Tools',
  },
  {
    id: 'night',
    scene: 'night',
    label: 'Swayambhu',
    sub: 'the overlook',
    hint: 'Now & hello',
    href: '/now',
    cta: 'Now',
  },
]

export const mascotQuips = [
  'Chiya first. Code after.',
  'This way, saathi.',
  'I smell momo.',
  'Are we there yet?',
  'I have walked 4 km. I deserve a treat.',
  'Mind the wires.',
  'That stupa is older than both of us.',
  'Bholi bhetaula — see you tomorrow.',
  'No, I will not fetch. I am a thinker.',
]

export const featuredTools = [
  {
    title: 'Blobby',
    blurb: 'A jelly pet who lives in your browser and remembers you.',
    href: '/tools/tamagotchi',
    accent: 'mint',
  },
  {
    title: 'SeriousCLI',
    blurb: 'An error generator for developers who miss the fear.',
    href: '/tools/error-generator',
    accent: 'mustard',
  },
  {
    title: 'The Infinite Corridor',
    blurb: 'A liminal 3D hallway of doors, rooms and small discoveries.',
    href: '/tools/infinite-corridor',
    accent: 'coral',
  },
]

export const socials = [
  { label: 'GitHub', href: 'https://github.com/swapnil-up' },
  { label: 'Slides', href: 'https://slides.swapnilupadhyay.com.np' },
  { label: 'RSS', href: '/feed' },
]
