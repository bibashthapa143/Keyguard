/**
 * In-memory LRU-style cache for HIBP range responses.
 * Prevents redundant network calls when testing passwords sharing a 5-char prefix.
 */
const prefixCache = new Map();

/**
 * Calculates SHA-1 hex digest using native browser Web Crypto API
 * @param {string} text 
 * @returns {Promise<string>} 40-character uppercase hexadecimal string
 */
export async function calculateSha1(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Checks HaveIBeenPwned API using the k-anonymity privacy model.
 * Only the first 5 hexadecimal characters of the SHA-1 hash leave the browser.
 * @param {string} password 
 * @param {AbortSignal} [signal] Optional abort signal for debounced cancellation
 * @returns {Promise<{ fullHash: string, prefix: string, count: number }>}
 */
export async function checkBreachStatus(password, signal) {
  if (!password) {
    return { fullHash: "", prefix: "", count: 0 };
  }

  const fullHash = await calculateSha1(password);
  const prefix = fullHash.slice(0, 5);
  const suffix = fullHash.slice(5);

  let responseText = prefixCache.get(prefix);

  if (!responseText) {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        "Add-Padding": "true", // Mitigates response-length side-channel analysis
      },
      signal,
    });

    if (!res.ok) {
      throw new Error(`HIBP query failed with status ${res.status}`);
    }

    responseText = await res.text();
    prefixCache.set(prefix, responseText);
  }

  const lines = responseText.split("\n");
  let count = 0;

  for (const line of lines) {
    const [lineSuffix, countStr] = line.split(":");
    if (lineSuffix && lineSuffix.trim() === suffix) {
      count = parseInt(countStr.trim(), 10);
      break;
    }
  }

  return { fullHash, prefix, count };
}

