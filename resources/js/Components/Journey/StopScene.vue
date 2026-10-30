<script setup>
const props = defineProps({
  stop: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
})

const uid = (name) => `lm-${props.stop}-${name}`

const flagPalette = [
  'var(--dj-flag-blue)',
  'var(--dj-flag-white)',
  'var(--dj-flag-red)',
  'var(--dj-flag-green)',
  'var(--dj-flag-yellow)',
]

const gharMarigolds = Array.from({ length: 11 }, (_, index) => ({
  id: index,
  x: 154 + index * 12,
  y: 352 - Math.sin((index / 10) * Math.PI) * 46,
}))

const bookRows = [
  [50, 258, 13, 36, 'var(--lm-brick-lit)'],
  [67, 264, 10, 30, 'var(--dj-flag-blue)'],
  [81, 252, 16, 42, 'var(--lm-paper-lit)'],
  [101, 268, 11, 26, 'var(--dj-flag-yellow)'],
  [116, 256, 14, 38, 'var(--dj-flag-red)'],
  [134, 266, 18, 28, 'var(--lm-leaf)'],
  [156, 250, 11, 44, 'var(--lm-paper)'],
  [171, 262, 15, 32, 'var(--dj-flag-green)'],
  [190, 254, 12, 40, 'var(--dj-flag-blue)'],
  [206, 268, 17, 26, 'var(--lm-brick)'],
  [227, 252, 13, 42, 'var(--dj-flag-yellow)'],
  [244, 264, 16, 30, 'var(--lm-paper-lit)'],
  [264, 250, 11, 44, 'var(--dj-flag-red)'],
  [279, 266, 18, 28, 'var(--lm-leaf)'],
  [301, 256, 13, 38, 'var(--dj-flag-blue)'],
  [318, 266, 15, 28, 'var(--lm-paper)'],
  [337, 252, 12, 42, 'var(--dj-flag-green)'],
  [54, 306, 16, 34, 'var(--dj-flag-yellow)'],
  [74, 312, 11, 28, 'var(--lm-paper-lit)'],
  [89, 300, 14, 40, 'var(--dj-flag-blue)'],
  [107, 310, 18, 30, 'var(--lm-brick-lit)'],
  [129, 304, 12, 36, 'var(--lm-paper)'],
  [145, 314, 16, 26, 'var(--dj-flag-red)'],
  [165, 302, 13, 38, 'var(--dj-flag-green)'],
  [268, 306, 14, 34, 'var(--lm-leaf)'],
  [286, 314, 18, 26, 'var(--lm-paper-lit)'],
  [308, 300, 12, 40, 'var(--dj-flag-yellow)'],
  [324, 310, 16, 30, 'var(--dj-flag-blue)'],
  [344, 304, 13, 36, 'var(--lm-paper)'],
]

const graphNodes = [
  { id: 0, x: 184, y: 286, r: 5 },
  { id: 1, x: 222, y: 252, r: 8 },
  { id: 2, x: 264, y: 224, r: 6 },
  { id: 3, x: 300, y: 268, r: 9 },
  { id: 4, x: 244, y: 308, r: 5 },
  { id: 5, x: 198, y: 330, r: 4 },
  { id: 6, x: 292, y: 326, r: 5 },
]

const graphLinks = [
  [0, 1],
  [0, 4],
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 3],
  [3, 6],
  [4, 5],
  [4, 6],
  [5, 6],
]

function flagRow(count, x0, y0, x1, y1, sag, offset) {
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1)
    return {
      id: index,
      x: x0 + (x1 - x0) * t,
      y: y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * sag,
      color: (index + offset) % flagPalette.length,
      delay: (index % 6) * 0.16,
    }
  })
}

const trackerFlags = flagRow(11, 254, 196, 12, 314, 14, 0)
const trackerFlagsRight = flagRow(10, 266, 196, 512, 314, 14, 2)

const toolBulbs = [
  { id: 0, x: 52, y: 178, delay: 0 },
  { id: 1, x: 118, y: 194, delay: 0.7 },
  { id: 2, x: 188, y: 172, delay: 1.4 },
  { id: 3, x: 248, y: 196, delay: 2.1 },
  { id: 4, x: 404, y: 184, delay: 1.1 },
]

const laundry = [
  { id: 0, x: 58, y: 168, w: 40, h: 58, fill: 'var(--lm-paper-lit)', delay: 0 },
  { id: 1, x: 136, y: 160, w: 42, h: 64, fill: 'var(--dj-awning)', delay: 0.6 },
  { id: 2, x: 218, y: 168, w: 46, h: 64, fill: 'var(--dj-flag-blue)', delay: 1.2 },
  { id: 3, x: 304, y: 160, w: 46, h: 58, fill: 'var(--dj-flag-yellow)', delay: 1.8 },
  { id: 4, x: 386, y: 172, w: 36, h: 48, fill: 'var(--dj-flag-green)', delay: 0.9 },
]

const cityLights = [
  [34, 392], [48, 378], [66, 402], [84, 386], [102, 410],
  [124, 396], [142, 382], [162, 404], [184, 390], [206, 414],
  [228, 398], [250, 384], [272, 406], [296, 394], [318, 412],
  [342, 386], [364, 402], [388, 390], [414, 408], [438, 396],
  [462, 386], [486, 404], [510, 392],
]

const nightStars = [
  [58, 96], [96, 130], [142, 88], [186, 142], [228, 104],
  [272, 150], [318, 92], [356, 136], [404, 108], [448, 150],
  [492, 118], [526, 164],
]

const stars = nightStars.map(([x, y], index) => [
  x,
  y,
  index % 3 === 0 ? 1.6 : 1.1,
  (index % 5) * 0.6,
])

const fireflies = [
  [70, 262, 0], [124, 318, 1.2], [186, 244, 2.1], [238, 300, 0.7], [306, 270, 1.6],
]
</script>

<template>
  <div
    class="dj-landmark"
    :class="[`dj-landmark--${stop}`, { 'is-here': active }]"
    aria-hidden="true"
  >
    <div class="dj-landmark__wash"></div>
    <svg
      viewBox="0 0 640 460"
      preserveAspectRatio="xMinYMax meet"
      :style="{
        '--lm-brick-fill': `url(#${uid('brick')})`,
        '--lm-wood-fill': `url(#${uid('wood')})`,
        '--lm-metal-fill': `url(#${uid('metal')})`,
        '--lm-paper-fill': `url(#${uid('paper')})`,
        '--lm-haze-fill': `url(#${uid('haze')})`,
        '--lm-glow-fill': `url(#${uid('glow')})`,
      }"
    >
      <defs>
        <pattern :id="uid('brick')" width="28" height="16" patternUnits="userSpaceOnUse">
          <rect width="28" height="16" fill="var(--lm-brick)" />
          <path d="M0 0H28M0 8H28M-7 8V16M7 0V8M21 8V16" fill="none" stroke="var(--lm-brick-shade)" stroke-width="1" opacity="0.45" />
        </pattern>
        <pattern :id="uid('wood')" width="12" height="26" patternUnits="userSpaceOnUse">
          <rect width="12" height="26" fill="var(--lm-wood)" />
          <path d="M3 0C5 6 1 12 4 18C6 22 3 26 3 26" fill="none" stroke="var(--lm-wood-shade)" stroke-width="1" opacity="0.55" />
          <path d="M9 0C8 8 10 14 8 20" fill="none" stroke="var(--lm-wood-lit)" stroke-width="0.8" opacity="0.22" />
        </pattern>
        <pattern :id="uid('metal')" width="14" height="24" patternUnits="userSpaceOnUse">
          <rect width="14" height="24" fill="var(--lm-metal)" />
          <path d="M3 0V24M10 0V24" stroke="var(--lm-metal-lit)" stroke-width="1.2" opacity="0.4" />
          <path d="M7 0V24" stroke="var(--lm-metal-shade)" stroke-width="1" opacity="0.35" />
        </pattern>
        <pattern :id="uid('paper')" width="24" height="22" patternUnits="userSpaceOnUse">
          <rect width="24" height="22" fill="var(--lm-paper)" />
          <path d="M0 17H24" stroke="var(--lm-paper-shade)" stroke-width="0.7" opacity="0.35" />
        </pattern>
        <linearGradient :id="uid('haze')" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--lm-haze)" />
          <stop offset="1" stop-color="transparent" />
        </linearGradient>
        <radialGradient :id="uid('glow')">
          <stop offset="0" stop-color="var(--dj-window)" stop-opacity="0.55" />
          <stop offset="1" stop-color="var(--dj-window)" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- GHAR · the courtyard house -->
      <g v-if="stop === 'ghar'">
        <ellipse cx="208" cy="436" rx="212" ry="15" class="lm-cast" />
        <ellipse cx="184" cy="430" rx="148" ry="7" class="lm-contact" />
        <rect x="0" y="96" width="480" height="342" fill="var(--lm-haze-fill)" opacity="0.7" />
        <rect x="-10" y="332" width="460" height="98" class="lm-wall-dark" />
        <path d="M-10,332 L450,332" class="lm-edge" />
        <rect x="18" y="248" width="320" height="184" class="lm-wall" />
        <rect x="18" y="248" width="320" height="15" class="lm-brick-lit" opacity="0.55" />
        <rect x="276" y="248" width="62" height="184" class="lm-brick-shade" opacity="0.3" />
        <path d="M18,248H40V432H18Z" class="lm-rim" opacity="0.22" />
        <path d="M52,276L94,264L108,292L66,304Z" class="lm-plaster" opacity="0.32" />
        <path d="M228,388L266,378L278,404L236,416Z" class="lm-plaster" opacity="0.26" />
        <rect x="8" y="420" width="340" height="14" class="lm-stone" />

        <path d="M2,250 L178,198 L354,250 L340,268 L178,224 L16,268 Z" class="lm-roof" />
        <path d="M28,270 L178,228 L328,270 L314,286 L178,250 L42,286 Z" class="lm-roof" />
        <path d="M20,342 L178,302 L336,342 L322,358 L178,324 L34,358 Z" class="lm-roof" />
        <path d="M2,250 L178,198 L354,250" class="lm-roof-edge" />
        <path d="M28,270 L178,228 L328,270" class="lm-roof-edge" />
        <path d="M20,342 L178,302 L336,342" class="lm-roof-edge" />
        <g class="lm-struts">
          <path d="M62,300L54,330M102,288L94,330M142,276L134,330M214,276L222,330M254,288L262,330M294,300L302,330" />
        </g>

        <g class="lm-woodwork">
          <path d="M124,420 L124,354 Q178,320 232,354 L232,420 Z" />
          <rect x="138" y="360" width="76" height="60" rx="4" class="lm-door-glow" />
          <rect x="70" y="286" width="48" height="38" rx="3" />
          <rect x="78" y="294" width="32" height="22" rx="2" class="lm-window" />
          <rect x="148" y="286" width="48" height="38" rx="3" />
          <rect x="156" y="294" width="32" height="22" rx="2" class="lm-window" />
          <rect x="226" y="286" width="48" height="38" rx="3" />
          <rect x="234" y="294" width="32" height="22" rx="2" class="lm-window" />
          <rect x="52" y="370" width="40" height="30" rx="3" />
          <rect x="60" y="377" width="24" height="17" rx="2" class="lm-window" />
          <rect x="264" y="370" width="40" height="30" rx="3" />
          <rect x="272" y="377" width="24" height="17" rx="2" class="lm-window" />
          <path d="M84,294V316M96,294V316M108,294V316M78,301H118M78,309H118" class="lm-lattice" />
          <path d="M162,294V316M174,294V316M186,294V316M156,301H196M156,309H196" class="lm-lattice" />
          <path d="M240,294V316M252,294V316M264,294V316M234,301H274M234,309H274" class="lm-lattice" />
          <path d="M66,377V394M78,377V394M84,381H92M84,389H92" class="lm-lattice" />
          <path d="M278,377V394M290,377V394M284,381H292M284,389H292" class="lm-lattice" />
          <path d="M118,354Q178,312 238,354" class="lm-torana" />
          <path d="M130,348Q178,320 226,348" class="lm-torana" opacity="0.55" />
        </g>

        <g>
          <circle
            v-for="flower in gharMarigolds"
            :key="`ghar-flower-${flower.id}`"
            :cx="flower.x"
            :cy="flower.y"
            :r="flower.id % 3 === 0 ? 5 : 4"
            :class="flower.id % 4 === 0 ? 'lm-bloom-deep' : 'lm-bloom'"
          />
        </g>

        <g class="lm-planter">
          <path d="M14,406 L52,406 L46,420 L20,420 Z" />
          <circle cx="24" cy="398" r="7" class="lm-bloom" />
          <circle cx="34" cy="394" r="8" class="lm-bloom-deep" />
          <circle cx="44" cy="400" r="6" class="lm-bloom" />
          <path d="M296,406 L334,406 L328,420 L302,420 Z" />
          <circle cx="306" cy="398" r="7" class="lm-bloom" />
          <circle cx="316" cy="394" r="8" class="lm-bloom-deep" />
          <circle cx="326" cy="400" r="6" class="lm-bloom" />
        </g>

        <g class="lm-pots">
          <path d="M88,404C88,388 112,388 112,404L108,428H92Z" class="lm-brass" />
          <ellipse cx="100" cy="402" rx="12" ry="3.6" class="lm-brass-lit" />
          <path d="M93,412H107" class="lm-brass-shade" opacity="0.6" />
          <path d="M286,412L324,412L318,432H292Z" class="lm-wood-shade" />
          <path d="M292,412C288,392 302,380 314,376C320,396 314,408 308,412Z" class="lm-leaf" />
          <path d="M302,412C312,396 324,394 334,400C324,410 314,414 302,412Z" class="lm-leaf-lit" />
        </g>

        <g class="lm-hanging lm-sway">
          <path d="M266,268 L266,286" />
          <rect x="238" y="286" width="56" height="22" rx="3" class="lm-sign" />
          <text x="266" y="301" text-anchor="middle" class="lm-sign-text">GHAR</text>
        </g>
        <circle cx="178" cy="356" r="18" fill="var(--lm-glow-fill)" class="lm-pulse" />
      </g>

      <!-- CHIYA PASAL · the tea shop -->
      <g v-else-if="stop === 'chiya'">
        <ellipse cx="226" cy="436" rx="238" ry="15" class="lm-cast" />
        <ellipse cx="202" cy="430" rx="170" ry="7" class="lm-contact" />
        <rect x="0" y="98" width="500" height="340" fill="var(--lm-haze-fill)" opacity="0.68" />
        <rect x="-10" y="420" width="480" height="14" class="lm-stone" />
        <rect x="26" y="218" width="342" height="204" class="lm-wall" />
        <rect x="26" y="218" width="342" height="13" class="lm-brick-lit" opacity="0.55" />
        <rect x="310" y="218" width="58" height="204" class="lm-brick-shade" opacity="0.3" />
        <path d="M26,218H46V422H26Z" class="lm-rim" opacity="0.2" />
        <rect x="42" y="306" width="310" height="116" class="lm-wall-dark" />
        <rect x="54" y="316" width="286" height="94" class="lm-warm-room" />
        <path d="M54,316H340V328H54Z" class="lm-wood-shade" opacity="0.55" />

        <g class="lm-chalkboard">
          <rect x="50" y="246" width="64" height="56" rx="3" class="lm-wood" />
          <rect x="57" y="253" width="50" height="42" rx="2" class="lm-board" />
          <path d="M64,262H100M64,270H94M64,278H101M64,286H88" class="lm-chalk" />
        </g>

        <g class="lm-shelf lm-detail">
          <path d="M64,338 L330,338" />
          <path d="M64,372 L330,372" />
          <rect x="76" y="316" width="18" height="22" rx="4" class="lm-glass" />
          <rect x="81" y="310" width="8" height="7" rx="2" class="lm-brass" />
          <rect x="106" y="320" width="14" height="18" rx="2" class="lm-glass-shade" />
          <rect x="132" y="314" width="24" height="24" rx="3" class="lm-paper" />
          <rect x="170" y="318" width="15" height="20" rx="3" class="lm-glass" />
          <rect x="198" y="314" width="20" height="24" rx="4" class="lm-brass" />
          <rect x="234" y="320" width="13" height="18" rx="3" class="lm-glass-shade" />
          <rect x="262" y="314" width="22" height="24" rx="3" class="lm-paper" />
          <rect x="298" y="318" width="16" height="20" rx="3" class="lm-glass" />
          <rect x="80" y="348" width="20" height="24" rx="3" class="lm-glass" />
          <rect x="118" y="352" width="14" height="20" rx="3" class="lm-brass" />
          <rect x="148" y="348" width="24" height="24" rx="3" class="lm-paper" />
          <rect x="190" y="352" width="15" height="20" rx="3" class="lm-glass-shade" />
          <rect x="220" y="348" width="20" height="24" rx="4" class="lm-brass" />
          <rect x="256" y="352" width="14" height="20" rx="3" class="lm-glass" />
          <rect x="284" y="348" width="22" height="24" rx="3" class="lm-paper" />
          <path d="M70,340H326M70,374H326" class="lm-shelf-line" />
        </g>

        <rect x="40" y="382" width="314" height="58" rx="4" class="lm-counter" />
        <path d="M40,382 L354,382" class="lm-edge" />
        <rect x="40" y="382" width="314" height="9" class="lm-wood-lit" />
        <path d="M60,391V440M334,391V440" class="lm-wood-shade" opacity="0.55" />
        <path d="M40,426H354" class="lm-wood-shade" opacity="0.35" />

        <g class="lm-kettle">
          <path d="M126,368 C126,340 162,340 162,368 L158,382 L130,382 Z" class="lm-brass" />
          <path d="M132,362 C134,348 154,348 156,362" fill="none" stroke="var(--lm-brass-lit)" stroke-width="3" opacity="0.55" />
          <path d="M160,358 L178,348 L178,358 L162,370Z" class="lm-brass" />
          <path d="M136,346 C146,334 152,334 158,344" fill="none" stroke="var(--lm-brass-shade)" stroke-width="3" />
          <circle cx="148" cy="340" r="4" class="lm-brass-lit" />
          <ellipse cx="146" cy="382" rx="17" ry="3.4" class="lm-brass-shade" opacity="0.5" />
        </g>
        <g class="lm-stove">
          <rect x="188" y="360" width="48" height="22" rx="3" class="lm-metal" />
          <circle cx="200" cy="371" r="6" class="lm-metal-shade" />
          <circle cx="224" cy="371" r="6" class="lm-metal-shade" />
          <path d="M200,358C194,350 206,346 200,338C214,344 212,352 206,358Z" class="lm-flame" />
        </g>
        <g class="lm-cups">
          <path d="M248,362H270L267,382H251Z" class="lm-glass" />
          <path d="M250,372H268L266,382H252Z" class="lm-tea" />
          <path d="M252,366H257V374H252Z" class="lm-glass-lit" opacity="0.7" />
          <path d="M286,358H310L306,382H290Z" class="lm-glass" />
          <path d="M288,371H308L306,382H290Z" class="lm-tea" />
          <path d="M291,363H296V372H291Z" class="lm-glass-lit" opacity="0.7" />
          <path d="M326,364H346L343,382H329Z" class="lm-glass" />
          <path d="M328,373H344L343,382H329Z" class="lm-tea" />
          <path d="M331,368H335V375H331Z" class="lm-glass-lit" opacity="0.7" />
        </g>
        <g class="lm-snacks lm-detail">
          <path d="M330,300V326M348,300V320M366,300V330" class="lm-rope" />
          <rect x="322" y="326" width="17" height="26" rx="2" class="lm-flag-red" />
          <rect x="342" y="320" width="15" height="24" rx="2" class="lm-flag-yellow" />
          <rect x="360" y="330" width="15" height="22" rx="2" class="lm-flag-green" />
        </g>

        <path
          class="lm-awning"
          d="M16,214 L378,214 L370,250 C356,264 340,250 326,250 C312,264 296,250 282,250 C268,264 252,250 238,250 C224,264 208,250 194,250 C180,264 164,250 150,250 C136,264 120,250 106,250 C92,264 76,250 62,250 C48,264 32,250 24,250 Z"
        />
        <g class="lm-awning-stripes">
          <path d="M64,218 L48,248 L76,250 Z" />
          <path d="M128,218 L120,250 L148,250 Z" />
          <path d="M192,218 L188,250 L216,250 Z" />
          <path d="M256,218 L252,250 L280,250 Z" />
          <path d="M320,218 L316,250 L344,250 Z" />
        </g>
        <path d="M16,214L378,214L374,224L20,224Z" class="lm-awning-lit" />
        <path d="M24,250L370,250L366,260L28,260Z" class="lm-awning-shade" opacity="0.55" />
        <g class="lm-stools">
          <path d="M70,400H122L118,412H74Z" class="lm-wood" />
          <path d="M80,412L76,436M112,412L116,436" class="lm-wood-shade" />
          <path d="M318,402H368L364,414H322Z" class="lm-wood" />
          <path d="M328,414L324,436M358,414L362,436" class="lm-wood-shade" />
        </g>

        <g class="lm-hanging lm-sway">
          <path d="M292,256 L292,276" />
          <rect x="254" y="276" width="76" height="24" rx="3" class="lm-sign" />
          <text x="292" y="293" text-anchor="middle" class="lm-sign-text">CHIYA</text>
        </g>

        <g class="lm-steam">
          <path d="M258,356 C252,338 266,330 260,314 C254,298 268,290 262,274" />
          <path d="M298,352 C292,334 306,326 300,310 C294,294 308,286 302,270" />
          <path d="M336,358 C330,340 344,332 338,316 C332,300 346,292 340,276" />
          <path d="M146,338 C140,320 154,312 148,296 C142,280 156,272 150,256" />
        </g>

        <g class="lm-bulbs">
          <circle cx="74" cy="258" r="6" class="lm-bulb lm-blink" />
          <circle cx="166" cy="264" r="5" class="lm-bulb lm-blink" style="animation-delay: 0.9s" />
          <circle cx="334" cy="260" r="6" class="lm-bulb lm-blink" style="animation-delay: 1.7s" />
        </g>
      </g>

      <!-- PUSTAK PASAL · the bookstall -->
      <g v-else-if="stop === 'writing'">
        <ellipse cx="218" cy="436" rx="232" ry="15" class="lm-cast" />
        <ellipse cx="196" cy="430" rx="168" ry="7" class="lm-contact" />
        <rect x="0" y="90" width="500" height="348" fill="var(--lm-haze-fill)" opacity="0.68" />
        <rect x="-10" y="420" width="470" height="14" class="lm-stone" />
        <rect x="20" y="198" width="360" height="226" class="lm-wall-dark" />
        <rect x="32" y="210" width="336" height="202" class="lm-wall" />
        <rect x="32" y="210" width="336" height="13" class="lm-brick-lit" opacity="0.5" />
        <rect x="302" y="210" width="66" height="202" class="lm-brick-shade" opacity="0.3" />
        <path d="M32,210H52V412H32Z" class="lm-rim" opacity="0.22" />
        <path d="M58,236L98,226L110,252L68,262Z" class="lm-plaster" opacity="0.28" />
        <rect x="44" y="246" width="312" height="112" class="lm-wall-dark" />
        <rect x="44" y="246" width="312" height="112" fill="#24192a" opacity="0.85" />

        <g class="lm-shell">
          <path d="M44,246 L356,246" />
          <path d="M44,286 L356,286" />
          <path d="M44,326 L356,326" />
          <rect v-for="(book, index) in bookRows" :key="`book-${index}`" :x="book[0]" :y="book[1]" :width="book[2]" :height="book[3]" rx="1.5" :fill="book[4]" />
          <path v-for="(book, index) in bookRows" :key="`spine-${index}`" :d="`M${book[0] + 2},${book[1] + 5}H${book[0] + book[2] - 2}`" stroke="var(--lm-paper-shade)" stroke-width="1" opacity="0.35" />
        </g>

        <g class="lm-faceout lm-detail">
          <rect x="156" y="272" width="46" height="34" rx="1" class="lm-paper" />
          <rect x="162" y="278" width="34" height="22" class="lm-cover-green" />
          <path d="M166,284H190M166,290H184" stroke="var(--lm-paper-lit)" stroke-width="1.4" opacity="0.7" />
          <rect x="214" y="268" width="44" height="38" rx="1" class="lm-paper" />
          <rect x="220" y="274" width="32" height="26" class="lm-cover-red" />
          <path d="M224,282H248M224,289H242" stroke="var(--lm-paper-lit)" stroke-width="1.4" opacity="0.7" />
          <path d="M216,306H296" class="lm-shelf-line" />
        </g>

        <g class="lm-newspaper-rack lm-detail">
          <rect x="256" y="322" width="78" height="30" rx="2" class="lm-wood" />
          <path d="M262,328H328M262,334H320M262,340H326M262,346H310" class="lm-paper-line" />
        </g>

        <rect x="32" y="364" width="336" height="64" rx="3" class="lm-counter" />
        <path d="M32,364 L368,364" class="lm-edge" />
        <rect x="32" y="364" width="336" height="9" class="lm-wood-lit" />
        <path d="M58,373V428M342,373V428" class="lm-wood-shade" opacity="0.5" />
        <g class="lm-book-stack">
          <rect x="60" y="346" width="68" height="10" rx="2" fill="var(--dj-awning)" />
          <rect x="66" y="336" width="56" height="10" rx="2" fill="var(--dj-flag-yellow)" />
          <rect x="72" y="326" width="44" height="10" rx="2" fill="var(--dj-flag-green)" />
          <rect x="258" y="344" width="72" height="12" rx="2" fill="var(--dj-flag-blue)" />
          <path d="M268,338 L324,338 L318,322 L274,322 Z" class="lm-paper" />
          <path d="M274,322 L296,332 L318,322" class="lm-paper-crease" />
        </g>

        <g class="lm-open-book">
          <path d="M146,352 C166,342 188,342 208,352 L208,374 C188,364 166,364 146,374 Z" class="lm-paper" />
          <path d="M208,352 C228,342 250,342 270,352 L270,374 C250,364 228,364 208,374 Z" class="lm-paper" />
          <path d="M208,352 L208,374" class="lm-paper-crease" />
          <path class="lm-page lm-flutter" d="M214,352 C232,344 250,344 266,352 L262,356 C246,349 230,349 216,356 Z" />
        </g>

        <path d="M18,198 L200,166 L382,198 L370,214 L200,184 L30,214 Z" class="lm-awning lm-awning--green" />
        <g class="lm-awning-stripes lm-awning-stripes--green">
          <path d="M76,190 L64,210 L92,212 Z" />
          <path d="M152,180 L146,210 L174,210 Z" />
          <path d="M228,180 L224,210 L252,210 Z" />
          <path d="M304,190 L302,210 L330,210 Z" />
        </g>
        <path d="M18,198L382,198L378,206L22,206Z" class="lm-awning-lit" />
        <path d="M30,214L370,214L366,222L34,222Z" class="lm-awning-shade" opacity="0.5" />

        <g class="lm-hanging lm-sway">
          <path d="M268,214 L268,238" />
          <rect x="220" y="238" width="96" height="26" rx="3" class="lm-sign" />
          <text x="268" y="256" text-anchor="middle" class="lm-sign-text">PUSTAK</text>
        </g>

        <g class="lm-lamp">
          <path d="M44,232 L44,258" class="lm-metal" />
          <path d="M30,258 L58,258 L52,270 L36,270 Z" class="lm-brass" />
          <circle cx="44" cy="276" r="18" fill="var(--lm-glow-fill)" class="lm-pulse" />
          <path d="M44,270L110,330H44Z" fill="var(--lm-glow-fill)" opacity="0.32" />
        </g>
        <g class="lm-stool lm-detail">
          <path d="M304,400H350L346,412H308Z" class="lm-wood" />
          <path d="M314,412L310,436M340,412L344,436" class="lm-wood-shade" />
        </g>
        <g class="lm-motes">
          <circle cx="116" cy="252" r="2" class="lm-mote" />
          <circle cx="188" cy="236" r="1.5" class="lm-mote" style="animation-delay: 1.4s" />
          <circle cx="280" cy="280" r="2" class="lm-mote" style="animation-delay: 2.1s" />
          <circle cx="330" cy="244" r="1.5" class="lm-mote" style="animation-delay: 0.7s" />
        </g>
      </g>

      <!-- BARI · the garden of maps -->
      <g v-else-if="stop === 'graph'">
        <ellipse cx="218" cy="436" rx="238" ry="15" class="lm-cast" />
        <ellipse cx="198" cy="430" rx="174" ry="7" class="lm-contact" />
        <rect x="0" y="84" width="500" height="354" fill="var(--lm-haze-fill)" opacity="0.66" />

        <g class="lm-canopy">
          <path d="M-8,196C2,164 34,146 68,154C78,124 112,110 142,124C160,98 198,98 216,124C236,106 270,110 284,134C312,120 344,132 352,156C382,150 404,168 402,194C366,208 324,204 286,194C250,208 208,208 172,194C132,208 86,208 48,198C26,204 6,204 -8,196Z" class="lm-leaf-shade" />
          <path d="M18,184C28,156 56,142 86,150C96,126 126,118 150,130C168,110 200,110 216,132C238,116 268,122 278,144C304,132 332,144 338,166C360,164 376,178 374,196C342,204 308,198 278,190C244,202 204,202 170,190C136,202 96,202 66,194C44,200 28,194 18,184Z" class="lm-leaf" />
          <path d="M48,172C58,154 80,148 96,156C104,140 126,136 140,148C156,138 178,142 184,158C200,150 218,158 220,172C198,180 172,176 150,172C126,180 98,178 76,172C64,176 54,176 48,172Z" class="lm-leaf-lit" />
        </g>

        <path d="M-10,430 L-10,330 L74,330 Q178,232 282,330 L360,330 L360,430 Z" class="lm-wall" />
        <path d="M74,330 Q178,232 282,330 L282,430 L74,430 Z" class="lm-arch-dark" />
        <path d="M92,330 Q178,254 264,330 L264,430 L92,430 Z" class="lm-arch-glow" />
        <path d="M74,330 Q178,232 282,330" fill="none" stroke="var(--lm-wood)" stroke-width="10" />
        <path d="M80,330 Q178,242 276,330" fill="none" stroke="var(--lm-brass)" stroke-width="3" opacity="0.55" />
        <path d="M142,240C150,222 168,212 178,210C188,212 206,222 214,240C202,234 190,230 178,230C166,230 154,234 142,240Z" class="lm-brass" />
        <circle cx="178" cy="224" r="4.5" class="lm-brass-lit" />
        <path d="M-10,330H360" class="lm-edge" />
        <path d="M-10,342H360" class="lm-brick-shade" opacity="0.3" />

        <g class="lm-vines">
          <path d="M58,330 C38,308 58,286 42,264 C62,272 70,294 68,314" />
          <path d="M48,306 C30,304 24,292 22,280 C40,282 50,292 50,304" />
          <path d="M62,282 C78,270 90,272 98,282 C84,292 72,292 62,282" />
          <path d="M286,330 C306,304 292,282 310,262 C292,272 280,294 284,314" />
          <path d="M302,306 C322,300 330,288 332,276 C314,280 304,292 302,306" />
          <path d="M290,282 C274,270 262,274 254,284 C268,292 280,292 290,282" />
          <path d="M74,354 C50,346 36,352 26,364 C46,370 62,366 74,354" />
          <path d="M282,354 C306,346 320,352 330,364 C310,370 294,366 282,354" />
        </g>

        <g class="lm-graph-links">
          <path v-for="(link, index) in graphLinks" :key="`link-${index}`" :d="`M${graphNodes[link[0]].x},${graphNodes[link[0]].y} L${graphNodes[link[1]].x},${graphNodes[link[1]].y}`" />
        </g>
        <g class="lm-graph-nodes">
          <g v-for="node in graphNodes" :key="`node-${node.id}`" class="lm-float" :style="{ animationDelay: `${node.id * 0.23}s` }">
            <circle :cx="node.x" :cy="node.y" :r="node.r + 5" class="lm-node-halo" />
            <circle :cx="node.x" :cy="node.y" :r="node.r" class="lm-node" />
          </g>
        </g>

        <g class="lm-notes lm-detail">
          <path d="M48,142C126,122 214,154 292,134C340,122 372,130 396,140" class="lm-note-rope" />
          <g class="lm-float" style="animation-delay: 0.4s">
            <rect x="72" y="148" width="52" height="38" rx="2" class="lm-paper lm-note" transform="rotate(-5 98 167)" />
            <path d="M84,158 L112,158 M84,165 L108,165 M84,172 L100,172" class="lm-note-line" />
            <path d="M86,148L88,142M110,154L112,148" class="lm-clothespin" />
          </g>
          <g class="lm-float" style="animation-delay: 1.2s">
            <rect x="238" y="152" width="56" height="40" rx="2" class="lm-paper lm-note" transform="rotate(4 266 172)" />
            <path d="M250,164 L282,164 M250,171 L278,171 M250,178 L268,178" class="lm-note-line" />
            <path d="M252,152L254,146M282,158L284,152" class="lm-clothespin" />
          </g>
        </g>

        <g class="lm-chaitya lm-detail">
          <path d="M46,388H104V400H46Z" class="lm-stone-shade" />
          <path d="M58,344C58,322 92,322 92,344Z" class="lm-dome" />
          <rect x="69" y="330" width="12" height="14" class="lm-stone" />
          <path d="M75,306L69,330H81Z" class="lm-brass" />
          <path d="M67,316H83M68,322H82" class="lm-spire-line" />
          <circle cx="75" cy="304" r="3" class="lm-brass-lit" />
        </g>

        <g class="lm-hiti lm-detail">
          <rect x="330" y="352" width="62" height="68" rx="3" class="lm-stone" />
          <rect x="338" y="362" width="46" height="12" rx="2" class="lm-stone-shade" />
          <path d="M350,374V388C350,396 370,396 370,388V374" class="lm-water" />
          <path d="M342,366C350,358 358,358 364,366" fill="none" stroke="var(--lm-stone-lit)" stroke-width="3" />
        </g>

        <g class="lm-garden-plants lm-detail">
          <path d="M22,430 C18,398 30,380 42,366 C50,388 46,410 36,430 Z" class="lm-leaf-shade" />
          <path d="M34,430 C34,402 48,388 64,380 C66,402 56,418 46,430 Z" class="lm-leaf" />
          <path d="M320,430 C316,398 328,380 340,366 C348,388 344,410 334,430 Z" class="lm-leaf-shade" />
          <path d="M334,430 C334,402 348,388 364,380 C366,402 356,418 346,430 Z" class="lm-leaf" />
          <path d="M10,430 C4,412 10,398 18,388 C28,402 28,418 24,430 Z" class="lm-leaf" />
        </g>

        <g class="lm-moss">
          <path d="M30,424C44,416 62,420 74,428C60,432 42,432 30,424Z" class="lm-leaf-shade" />
          <path d="M330,424C344,416 362,420 374,428C360,432 342,432 330,424Z" class="lm-leaf" />
        </g>

        <g class="lm-sign-stone">
          <rect x="286" y="300" width="66" height="24" rx="3" class="lm-plaque" />
          <text x="319" y="317" text-anchor="middle" class="lm-sign-text lm-sign-text--dark">BARI</text>
        </g>

        <g class="lm-fireflies">
          <circle v-for="(fly, index) in fireflies.slice(0, 4)" :key="`garden-fly-${index}`" :cx="fly[0]" :cy="fly[1]" r="3" class="lm-firefly" :style="{ animationDelay: `${fly[2]}s` }" />
        </g>
      </g>

      <!-- GUMBA · the prayer-flag courtyard -->
      <g v-else-if="stop === 'tracker'">
        <ellipse cx="254" cy="438" rx="244" ry="15" class="lm-cast" />
        <ellipse cx="254" cy="430" rx="170" ry="7" class="lm-contact" />
        <rect x="0" y="76" width="520" height="360" fill="var(--lm-haze-fill)" opacity="0.66" />
        <rect x="-10" y="338" width="520" height="92" class="lm-wall" />
        <rect x="-10" y="338" width="520" height="11" class="lm-brick-lit" opacity="0.55" />
        <path d="M-10,380H510" class="lm-brick-shade" opacity="0.3" />
        <path d="M-10,338H510" class="lm-edge" />
        <rect x="74" y="390" width="292" height="30" rx="2" class="lm-stone" />
        <rect x="118" y="368" width="204" height="24" rx="2" class="lm-stone-lit" opacity="0.7" />
        <path d="M150,368 C150,296 290,296 290,368 Z" class="lm-dome" />
        <path d="M158,366C158,310 282,310 282,366V368H158Z" class="lm-dome-lit" opacity="0.45" />
        <path d="M272,318C284,330 290,348 290,368H272Z" class="lm-dome-shade" opacity="0.35" />
        <rect x="208" y="282" width="24" height="20" rx="2" class="lm-stone-lit" />
        <rect x="211" y="288" width="6" height="4" rx="1" class="lm-eye" />
        <rect x="223" y="288" width="6" height="4" rx="1" class="lm-eye" />
        <path d="M220,282 L210,216 L230,216 Z" class="lm-spire" />
        <path d="M207,230 L233,230 M208,240 L232,240 M209,250 L231,250 M210,260 L230,260 M211,270 L229,270" class="lm-spire-line" />
        <path d="M220,216V204" class="lm-gajur" />
        <circle cx="220" cy="202" r="5" class="lm-brass-lit lm-pulse" />
        <path d="M202,212C208,204 232,204 238,212" fill="none" stroke="var(--lm-brass)" stroke-width="2.5" />

        <g class="lm-flag-lines">
          <path d="M254,196L12,314" />
          <path d="M266,196L512,314" />
        </g>
        <g class="lm-flags">
          <polygon
            v-for="flag in trackerFlags"
            :key="`tf-${flag.id}`"
            :points="`${flag.x},${flag.y} ${flag.x + 14},${flag.y + 2} ${flag.x + 7},${flag.y + 20}`"
            :fill="flagPalette[flag.color]"
            class="lm-flag"
            :style="{ animationDelay: `${flag.delay}s` }"
          />
          <polygon
            v-for="flag in trackerFlagsRight"
            :key="`tfr-${flag.id}`"
            :points="`${flag.x},${flag.y} ${flag.x + 14},${flag.y + 2} ${flag.x + 7},${flag.y + 20}`"
            :fill="flagPalette[flag.color]"
            class="lm-flag"
            :style="{ animationDelay: `${flag.delay}s` }"
          />
        </g>

        <g class="lm-prayer-wheels lm-detail">
          <g v-for="wheel in [34, 62, 90, 118, 146]" :key="`wheel-l-${wheel}`">
            <rect :x="wheel" y="366" width="18" height="30" rx="6" class="lm-brass" />
            <path :d="`M${wheel + 4},372V390M${wheel + 9},372V390M${wheel + 14},372V390`" class="lm-wheel-line" />
            <circle :cx="wheel + 9" cy="364" r="3" class="lm-brass-lit" />
          </g>
          <g v-for="wheel in [382, 410, 438, 466]" :key="`wheel-r-${wheel}`">
            <rect :x="wheel" y="366" width="18" height="30" rx="6" class="lm-brass" />
            <path :d="`M${wheel + 4},372V390M${wheel + 9},372V390M${wheel + 14},372V390`" class="lm-wheel-line" />
            <circle :cx="wheel + 9" cy="364" r="3" class="lm-brass-lit" />
          </g>
        </g>
        <rect x="10" y="418" width="500" height="22" class="lm-paving" />

        <g class="lm-bell-line">
          <path d="M40,330 L40,352 M96,334 L96,356 M152,338 L152,360" />
          <g class="lm-bell lm-sway">
            <path d="M34,352 L46,352 L44,364 L36,364 Z" class="lm-brass" />
            <circle cx="40" cy="366" r="3" class="lm-brass" />
          </g>
          <g class="lm-bell lm-sway" style="animation-delay: 0.7s">
            <path d="M90,356 L102,356 L100,368 L92,368 Z" class="lm-brass" />
            <circle cx="96" cy="370" r="3" class="lm-brass" />
          </g>
          <g class="lm-bell lm-sway" style="animation-delay: 1.3s">
            <path d="M146,360 L158,360 L156,372 L148,372 Z" class="lm-brass" />
            <circle cx="152" cy="374" r="3" class="lm-brass" />
          </g>
        </g>

        <g class="lm-butter-lamps">
          <circle cx="318" cy="406" r="10" class="lm-glow-soft lm-pulse" />
          <circle cx="318" cy="406" r="4" class="lm-flame" />
          <path d="M310,412 L326,412 L322,420 L314,420 Z" class="lm-brass" />
          <circle cx="382" cy="406" r="10" class="lm-glow-soft lm-pulse" style="animation-delay: 1.1s" />
          <circle cx="382" cy="406" r="4" class="lm-flame" />
          <path d="M374,412 L390,412 L386,420 L378,420 Z" class="lm-brass" />
        </g>

        <g class="lm-hanging lm-sway">
          <path d="M386,338 L386,356" class="lm-rope" />
          <rect x="350" y="356" width="72" height="24" rx="3" class="lm-sign" />
          <text x="386" y="373" text-anchor="middle" class="lm-sign-text">GUMBA</text>
        </g>
      </g>

      <!-- BAZAAR · the gadget stalls -->
      <g v-else-if="stop === 'tools'">
        <ellipse cx="250" cy="438" rx="250" ry="15" class="lm-cast" />
        <ellipse cx="236" cy="430" rx="184" ry="7" class="lm-contact" />
        <rect x="0" y="86" width="520" height="350" fill="var(--lm-haze-fill)" opacity="0.68" />
        <rect x="-10" y="420" width="520" height="14" class="lm-stone" />
        <rect x="10" y="228" width="466" height="194" class="lm-wall" />
        <rect x="10" y="228" width="466" height="13" class="lm-brick-lit" opacity="0.55" />
        <rect x="406" y="228" width="70" height="194" class="lm-brick-shade" opacity="0.3" />
        <path d="M10,228H30V422H10Z" class="lm-rim" opacity="0.2" />
        <rect x="24" y="242" width="228" height="166" class="lm-wall-dark" />
        <rect x="268" y="242" width="190" height="124" class="lm-wood-shade" />
        <rect x="274" y="248" width="178" height="112" class="lm-pegboard" />

        <path d="M0,224 L256,224 L248,258 C236,270 224,258 212,258 C200,270 188,258 176,258 C164,270 152,258 140,258 C128,270 116,258 104,258 C92,270 80,258 68,258 C56,270 44,258 32,258 C20,270 8,258 0,258 Z" class="lm-awning" />
        <g class="lm-awning-stripes">
          <path d="M42,228 L28,256 L56,258 Z" />
          <path d="M102,228 L94,258 L122,258 Z" />
          <path d="M162,228 L158,258 L186,258 Z" />
          <path d="M222,228 L218,258 L246,258 Z" />
        </g>
        <path d="M0,224L256,224L254,232L2,232Z" class="lm-awning-lit" />
        <path d="M14,258L242,258L240,266L16,266Z" class="lm-awning-shade" opacity="0.5" />
        <g class="lm-awning--metal">
          <path d="M252,224H496L490,250L258,250Z" class="lm-metal-awning" />
          <path d="M252,232H494M254,240H492M256,248H490" class="lm-metal-rib" />
          <path d="M252,224H496L494,230L254,230Z" class="lm-metal-lit" opacity="0.6" />
        </g>
        <g class="lm-peg-tools">
          <circle cx="290" cy="260" r="2" class="lm-peg" />
          <circle cx="332" cy="258" r="2" class="lm-peg" />
          <circle cx="376" cy="260" r="2" class="lm-peg" />
          <circle cx="420" cy="258" r="2" class="lm-peg" />
          <circle cx="454" cy="262" r="2" class="lm-peg" />
          <path d="M286,266V296L290,302L294,296V266" class="lm-tool" />
          <circle cx="290" cy="268" r="6" fill="none" stroke="var(--lm-metal-lit)" stroke-width="3" />
          <path d="M332,264V300" class="lm-tool-lit" stroke-width="4" />
          <rect x="327" y="260" width="10" height="12" rx="2" class="lm-handle" />
          <path d="M376,266L370,288M376,266L382,288" class="lm-tool" />
          <path d="M370,288L366,296M382,288L386,296" class="lm-tool-lit" />
          <path d="M420,264V286" class="lm-wood" stroke-width="5" />
          <path d="M408,284H432L428,294H412Z" class="lm-metal" />
          <path d="M454,262C466,266 468,284 458,294C448,286 446,270 454,262Z" fill="none" stroke="var(--lm-copper)" stroke-width="2" />
        </g>

        <g class="lm-shelf">
          <path d="M36,302 L240,302" />
          <path d="M36,342 L240,342" />
        </g>

        <g class="lm-gadgets">
          <rect x="48" y="268" width="48" height="34" rx="3" class="lm-gadget" />
          <circle cx="62" cy="285" r="8" class="lm-gadget-dark" />
          <circle cx="80" cy="280" r="3" class="lm-gadget-light lm-blink" />
          <rect x="112" y="274" width="36" height="28" rx="4" class="lm-gadget" />
          <path d="M120,274 L120,262 M140,274 L140,262" class="lm-antenna" />
          <circle cx="120" cy="260" r="3" class="lm-gadget-light lm-blink" style="animation-delay: 0.8s" />
          <circle cx="140" cy="260" r="3" class="lm-gadget-light lm-blink" style="animation-delay: 1.5s" />
          <rect x="168" y="270" width="44" height="32" rx="3" class="lm-gadget" />
          <circle cx="182" cy="286" r="7" class="lm-gadget-dark" />
          <path d="M196,280 L208,280 M196,288 L208,288" class="lm-gadget-line" />

          <rect x="50" y="312" width="52" height="30" rx="3" class="lm-gadget" />
          <circle cx="65" cy="327" r="6" class="lm-gadget-dark" />
          <path d="M80,316 L92,316 L92,338" class="lm-gadget-line" />
          <rect x="116" y="310" width="42" height="32" rx="3" class="lm-gadget" />
          <circle cx="137" cy="326" r="9" class="lm-gear lm-spin" />
          <path d="M137,317 L137,335 M128,326 L146,326 M131,320 L143,332 M143,320 L131,332" class="lm-gadget-line" />
          <rect x="174" y="314" width="38" height="28" rx="3" class="lm-gadget" />
          <path d="M182,322 L204,322 M182,330 L198,330" class="lm-gadget-line" />
          <circle cx="204" cy="320" r="3" class="lm-gadget-light lm-blink" style="animation-delay: 2s" />
        </g>

        <g class="lm-radio lm-detail">
          <rect x="288" y="292" width="126" height="74" rx="6" class="lm-radio-body" />
          <rect x="288" y="292" width="126" height="10" rx="5" class="lm-radio-lit" opacity="0.55" />
          <rect x="298" y="305" width="52" height="40" rx="3" class="lm-radio-grille" />
          <path d="M302,312H346M302,319H346M302,326H346M302,333H346" class="lm-radio-line" />
          <circle cx="378" cy="318" r="15" class="lm-radio-dial" />
          <circle cx="378" cy="318" r="11" class="lm-radio-face" />
          <path d="M378,318L384,312" class="lm-radio-needle" />
          <circle cx="404" cy="310" r="4" class="lm-radio-knob" />
          <circle cx="404" cy="326" r="4" class="lm-radio-knob" />
          <path d="M394,292L398,276M410,292L414,276" class="lm-antenna" />
          <circle cx="398" cy="274" r="2" class="lm-gadget-light lm-blink" />
          <path d="M300,366V378H402V366" class="lm-radio-base" />
        </g>

        <rect x="24" y="366" width="228" height="58" rx="3" class="lm-counter" />
        <rect x="252" y="366" width="218" height="58" rx="3" class="lm-counter" />
        <path d="M24,366 L470,366" class="lm-edge" />
        <rect x="24" y="366" width="446" height="9" class="lm-wood-lit" />
        <path d="M44,375V424M458,375V424" class="lm-wood-shade" opacity="0.5" />

        <g class="lm-propeller">
          <path d="M140,366 L140,344" class="lm-antenna" />
          <g class="lm-spin">
            <path d="M140,344 C126,334 120,340 128,346 C120,348 122,356 134,350 C138,360 146,358 144,348 C156,352 160,344 148,342 Z" class="lm-brass" />
          </g>
          <circle cx="140" cy="346" r="3" class="lm-gadget-dark" />
        </g>

        <g class="lm-blade-sign">
          <rect x="296" y="202" width="126" height="22" rx="4" class="lm-plaque-dark" />
          <path d="M300,204H418" stroke="var(--lm-brass)" stroke-width="2" opacity="0.5" />
          <text x="359" y="217" text-anchor="middle" class="lm-sign-text lm-sign-text--warm">BAZAAR</text>
        </g>

        <g class="lm-bulbs">
          <g v-for="bulb in toolBulbs" :key="`bulb-${bulb.id}`">
            <path :d="`M${bulb.x},224 L${bulb.x},${bulb.y - 10}`" class="lm-antenna" />
            <circle :cx="bulb.x" :cy="bulb.y" r="5" class="lm-bulb lm-blink" :style="{ animationDelay: `${bulb.delay}s` }" />
          </g>
        </g>
      </g>

      <!-- THAMEL · the rooftop -->
      <g v-else-if="stop === 'rooftop'">
        <ellipse cx="250" cy="440" rx="252" ry="14" class="lm-cast" />
        <rect x="0" y="64" width="520" height="370" fill="var(--lm-dusk-fill)" opacity="0.7" />
        <circle cx="404" cy="126" r="30" fill="var(--lm-sun-fill)" opacity="0.55" />

        <g class="lm-skyline-far">
          <rect x="6" y="322" width="38" height="74" />
          <rect x="52" y="300" width="52" height="96" />
          <rect x="114" y="332" width="40" height="64" />
          <rect x="162" y="308" width="58" height="88" />
          <rect x="230" y="328" width="48" height="68" />
          <rect x="288" y="298" width="56" height="98" />
          <rect x="354" y="318" width="42" height="78" />
          <rect x="406" y="292" width="60" height="104" />
          <rect x="472" y="320" width="34" height="76" />
        </g>

        <g class="lm-skyline">
          <rect x="18" y="306" width="46" height="90" />
          <rect x="74" y="284" width="58" height="112" />
          <rect x="148" y="318" width="42" height="78" />
          <rect x="204" y="292" width="54" height="104" />
          <rect x="270" y="312" width="64" height="84" />
          <rect x="348" y="276" width="54" height="120" />
          <rect x="414" y="306" width="46" height="90" />
          <rect x="88" y="270" width="18" height="10" />
          <rect x="360" y="262" width="26" height="8" />
          <path d="M358,262L373,246L388,262Z" />
          <path d="M94,282L97,276M100,282L103,276" class="lm-antenna" />
        </g>
        <g class="lm-skyline-windows">
          <rect v-for="light in cityLights" :key="`roof-light-${light[0]}`" :x="light[0]" :y="light[1] - 80" width="5" height="7" class="lm-city-light" />
        </g>

        <rect x="0" y="362" width="500" height="78" class="lm-deck" />
        <path d="M0,362 L500,362" class="lm-edge" />
        <rect x="0" y="344" width="500" height="18" class="lm-parapet" />
        <rect x="0" y="344" width="500" height="5" class="lm-parapet-lit" opacity="0.5" />
        <path d="M0,344 L500,344" class="lm-edge" />
        <g class="lm-parapet-posts">
          <path v-for="post in [30, 90, 150, 210, 270, 330, 390, 450]" :key="`post-${post}`" :d="`M${post},344V362`" class="lm-parapet-line" />
        </g>

        <g class="lm-water-tank">
          <rect x="252" y="254" width="98" height="90" rx="8" class="lm-tank" />
          <path d="M256,260H346V338H256Z" class="lm-tank-rib" />
          <path d="M268,254V344M284,254V344M300,254V344M316,254V344M332,254V344" class="lm-tank-line" />
          <ellipse cx="301" cy="254" rx="49" ry="12" class="lm-tank-top" />
          <ellipse cx="301" cy="254" rx="30" ry="7" class="lm-tank-cap" />
          <ellipse cx="301" cy="344" rx="49" ry="10" class="lm-tank-bottom" />
          <path d="M260,344 L260,362 M342,344 L342,362 M252,278 L350,278" class="lm-pipe" />
          <path d="M258,350H344" class="lm-pipe" opacity="0.7" />
          <path d="M266,352L256,362M336,352L346,362" class="lm-tank-line" />
        </g>

        <g class="lm-dish lm-detail">
          <path d="M442,342L458,310M454,310L462,310" class="lm-tool-lit" />
          <ellipse cx="458" cy="304" rx="18" ry="7" transform="rotate(-24 458 304)" class="lm-dish-face" />
          <path d="M448,294L466,312" class="lm-tool-lit" />
          <circle cx="458" cy="306" r="2.5" class="lm-brass-lit" />
        </g>

        <g class="lm-laundry-line">
          <path d="M24,182 C120,160 240,190 352,162" class="lm-rope" />
          <g v-for="cloth in laundry" :key="`cloth-${cloth.id}`" class="lm-laundry lm-sway" :style="{ animationDelay: `${cloth.delay}s` }">
            <path :d="`M${cloth.x},${cloth.y} L${cloth.x + cloth.w},${cloth.y} L${cloth.x + cloth.w - 5},${cloth.y + cloth.h} L${cloth.x + 5},${cloth.y + cloth.h} Z`" :fill="cloth.fill" />
            <path :d="`M${cloth.x + 8},${cloth.y + 8} L${cloth.x + cloth.w - 8},${cloth.y + 8}`" class="lm-cloth-line" />
            <path :d="`M${cloth.x + 6},${cloth.y - 3}l2,4l-4,1M${cloth.x + cloth.w - 10},${cloth.y - 2}l2,4l-4,1`" class="lm-clothespin" />
          </g>
        </g>

        <g class="lm-antenna">
          <path d="M394,344 L394,214 M374,238 L414,238 M380,220 L408,220" />
          <path d="M394,214 L382,196 M394,214 L406,196" />
          <circle cx="394" cy="214" r="4" class="lm-bulb lm-blink" />
        </g>
        <g class="lm-radio">
          <rect x="60" y="384" width="74" height="42" rx="4" class="lm-radio-casing" />
          <circle cx="80" cy="405" r="11" class="lm-radio-speaker" />
          <circle cx="112" cy="397" r="4" class="lm-radio-knob" />
          <circle cx="112" cy="412" r="4" class="lm-radio-knob" />
          <path d="M136,384 L152,368" class="lm-antenna" />
        </g>

        <g class="lm-planter">
          <path d="M176,402 L220,402 L214,420 L182,420 Z" />
          <path d="M190,402 C186,382 194,368 204,360 C210,380 206,394 200,402 Z" class="lm-leaf" />
          <path d="M198,402 C208,384 220,382 230,388 C218,400 208,404 198,402 Z" class="lm-leaf" />
        </g>
        <g class="lm-planter">
          <path d="M440,398 L476,398 L472,420 L444,420 Z" />
          <path d="M458,398 C452,382 458,370 466,362 C474,378 470,390 464,398 Z" class="lm-leaf" />
        </g>

        <g class="lm-roof-crate lm-detail">
          <rect x="222" y="374" width="26" height="26" rx="2" class="lm-wood" />
          <path d="M222,382H248M222,392H248M235,374V400" class="lm-wood-shade" />
        </g>
        <g class="lm-string-lights lm-detail">
          <path d="M20,240C90,262 162,234 232,252" fill="none" stroke="var(--lm-wire)" stroke-width="1.5" />
          <circle cx="54" cy="252" r="3" class="lm-bulb lm-blink" />
          <circle cx="108" cy="250" r="3" class="lm-bulb lm-blink" style="animation-delay: 0.9s" />
          <circle cx="164" cy="240" r="3" class="lm-bulb lm-blink" style="animation-delay: 1.7s" />
          <circle cx="214" cy="248" r="3" class="lm-bulb lm-blink" style="animation-delay: 0.4s" />
        </g>

        <g class="lm-hanging lm-sway">
          <path d="M134,362 L134,380" />
          <rect x="86" y="380" width="96" height="22" rx="3" class="lm-sign" />
          <text x="134" y="395" text-anchor="middle" class="lm-sign-text">THAMEL</text>
        </g>
      </g>

      <!-- SWAYAMBHU · the overlook -->
      <g v-else-if="stop === 'night'">
        <ellipse cx="254" cy="440" rx="258" ry="14" class="lm-cast" />
        <rect x="0" y="20" width="540" height="424" fill="var(--lm-night-fill)" opacity="0.75" />
        <g class="lm-stars">
          <circle v-for="star in stars" :key="`star-${star[0]}-${star[1]}`" :cx="star[0]" :cy="star[1]" :r="star[2]" class="lm-star" :style="{ animationDelay: `${star[3]}s` }" />
        </g>
        <circle cx="408" cy="112" r="34" class="lm-moon-glow" />
        <circle cx="408" cy="112" r="23" class="lm-moon" />
        <circle cx="414" cy="104" r="5" class="lm-moon-crater" opacity="0.35" />
        <circle cx="400" cy="120" r="3.5" class="lm-moon-crater" opacity="0.28" />

        <path d="M-10,338C60,306 130,318 190,334C250,352 320,310 390,324C440,334 486,322 520,308V420H-10Z" class="lm-hills-far" />
        <path d="M-10,366C70,344 140,354 210,366C280,380 350,352 430,360C470,364 500,360 520,352V420H-10Z" class="lm-hills" />

        <g class="lm-night-city">
          <rect x="12" y="366" width="44" height="64" />
          <rect x="64" y="348" width="56" height="82" />
          <rect x="132" y="372" width="38" height="58" />
          <rect x="182" y="338" width="62" height="92" />
          <rect x="256" y="360" width="48" height="70" />
          <rect x="316" y="342" width="58" height="88" />
          <rect x="386" y="370" width="48" height="60" />
          <rect x="446" y="352" width="50" height="78" />
          <path d="M182,338L213,320L244,338Z" />
        </g>
        <g class="lm-city-lights">
          <circle v-for="(light, index) in cityLights" :key="`night-light-${index}`" :cx="light[0]" :cy="light[1]" r="2.2" class="lm-city-light" :style="{ animationDelay: `${(index % 7) * 0.4}s` }" />
        </g>

        <rect x="0" y="404" width="520" height="36" class="lm-deck" />
        <path d="M0,404 L520,404" class="lm-edge" />
        <g class="lm-railing">
          <path d="M10,404 L10,334 M74,404 L74,326 M138,404 L138,318 M202,404 L202,318 M266,404 L266,318 M330,404 L330,318 M394,404 L394,326 M458,404 L458,334" class="lm-rail-post" />
          <path d="M0,334 C120,316 280,316 466,334" class="lm-rail" />
          <path d="M0,368 C140,352 320,352 480,368" class="lm-rail" />
          <path d="M10,334V404M74,326V404M138,318V404M202,318V404M266,318V404M330,318V404M394,326V404M458,334V404" class="lm-rail-shade" />
        </g>

        <g class="lm-bench">
          <path d="M72,382 L194,382 L188,394 L78,394 Z" class="lm-wood" />
          <path d="M72,376 L194,376 L188,386 L78,386 Z" class="lm-wood-lit" opacity="0.55" />
          <path d="M78,394 L74,420 M182,394 L186,420 M96,382 L96,362 L172,362 L172,382" class="lm-bench-line" />
          <path d="M96,362H172M100,370H168" class="lm-wood-lit" opacity="0.4" />
          <path d="M78,386H188" class="lm-wood-shade" />
        </g>

        <g class="lm-lamppost">
          <path d="M342,404 L342,244" class="lm-post" />
          <path d="M322,244 L362,244 L354,224 L330,224 Z" class="lm-lamp-shade" />
          <circle cx="342" cy="258" r="24" fill="var(--lm-glow-fill)" class="lm-pulse" />
          <path d="M342,258L290,404H394Z" fill="var(--lm-glow-fill)" opacity="0.22" />
          <circle cx="342" cy="258" r="7" class="lm-bulb" />
          <path d="M334,404H350" class="lm-post" />
        </g>

        <g class="lm-fireflies">
          <circle v-for="(fly, index) in fireflies" :key="`night-fly-${index}`" :cx="fly[0] + 30" :cy="fly[1]" r="2.5" class="lm-firefly" :style="{ animationDelay: `${fly[2]}s` }" />
        </g>

        <g class="lm-hanging lm-sway">
          <path d="M222,334 L222,356" />
          <rect x="160" y="356" width="124" height="22" rx="3" class="lm-sign" />
          <text x="222" y="371" text-anchor="middle" class="lm-sign-text" textLength="108" lengthAdjust="spacingAndGlyphs">SWAYAMBHU</text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.dj-landmark {
  position: absolute;
  left: 0;
  bottom: clamp(58px, 10.5vh, 136px);
  z-index: 2;
  width: min(52vw, 760px);
  opacity: 0.8;
  pointer-events: none;
  transition: opacity 0.6s ease;
}

.dj-landmark.is-here {
  opacity: 1;
}

.dj-landmark svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.dj-landmark:not(.is-here) * {
  animation-play-state: paused;
}

.dj-landmark__wash {
  position: absolute;
  inset: 14% 0 0;
  border-radius: 50%;
  opacity: 0.22;
}

.dj-landmark--ghar .dj-landmark__wash {
  background: radial-gradient(ellipse at 30% 70%, var(--dj-bloom), transparent 62%);
}
.dj-landmark--chiya .dj-landmark__wash {
  background: radial-gradient(ellipse at 30% 65%, var(--dj-awning), transparent 64%);
}
.dj-landmark--writing .dj-landmark__wash {
  background: radial-gradient(ellipse at 30% 65%, var(--dj-flag-green), transparent 64%);
}
.dj-landmark--graph .dj-landmark__wash {
  background: radial-gradient(ellipse at 30% 65%, var(--dj-flag-green), transparent 62%);
}
.dj-landmark--tracker .dj-landmark__wash {
  background: radial-gradient(ellipse at 30% 65%, var(--dj-flag-yellow), transparent 62%);
}
.dj-landmark--tools .dj-landmark__wash {
  background: radial-gradient(ellipse at 30% 65%, var(--dj-awning), transparent 64%);
}
.dj-landmark--rooftop .dj-landmark__wash {
  background: radial-gradient(ellipse at 30% 65%, var(--dj-city-glow), transparent 62%);
}
.dj-landmark--night .dj-landmark__wash {
  background: radial-gradient(ellipse at 30% 65%, var(--dj-night-mid), transparent 64%);
}

/* shared material palette */
.lm-brick { fill: var(--lm-brick-fill); }
.lm-wood { fill: var(--lm-wood-fill); }
.lm-metal { fill: var(--lm-metal-fill); }
.lm-paper { fill: var(--lm-paper-fill); }
.lm-paving { fill: var(--lm-paving-fill); }

.lm-wall { fill: var(--lm-brick-fill); }
.lm-wall-dark { fill: var(--lm-brick-shade); }
.lm-deck,
.lm-parapet { fill: var(--dj-ground); }
.lm-stone { fill: var(--lm-stone); }
.lm-stone--lit { fill: var(--lm-stone-lit); }
.lm-stone--shade { fill: var(--lm-stone-shade); }
.lm-roof { fill: var(--dj-roof); }
.lm-roof-edge { fill: none; stroke: color-mix(in oklab, var(--dj-roof) 62%, var(--lm-rim)); stroke-width: 2; }
.lm-edge { stroke: color-mix(in oklab, var(--dj-cornice) 78%, var(--lm-rim)); stroke-width: 2; }
.lm-shadow { fill: rgba(12, 8, 18, 0.42); }
.lm-cast { fill: rgba(12, 8, 18, 0.2); }
.lm-contact { fill: rgba(12, 8, 18, 0.5); }
.lm-haze { fill: var(--lm-haze-fill); }
.lm-rim { fill: var(--lm-rim); }
.lm-woodwork path,
.lm-woodwork rect { fill: var(--lm-wood-fill); }
.lm-woodwork .lm-window { fill: var(--dj-window); }
.lm-door-glow { fill: var(--dj-window); opacity: 0.46; }
.lm-window { fill: var(--dj-window); }
.lm-lattice { fill: none; stroke: var(--lm-brass); stroke-width: 1.6; opacity: 0.55; }
.lm-sill { fill: none; stroke: var(--lm-wood-lit); stroke-width: 3; opacity: 0.8; }
.lm-torana { fill: none; stroke: var(--lm-brass); stroke-width: 4; stroke-linecap: round; }
.lm-struts path { fill: none; stroke: var(--lm-wood-shade); stroke-width: 4; stroke-linecap: round; opacity: 0.8; }
.lm-paper-crease { fill: none; stroke: var(--lm-paper-shade); stroke-width: 1.5; opacity: 0.7; }
.lm-counter { fill: var(--lm-wood-shade); }
.lm-brass { fill: var(--lm-brass); }
.lm-brass-lit { fill: var(--lm-brass-lit); }
.lm-brass-shade { fill: var(--lm-brass-shade); }
.lm-bloom { fill: var(--dj-bloom); }
.lm-bloom-deep { fill: color-mix(in oklab, var(--dj-awning) 68%, var(--dj-bloom)); }
.lm-planter path:first-child { fill: var(--lm-wood-shade); }
.lm-leaf { fill: var(--lm-leaf); }
.lm-leaf-lit { fill: var(--lm-leaf-lit); }
.lm-leaf-shade { fill: var(--lm-leaf-shade); }
.lm-plaster { fill: var(--lm-plaster); }
.lm-warm-room { fill: var(--dj-window); opacity: 0.16; }
.lm-arch-dark { fill: var(--lm-stone-shade); }
.lm-arch-glow { fill: var(--dj-window); opacity: 0.09; }
.lm-dome { fill: color-mix(in oklab, var(--lm-paper-lit) 78%, var(--lm-stone-lit)); }
.lm-dome-lit { fill: var(--lm-paper-lit); opacity: 0.5; }
.lm-dome-shade { fill: var(--lm-stone-shade); }
.lm-spire { fill: var(--lm-brass); }
.lm-spire-line { fill: none; stroke: var(--lm-brass-shade); stroke-width: 1.8; opacity: 0.72; }
.lm-eye { fill: #241a2c; }
.lm-gajur { stroke: var(--lm-brass-lit); stroke-width: 3; }
.lm-flame { fill: #ffe7a0; }
.lm-sign { fill: var(--dj-sign); }
.lm-sign-text {
  fill: var(--dj-sign-text);
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.lm-sign-text--dark { fill: var(--lm-paper-lit); }
.lm-sign-stone rect { fill: var(--lm-stone-shade); }
.lm-plaque { fill: var(--lm-stone-shade); }
.lm-glow-soft { fill: var(--dj-window); opacity: 0.2; }
.lm-bulb { fill: var(--dj-window); }
.lm-city-light { fill: var(--dj-window); }
.lm-gadget { fill: var(--lm-metal); stroke: var(--lm-metal-shade); stroke-width: 2; }
.lm-gadget-dark { fill: var(--lm-metal-shade); }
.lm-gadget-light { fill: var(--dj-flag-green); }
.lm-gadget-line,
.lm-antenna,
.lm-pipe,
.lm-tank-line,
.lm-post,
.lm-laundry-line .lm-rope,
.lm-rope,
.lm-bell-line path,
.lm-shelf path,
.lm-railing path,
.lm-bench-line,
.lm-flag-lines path,
.lm-graph-links path,
.lm-note-line,
.lm-spire-line {
  fill: none;
  stroke: var(--lm-wood-shade);
  stroke-width: 2;
  opacity: 0.72;
}
.lm-antenna { stroke-width: 2.5; opacity: 0.85; }
.lm-tank { fill: var(--lm-metal-shade); }
.lm-tank-top { fill: var(--lm-metal); }
.lm-tank-bottom { fill: color-mix(in oklab, var(--lm-metal-shade) 70%, black); }
.lm-tank-hoop { fill: none; stroke: var(--lm-metal-lit); stroke-width: 3; opacity: 0.3; }
.lm-tank-rib { fill: none; stroke: color-mix(in oklab, var(--lm-metal-shade) 72%, black); stroke-width: 2; opacity: 0.55; }
.lm-radio-casing { fill: var(--lm-wood-shade); }
.lm-radio-face { fill: #211a2c; }
.lm-radio-speaker { fill: var(--lm-metal-shade); }
.lm-radio-knob { fill: var(--lm-brass); }
.lm-skyline rect { fill: color-mix(in oklab, var(--dj-city-near) 76%, var(--dj-wall-a)); }
.lm-skyline-windows .lm-city-light { opacity: 0.5; }
.lm-night-city rect { fill: color-mix(in oklab, var(--dj-city-near) 58%, black); }
.lm-lamp-shade { fill: var(--lm-metal-shade); }
.lm-bench-line { stroke-width: 2.5; }
.lm-node { fill: var(--dj-window); }
.lm-node-halo { fill: var(--dj-window); opacity: 0.16; }
.lm-note { stroke: var(--lm-paper-shade); stroke-width: 1.5; }
.lm-note-rope { fill: none; stroke: var(--lm-wood-shade); stroke-width: 1.5; opacity: 0.55; }
.lm-cloth-line { fill: none; stroke: rgba(20, 12, 30, 0.35); stroke-width: 1.5; }
.lm-clothespin { stroke: var(--lm-wood-shade); stroke-width: 2.2; stroke-linecap: round; opacity: 0.7; }
.lm-awning { fill: var(--dj-awning); }
.lm-awning--green { fill: color-mix(in oklab, var(--dj-flag-green) 52%, var(--lm-leaf-shade)); }
.lm-awning-stripes { fill: var(--dj-awning-stripe); opacity: 0.55; }
.lm-awning-stripes--green { fill: var(--lm-paper-lit); opacity: 0.4; }
.lm-mote { fill: var(--dj-window); opacity: 0.55; }
.lm-firefly { fill: var(--dj-firefly); filter: drop-shadow(0 0 6px var(--dj-firefly-glow)); }
.lm-tank-line { opacity: 0.35; }
.lm-shelf path { opacity: 0.45; }
.lm-shelf-line { fill: none; stroke: var(--lm-wood-lit); stroke-width: 2.5; opacity: 0.5; }
.lm-graph-links path { stroke: var(--lm-brass); stroke-dasharray: 4 6; opacity: 0.55; }
.lm-board { fill: #201a2b; }
.lm-chalk { fill: none; stroke: var(--lm-paper-lit); stroke-width: 1.4; opacity: 0.6; }
.lm-paper-line { fill: none; stroke: var(--lm-paper-shade); stroke-width: 1.2; opacity: 0.6; }
.lm-cover-green { fill: var(--lm-leaf); }
.lm-cover-red { fill: var(--dj-awning); }
.lm-wheel-line { stroke: var(--lm-brass-shade); stroke-width: 1; opacity: 0.7; }
.lm-tube { fill: #d9f4ff; opacity: 0.7; }
.lm-far-line { fill: none; stroke: var(--lm-rim); stroke-width: 1.2; opacity: 0.35; }
.lm-hill-far { fill: var(--dj-ridge-far-top); opacity: 0.55; }
.lm-hill-mid { fill: var(--dj-ridge-mid-top); opacity: 0.75; }
.lm-city-far { fill: color-mix(in oklab, var(--dj-city-far) 74%, var(--dj-sky-bottom)); }
.lm-city-near { fill: var(--dj-city-near); }
.lm-stupa-far { fill: color-mix(in oklab, var(--dj-city-near) 78%, var(--lm-paper)); opacity: 0.55; }
.lm-stupa-spire { fill: var(--lm-brass); opacity: 0.5; }
.lm-star { fill: var(--lm-paper-lit); opacity: 0.75; }
.lm-moon-fill { fill: var(--lm-paper-lit); opacity: 0.82; }
.lm-moon-cut { fill: var(--dj-night-top); }
.lm-water { fill: none; stroke: var(--dj-flag-blue); stroke-width: 3; opacity: 0.55; }
.lm-steam-stroke { stroke: rgba(255, 248, 232, 0.5); }
.lm-pegboard { fill: #2c2238; }
.lm-peg-hole { fill: var(--dj-wall-a); }
.lm-radio-dial { fill: var(--lm-paper); }
.lm-radio-needle { stroke: var(--dj-awning); stroke-width: 2; }
.lm-radio-slot { stroke: var(--lm-metal-shade); stroke-width: 2; }
.lm-radio-leg { stroke: var(--lm-wood-shade); stroke-width: 4; }

/* material highlights and recesses */
.lm-brick-lit { fill: var(--lm-brick-lit); }
.lm-brick-shade { fill: var(--lm-brick-shade); }
.lm-wood-lit { fill: var(--lm-wood-lit); }
.lm-wood-shade { fill: var(--lm-wood-shade); }
.lm-metal-lit { fill: var(--lm-metal-lit); }
.lm-metal-shade { fill: var(--lm-metal-shade); }
.lm-stone-lit { fill: var(--lm-stone-lit); }
.lm-stone-shade { fill: var(--lm-stone-shade); }
.lm-awning-lit { fill: color-mix(in oklab, var(--dj-awning) 74%, white); }
.lm-awning-shade { fill: var(--lm-wood-shade); }
.dj-landmark--writing .lm-awning-lit { fill: color-mix(in oklab, var(--dj-flag-green) 48%, var(--lm-paper-lit)); }
.dj-landmark--writing .lm-awning-shade { fill: var(--lm-leaf-shade); }

/* chai stall dressing */
.lm-chalkboard rect { fill: #17251f; }
.lm-kettle,
.lm-stove,
.lm-cups { isolation: isolate; }
.lm-glass { fill: rgba(214, 240, 240, 0.24); stroke: rgba(255, 250, 240, 0.45); stroke-width: 1.2; }
.lm-glass-shade { fill: rgba(174, 204, 210, 0.2); stroke: rgba(255, 250, 240, 0.3); stroke-width: 1; }
.lm-glass-lit { fill: rgba(255, 253, 246, 0.55); }
.lm-tea { fill: color-mix(in oklab, var(--dj-awning) 62%, #3a1c0e); }
.lm-flag-red { fill: var(--dj-flag-red); }
.lm-flag-yellow { fill: var(--dj-flag-yellow); }
.lm-flag-green { fill: var(--dj-flag-green); }

/* flags, tools, radio */
.lm-flag {
  transform-box: fill-box;
  transform-origin: 0% 0%;
  animation: lm-flag-wave 3.2s ease-in-out infinite;
}
.lm-awning--metal { isolation: isolate; }
.lm-metal-awning { fill: var(--lm-metal-shade); }
.lm-metal-rib { fill: none; stroke: color-mix(in oklab, var(--lm-metal-shade) 60%, black); stroke-width: 1.5; opacity: 0.55; }
.lm-metal-lit { opacity: 0.6; }
.lm-peg { fill: var(--lm-metal-lit); }
.lm-tool { fill: none; stroke: var(--lm-metal-lit); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
.lm-tool-lit { fill: none; stroke: var(--lm-metal-lit); stroke-width: 3; stroke-linecap: round; }
.lm-handle { fill: var(--lm-wood); stroke: var(--lm-wood-shade); stroke-width: 1; }
.lm-gear { fill: var(--lm-metal-lit); }
.lm-plaque-dark { fill: var(--lm-wood-shade); stroke: var(--lm-brass); stroke-width: 1.4; }
.lm-sign-text--warm { fill: var(--lm-brass-lit); }
.lm-radio-body { fill: var(--lm-wood); stroke: var(--lm-brass-shade); stroke-width: 2; }
.lm-radio-lit { fill: var(--lm-wood-lit); }
.lm-radio-grille { fill: var(--lm-metal-shade); }
.lm-radio-line { fill: none; stroke: var(--lm-metal-lit); stroke-width: 1.5; opacity: 0.4; }
.lm-radio-base { fill: none; stroke: var(--lm-wood-shade); stroke-width: 4; }

/* garden + rooftop + night */
.lm-page { fill: var(--lm-paper-lit); }
.lm-stool path { fill: var(--lm-wood-fill); }
.lm-canopy { isolation: isolate; }
.lm-hills-far { fill: color-mix(in oklab, var(--dj-ridge-far-top) 70%, var(--dj-night-mid)); opacity: 0.5; }
.lm-hills { fill: color-mix(in oklab, var(--dj-ridge-mid-top) 74%, var(--dj-night-mid)); opacity: 0.7; }
.lm-skyline-far rect { fill: color-mix(in oklab, var(--dj-city-far) 72%, var(--dj-night-top)); opacity: 0.6; }
.lm-parapet-lit { fill: var(--lm-stone-lit); }
.lm-parapet-line { fill: none; stroke: color-mix(in oklab, var(--dj-ground) 60%, black); stroke-width: 2; opacity: 0.5; }
.lm-rail { fill: none; stroke: var(--lm-metal-shade); stroke-width: 3; opacity: 0.7; }
.lm-rail-post { fill: none; stroke: var(--lm-metal-shade); stroke-width: 4; opacity: 0.85; }
.lm-rail-shade { fill: none; stroke: var(--lm-metal-lit); stroke-width: 1; opacity: 0.25; }
.lm-dish-face { fill: var(--lm-metal); stroke: var(--lm-metal-lit); stroke-width: 1.5; }
.lm-tank-cap { fill: color-mix(in oklab, var(--lm-metal) 74%, var(--lm-metal-lit)); }
.lm-moon { fill: var(--lm-paper-lit); opacity: 0.94; }
.lm-moon-glow { fill: var(--lm-paper-lit); opacity: 0.12; }
.lm-moon-crater { fill: var(--lm-stone-shade); }
.lm-star { animation: lm-twinkle 4.6s ease-in-out infinite; }

/* motion */
.lm-steam path,
.lm-steam {
  fill: none;
  stroke: rgba(255, 248, 232, 0.55);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 3 9;
  animation: lm-steam 4.4s ease-out infinite;
}
.lm-steam path:nth-child(2) { animation-delay: 1.2s; }
.lm-steam path:nth-child(3) { animation-delay: 2.4s; }
.lm-sway {
  transform-box: fill-box;
  transform-origin: 50% 0%;
  animation: lm-sway 3.8s ease-in-out infinite;
}
.lm-pulse { animation: lm-pulse 3.2s ease-in-out infinite; }
.lm-blink { animation: lm-blink 2.6s steps(1, end) infinite; }
.lm-float { animation: lm-float 4.6s ease-in-out infinite; }
.lm-flutter { animation: lm-flutter 2.8s ease-in-out infinite; }
.lm-laundry { animation: lm-laundry 3.4s ease-in-out infinite; }
.lm-bell { animation: lm-bell 3.6s ease-in-out infinite; }
.lm-mote { animation: lm-mote 5.4s ease-in-out infinite; }
.lm-firefly { animation: lm-firefly 4.2s ease-in-out infinite; }
.lm-city-light { animation: lm-twinkle 3.8s ease-in-out infinite; }
.lm-spin { animation: lm-spin 7s linear infinite; transform-box: fill-box; transform-origin: center; }
.lm-node { animation: lm-node-pulse 4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }

@keyframes lm-steam {
  0% { opacity: 0; transform: translateY(8px) scale(0.9); }
  25% { opacity: 0.55; }
  100% { opacity: 0; transform: translateY(-24px) scale(1.12); }
}
@keyframes lm-sway {
  0%, 100% { transform: rotate(-1.6deg); }
  50% { transform: rotate(1.8deg); }
}
@keyframes lm-pulse {
  0%, 100% { opacity: 0.16; }
  50% { opacity: 0.4; }
}
@keyframes lm-blink {
  0%, 88%, 100% { opacity: 1; }
  90%, 96% { opacity: 0.25; }
}
@keyframes lm-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes lm-flutter {
  0%, 100% { transform: rotate(0deg) skewX(0deg); }
  50% { transform: rotate(-4deg) skewX(4deg); }
}
@keyframes lm-flag-wave {
  0%, 100% { transform: rotate(-2deg) scaleX(1); }
  50% { transform: rotate(3deg) scaleX(0.94); }
}
@keyframes lm-laundry {
  0%, 100% { transform: skewX(-2deg) rotate(-1deg); }
  50% { transform: skewX(3deg) rotate(1.5deg); }
}
@keyframes lm-bell {
  0%, 100% { transform: rotate(-4deg); }
  50% { transform: rotate(5deg); }
}
@keyframes lm-mote {
  0%, 100% { opacity: 0; transform: translateY(4px); }
  35% { opacity: 0.7; }
  70% { opacity: 0.2; transform: translateY(-9px); }
}
@keyframes lm-firefly {
  0%, 100% { opacity: 0; transform: translate(0, 0); }
  25% { opacity: 0.9; }
  50% { opacity: 0.35; transform: translate(7px, -8px); }
  75% { opacity: 0.8; transform: translate(-4px, -13px); }
}
@keyframes lm-twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
@keyframes lm-spin {
  to { transform: rotate(360deg); }
}
@keyframes lm-node-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

@media (max-width: 720px) {
  .dj-landmark {
    bottom: 88px;
    width: min(112vw, 620px);
    opacity: 0.82;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dj-landmark *,
  .dj-landmark {
    animation: none !important;
  }
}
</style>
