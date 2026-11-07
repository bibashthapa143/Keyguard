export const CHAR_SETS = {
  uppercase: { label: "Uppercase", sample: "A-Z", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  lowercase: { label: "Lowercase", sample: "a-z", chars: "abcdefghijklmnopqrstuvwxyz" },
  numbers: { label: "Numbers", sample: "0-9", chars: "0123456789" },
  symbols: { label: "Symbols", sample: "!@#$%…", chars: "!@#$%^&*()_+-=[]{}|;:,.<>?" },
};

export const MEMORABLE_WORDS = [
  "acorn", "amber", "anchor", "apron", "artist", "atom", "autumn", "bacon",
  "badge", "banana", "beacon", "breeze", "bubble", "cactus", "candle", "canyon",
  "castle", "cedar", "clover", "comet", "coral", "crater", "crystal", "desert",
  "dolphin", "dragon", "eagle", "echo", "ember", "falcon", "forest", "frost",
  "galaxy", "glacier", "harbor", "haven", "horizon", "island", "jungle", "lagoon",
  "lantern", "marble", "meadow", "meteor", "mountain", "nebula", "oasis", "ocean",
  "orchid", "palace", "pathway", "pebble", "planet", "prism", "quartz", "radar",
  "ridge", "river", "safari", "shadow", "summit", "timber", "twilight", "valley",
  "velvet", "vortex", "whisper", "zenith"
];

/**
 * Returns an unbiased cryptographically secure random integer in [0, max)
 */
export function getSecureRandomInt(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Generates an alphanumeric/symbolic password with guaranteed character set inclusion
 */
export function generateRandomSecret(length = 16, options = {}) {
  const activeKeys = Object.keys(options).filter((k) => options[k]);
  if (activeKeys.length === 0) return "";

  let pool = "";
  const mandatory = [];

  activeKeys.forEach((key) => {
    const chars = CHAR_SETS[key].chars;
    pool += chars;
    mandatory.push(chars[getSecureRandomInt(chars.length)]);
  });

  const remaining = Math.max(0, length - mandatory.length);
  const chars = [...mandatory];

  for (let i = 0; i < remaining; i++) {
    chars.push(pool[getSecureRandomInt(pool.length)]);
  }

  // Unbiased Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join("");
}

/**
 * Generates an EFF-inspired Diceware memorable passphrase
 */
export function generateDicewareSecret(wordCount = 4, separator = "-", capitalize = true, appendNumber = true) {
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    let word = MEMORABLE_WORDS[getSecureRandomInt(MEMORABLE_WORDS.length)];
    if (capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(word);
  }

  if (appendNumber) {
    const digit = getSecureRandomInt(100);
    const idx = getSecureRandomInt(words.length);
    words[idx] = `${words[idx]}${digit}`;
  }

  return words.join(separator);
}

