/**
 * Cornish Speech Naturalizer & Phonetic Alignment Engine
 *
 * Transforms standard English text into authentic Anglo-Cornish (Kernow / West Country)
 * phonetics, intonation contours, and rhythmic cadence when spoken by British English TTS voices.
 * Preserves exact token offsets so original text word-by-word dyslexia highlighting is 100% synced!
 */

export interface TokenMapping {
  originalWord: string;
  originalStart: number;
  originalLength: number;
  spokenWord: string;
}

export interface CornishSentenceSegment {
  originalText: string;
  spokenText: string;
  charOffset: number;
  tokenMap: TokenMapping[];
  pitch: number;
  pauseAfterMs: number;
  isQuestion: boolean;
}

// Specialized Cornish phonetic transformations
// Designed so British English TTS engines naturally curl the 'r' (rhoticity),
// soften vowels, and deliver the musical sing-song cadence of Cornwall.
const CORNISH_PHONETIC_DICTIONARY: Record<string, string> = {
  // Common sight words & nouns
  water: 'waht-urr',
  morning: 'mawr-nin',
  warm: 'wahrrm',
  harbor: 'hahrr-burr',
  harbour: 'hahrr-burr',
  farmer: 'fahrr-murr',
  farm: 'fahrrm',
  garden: 'gahrr-den',
  yard: 'yahrrd',
  park: 'parrk',
  start: 'starrt',
  part: 'parrt',
  party: 'parr-tee',
  heart: 'hahrrt',
  hard: 'hahrrd',
  hardly: 'hahrrd-lee',
  dark: 'dahrrk',
  car: 'cahrr',
  far: 'fahrr',
  bar: 'bahrr',
  star: 'stahrr',
  stars: 'stahrrz',
  river: 'rivv-urr',
  after: 'aahf-turr',
  father: 'faah-thurr',
  mother: 'muth-urr',
  brother: 'bruth-urr',
  sister: 'sist-urr',
  other: 'uth-urr',
  another: 'an-uth-urr',
  together: 'to-geth-urr',
  weather: 'wehh-thurr',
  never: 'nevv-urr',
  ever: 'evv-urr',
  forever: 'for-evv-urr',
  over: 'oh-vurr',
  under: 'un-durr',
  winter: 'win-turr',
  summer: 'sum-murr',
  butter: 'butt-urr',
  better: 'bett-urr',
  letter: 'lett-urr',
  clever: 'clevv-urr',
  silver: 'sil-vurr',
  copper: 'caw-purr',
  flower: 'flow-urr',
  flowers: 'flow-urrz',
  power: 'pow-urr',
  tower: 'tow-urr',
  shower: 'show-urr',
  hour: 'ow-urr',
  hours: 'ow-urrz',
  our: 'ow-urr',
  clear: 'clee-yur',
  clearly: 'clee-yur-lee',
  near: 'nee-yur',
  nearly: 'nee-yur-lee',
  dear: 'dee-yur',
  fear: 'fee-yur',
  year: 'yee-yur',
  years: 'yee-yurz',
  here: 'hee-yur',
  there: 'theh-urr',
  where: 'weh-urr',
  somewhere: 'sum-weh-urr',
  nowhere: 'noh-weh-urr',
  everywhere: 'ev-ree-weh-urr',
  first: 'furrst',
  girl: 'gurrrl',
  girls: 'gurrrlz',
  world: 'wurrld',
  word: 'wurrrd',
  words: 'wurrrdz',
  work: 'wurr-rk',
  working: 'wurr-kin',
  turn: 'turrn',
  turned: 'turrnd',
  turning: 'turr-nin',
  burn: 'burrn',
  burning: 'burr-nin',
  learn: 'lurr-n',
  learning: 'lurr-nin',
  earth: 'urr-th',
  short: 'shawrt',
  corn: 'cawrn',
  storm: 'stawrm',
  north: 'nawrrth',
  port: 'pawrt',
  before: 'be-fawrr',
  more: 'mawrr',
  door: 'dawrr',
  floor: 'flawrr',
  four: 'fawrr',
  poor: 'pawrr',
  sure: 'shoorr',
  nature: 'nay-churr',
  picture: 'pik-churr',
  pleasure: 'plezh-urr',
  measure: 'mezh-urr',
  treasure: 'trezh-urr',
  leisure: 'lezh-urr',
  right: 'roight',
  night: 'noight',
  light: 'loight',
  sunlight: 'zun-loight',
  bright: 'broight',
  sight: 'soight',
  white: 'woyt',
  quiet: 'kwoy-ut',
  quietly: 'kwoy-ut-lee',
  little: 'liddle',
  proper: 'praw-purr',
  path: 'paahth',
  paths: 'paahths',
  grass: 'graahs',
  glass: 'glaahs',
  past: 'paahst',
  fast: 'faahst',
  last: 'laahst',
  ask: 'aahsk',
  asked: 'aahskt',
  asking: 'aahs-kin',
  "can't": "caahn't",
  cannot: 'caahn-not',
  dance: 'daahns',
  dancing: 'daahn-sin',
  chance: 'chaahns',
  branch: 'braahnch',
  branches: 'braahn-chuz',
  valley: 'vall-ee',
  clover: 'cloh-vurr',
  honey: 'hunn-ee',
  stone: 'stoh-un',
  ancient: 'ayn-shunt',
  peaceful: 'peess-full',
  peacefully: 'peess-fuh-lee',
  effortless: 'eff-urt-lus',
  cliffs: 'cluffs',
  cliff: 'cluff',
  sea: 'zee',
  sun: 'zun',
  shining: 'shoy-nin',
  whispering: 'wiss-purr-in',
  carrying: 'carr-ee-in',
  breeze: 'bree-uz',
  breezes: 'bree-zuz',
  trees: 'tree-uz',
  reading: 'reed-in',
  spelling: 'spell-in',
};

/**
 * Phonetically transforms an individual word into Cornish dialect pronunciation
 */
export function naturalizeCornishWord(word: string): string {
  // Preserve punctuation
  const match = word.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9'-]+)([^a-zA-Z0-9]*)$/);
  if (!match) return word;

  const prefix = match[1];
  const core = match[2];
  const suffix = match[3];

  const lower = core.toLowerCase();

  // 1. Direct dictionary match
  if (CORNISH_PHONETIC_DICTIONARY[lower]) {
    const replacement = CORNISH_PHONETIC_DICTIONARY[lower];
    // Preserve initial capitalization if present
    if (core[0] === core[0].toUpperCase()) {
      return prefix + replacement.charAt(0).toUpperCase() + replacement.slice(1) + suffix;
    }
    return prefix + replacement + suffix;
  }

  // 2. Rule-based Cornish rhoticity: words ending in 'er', 'ers'
  if (lower.length > 4 && lower.endsWith('ers')) {
    const stem = core.slice(0, -3);
    return prefix + stem + 'urrz' + suffix;
  }
  if (lower.length > 3 && lower.endsWith('er')) {
    const stem = core.slice(0, -2);
    return prefix + stem + 'urr' + suffix;
  }

  // 3. Rule-based: present participles ending in 'ing' -> 'in'
  if (lower.length > 5 && lower.endsWith('ing') && !['thing', 'bring', 'spring', 'ring', 'sing', 'king', 'wing'].includes(lower)) {
    const stem = core.slice(0, -3);
    return prefix + stem + 'in' + suffix;
  }

  // 4. Words ending in 'ight' (e.g. sight, flight, bright)
  if (lower.endsWith('ight') && lower.length > 4) {
    const stem = core.slice(0, -4);
    return prefix + stem + 'oight' + suffix;
  }

  return word;
}

/**
 * Parses full document into Cornish sentence segments with token alignment
 */
export function buildCornishSegments(
  rawText: string,
  accentEnabled: boolean = true
): CornishSentenceSegment[] {
  const segments: CornishSentenceSegment[] = [];
  const sentenceRegex = /([^.!?\n]+[.!?\n]+|[^.!?\n]+$)/g;
  let match: RegExpExecArray | null;

  while ((match = sentenceRegex.exec(rawText)) !== null) {
    const sentenceText = match[0];
    const charOffset = match.index;
    const trimmed = sentenceText.trim();
    if (!trimmed) continue;

    const isQuestion = sentenceText.includes('?');
    const isExclamation = sentenceText.includes('!');

    // Break sentence into words and build token map
    const tokenMap: TokenMapping[] = [];
    const spokenWords: string[] = [];
    const wordRegex = /\S+/g;
    let wordMatch: RegExpExecArray | null;

    while ((wordMatch = wordRegex.exec(sentenceText)) !== null) {
      const originalWord = wordMatch[0];
      const relativeWordStart = wordMatch.index;
      const spokenWord = accentEnabled ? naturalizeCornishWord(originalWord) : originalWord;

      tokenMap.push({
        originalWord,
        originalStart: charOffset + relativeWordStart,
        originalLength: originalWord.length,
        spokenWord,
      });

      spokenWords.push(spokenWord);
    }

    // Cornish melodic cadence:
    // Questions have a warm, melodic sing-song rise (~1.14)
    // Exclamations have bright West Country warmth (~1.10)
    // Declaratives start with warm lift and settle into friendly cadence (~1.06)
    const pitch = isQuestion ? 1.14 : isExclamation ? 1.10 : 1.06;

    // Human breath pauses: ~240ms after sentences, ~320ms after paragraph breaks
    const pauseAfterMs = sentenceText.includes('\n') ? 320 : 230;

    segments.push({
      originalText: trimmed,
      spokenText: spokenWords.join(' '),
      charOffset,
      tokenMap,
      pitch,
      pauseAfterMs,
      isQuestion,
    });
  }

  return segments;
}
