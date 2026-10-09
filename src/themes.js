// Témacsomagok: járművek és dinók.
// A `flip` azt jelzi, hogy az emojit tükrözni kell-e, hogy jobbra (a cél felé) nézzen.
// (Android / Noto emoji készleten a járművek többsége balra néz.)

export const THEMES = {
  jarmu: {
    id: 'jarmu',
    name: 'Járművek',
    runners: [
      { e: '🚒', flip: true },
      { e: '🚜', flip: true },
      { e: '🚛', flip: true },
      { e: '🚌', flip: true },
      { e: '🚓', flip: true },
    ],
    goal: '🏁',
    trackDeco: ['🚧', '🚦', '🌳'],
    stickers: ['🚒', '🚓', '🚑', '🚜', '🚂', '🚀', '🏎️', '🚁', '🚛', '🛻'],
    cheers: ['Brrrm! Ügyes vagy!', 'Tűtű! Szuper!', 'Teljes gázzal! Ügyes!', 'Szuper sofőr vagy!'],
    finish: ['Célba értünk! Szuper vagy!', 'Megérkezett a tűzoltóautó! Bravó!'],
    sound: 'siren',
    confetti: ['🚒', '⭐', '🚜', '🏁', '🚓'],
  },
  dino: {
    id: 'dino',
    name: 'Dinók',
    runners: [
      { e: '🦖', flip: true },
      { e: '🦕', flip: true },
    ],
    goal: '🥚',
    trackDeco: ['🌴', '🌋', '🌿'],
    stickers: ['🦖', '🦕', '🥚', '🌋', '🐊', '🐢', '🦎', '🌴'],
    cheers: ['Rrrrooar! Ügyes!', 'Dínó-szuper!', 'Hatalmas dínólépés!', 'Rrroar! Bravó!'],
    finish: ['Megtaláltuk a dínótojást! Szuper vagy!', 'Rrrooaar! Kész vagyunk!'],
    sound: 'roar',
    confetti: ['🦖', '🦕', '⭐', '🥚', '🌴'],
  },
};

export function pickRunner(theme, seed = '') {
  const n = [...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return theme.runners[n % theme.runners.length];
}

export const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
