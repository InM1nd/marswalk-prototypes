// Single source of truth for hub cards.
// Update `url` and `status` as each prototype ships —
// no other hub code needs to change.
//
// status: 'planned' | 'in_progress' | 'live'
//   'live' — card is clickable, links to url
//   otherwise — card is disabled, shows status badge

window.PROTOTYPES = [
  {
    id: 'wheel',
    accent: '#ff7a1a',
    icon: '🎡',
    title: 'Prize Wheel',
    subtitle: 'Spin mechanic',
    description: 'Branded performance game with lead capture: spin the wheel — get a promo code.',
    stack: ['pixi.js', 'gsap', 'React'],
    // TODO: swap to the deployed Vercel URL and flip to 'live' once prototype-1-wheel.md §7 is done.
    status: 'in_progress',
    url: '/wheel/',
    docHref: '../../prototype-1-wheel.md',
  },
  {
    id: 'scratch',
    accent: '#ff6a3d',
    icon: '🧧',
    title: 'Scratch Card',
    subtitle: 'Scratch mechanic',
    description: 'Drag to scratch off the cover and reveal your prize — standalone lead-capture game.',
    stack: ['pixi.js', 'gsap', 'React'],
    // TODO: swap to the deployed Vercel URL and flip to 'live' once prototype-1-wheel.md §7 is done.
    status: 'in_progress',
    url: '/scratch/',
    docHref: '../../prototype-1-wheel.md',
  },
  {
    id: 'lotto',
    accent: '#ff8a1f',
    icon: '🎰',
    title: 'Scratch Lotto',
    subtitle: 'Match-3 grid',
    description: 'Scratch each tile in a 3x3 grid — find 3 matching symbols to win a prize.',
    stack: ['pixi.js', 'gsap', 'React'],
    // TODO: swap to the deployed Vercel URL and flip to 'live' once prototype-1-wheel.md §7 is done.
    status: 'in_progress',
    url: '/scratch/lotto',
    docHref: '../../prototype-1-wheel.md',
  },
  {
    id: 'runner',
    accent: '#ff9a3d',
    icon: '🏃',
    title: 'Mini Runner',
    subtitle: 'Matching game',
    description: 'Physics-based arcade: obstacles, score, real-time branding.',
    stack: ['pixi.js', 'matter.js', 'React'],
    status: 'planned',
    url: '#',
    docHref: '../../prototype-2-runner.md',
  },
  {
    id: 'configurator',
    accent: '#ff8f1f',
    icon: '🧩',
    title: '3D Configurator',
    subtitle: 'Product customizer',
    description: 'Rotate a 3D product, change color/texture, add a logo — premium brand experience.',
    stack: ['three.js', 'R3F', 'drei'],
    status: 'planned',
    url: '#',
    docHref: '../../prototype-3-configurator.md',
  },
  {
    id: 'quiz',
    accent: '#ffb020',
    icon: '🔮',
    title: 'Personality Quiz',
    subtitle: '3D result',
    description: '5-7 branching questions → a personalized 3D result, ready to share.',
    stack: ['Next.js', 'three.js', 'framer-motion'],
    status: 'planned',
    url: '#',
    docHref: '../../prototype-4-quiz.md',
  },
];
