/**
 * Applies bionic reading formatting by wrapping the first half of each word in a <b> tag.
 * Guides the eye smoothly through words without visual clutter.
 */
export function formatBionicText(text: string): string {
  if (!text) return '';

  return text
    .split('\n')
    .map((paragraph) => {
      if (!paragraph.trim()) return '';

      const words = paragraph.split(/(\s+)/);
      const bionicWords = words.map((token) => {
        // If whitespace or punctuation only, leave as is
        if (/^\s+$/.test(token) || !/[a-zA-Z0-9]/.test(token)) {
          return token;
        }

        // Separate leading and trailing punctuation
        const match = token.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9]+)([^a-zA-Z0-9]*)$/);
        if (!match) return token;

        const [, prefix, word, suffix] = match;
        const len = word.length;
        
        let fixationLength = 1;
        if (len > 3) fixationLength = Math.ceil(len * 0.45);
        else if (len === 3) fixationLength = 2;
        else if (len === 2) fixationLength = 1;

        const boldPart = word.slice(0, fixationLength);
        const restPart = word.slice(fixationLength);

        return `${prefix}<b>${boldPart}</b>${restPart}${suffix}`;
      });

      return bionicWords.join('');
    })
    .join('\n');
}

export function countWords(text: string): number {
  if (!text) return 0;
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

export function countCharacters(text: string): number {
  return text ? text.length : 0;
}

export function estimateReadingTimeMinutes(wordCount: number): number {
  // Comfortable dyslexic reading rate is ~140-160 words per minute
  return Math.max(1, Math.ceil(wordCount / 150));
}
