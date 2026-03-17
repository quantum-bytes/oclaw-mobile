// Polyfill crypto.getRandomValues for Hermes (React Native)
// Uses Math.random as fallback — sufficient for UUID generation and non-critical crypto.
// Device signing will gracefully degrade (returns null) if proper crypto is unavailable.
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {};
}

if (typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto.getRandomValues = function <T extends ArrayBufferView>(array: T): T {
    const bytes = array as unknown as Uint8Array;
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}
