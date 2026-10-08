type HeldKey = { fingerprint: string; key: string };

export type RequestKeys = { keyFor: (fingerprint: string) => string; release: () => void };

export function createRequestKeys(): RequestKeys {
  let held: HeldKey | null = null;
  return {
    keyFor(fingerprint) {
      if (held?.fingerprint !== fingerprint) held = { fingerprint, key: crypto.randomUUID() };
      return held.key;
    },
    release() {
      held = null;
    },
  };
}
