/**
 * Clean voice recognition speech artifacts and duplicate stutter/echo phrases.
 */
export function cleanVoiceTranscript(rawText: string): string {
  if (!rawText || !rawText.trim()) return '';

  // Normalize spaces
  let text = rawText.replace(/\s+/g, ' ').trim();

  // Split into words
  let words = text.split(' ').filter(Boolean);
  if (words.length <= 1) return text;

  // 1. Remove immediate duplicate adjacent single words (e.g. "cuaderno cuaderno" -> "cuaderno")
  const dedupedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const current = words[i];
    const prev = dedupedWords[dedupedWords.length - 1];
    if (prev && prev.toLowerCase() === current.toLowerCase()) {
      continue;
    }
    dedupedWords.push(current);
  }
  words = dedupedWords;
  text = words.join(' ');

  // 2. Remove identical halves: "Frase A Frase A" -> "Frase A"
  if (words.length >= 4 && words.length % 2 === 0) {
    const half = words.length / 2;
    const firstHalf = words.slice(0, half).join(' ');
    const secondHalf = words.slice(half).join(' ');
    if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
      return firstHalf;
    }
  }

  // 3. Remove repeated chunks of length 2 to 10 words
  for (let len = 10; len >= 2; len--) {
    let changed = true;
    while (changed) {
      changed = false;
      if (words.length < len * 2) break;

      for (let i = 0; i <= words.length - len * 2; i++) {
        const chunk1 = words.slice(i, i + len).join(' ').toLowerCase();
        const chunk2 = words.slice(i + len, i + len * 2).join(' ').toLowerCase();

        if (chunk1 === chunk2) {
          // Remove chunk2
          words.splice(i + len, len);
          changed = true;
          break;
        }
      }
    }
  }

  return words.join(' ');
}
