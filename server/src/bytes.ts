// Byte helpers that work the same in Node and in a browser worker (the
// in-browser demo runs these stores too), so the stores need neither Buffer
// nor node:crypto.

export const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export const latin1 = (b: Uint8Array): string => String.fromCharCode(...b);

/** n random bytes as hex. Web Crypto exists in Node 24 and in every browser worker. */
export const randomHex = (n: number): string => hex(crypto.getRandomValues(new Uint8Array(n)));
