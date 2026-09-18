// Crypto helpers for client-side encryption (AES-GCM) and key derivation (PBKDF2)
// All run in browser via Web Crypto API

const PBKDF2_ITERATIONS = 100_000;
const SALT_KEY = "dompetku_salt";
const KEY_STORAGE = new Map<string, CryptoKey>(); // in-memory only

/** Get or create a stable salt for this device (stored in localStorage) */
export function getDeviceSalt(): Uint8Array {
  if (typeof window === "undefined") return new Uint8Array(16);
  let stored = window.localStorage.getItem(SALT_KEY);
  if (!stored) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    stored = Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    window.localStorage.setItem(SALT_KEY, stored);
  }
  const arr = new Uint8Array(stored.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(stored.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

/** Derive an AES key from a password/PIN using PBKDF2 (100k iterations) */
export async function deriveKey(
  password: string,
  salt: Uint8Array = getDeviceSalt()
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return key;
}

/** Cache a derived key in memory (not persisted) */
export function cacheKey(id: string, key: CryptoKey) {
  KEY_STORAGE.set(id, key);
}

/** Get cached key */
export function getCachedKey(id: string): CryptoKey | undefined {
  return KEY_STORAGE.get(id);
}

/** Clear all cached keys (on lock / logout) */
export function clearCachedKeys() {
  KEY_STORAGE.clear();
}

/** Hash a PIN/password for verification (separate from encryption key) */
export async function hashSecret(secret: string): Promise<string> {
  const salt = getDeviceSalt();
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array([...enc.encode(secret), ...salt])
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string comparison (anti timing attack) */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Encrypt a string with AES-GCM. Returns base64 of iv+ciphertext */
export async function encryptString(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt a base64 string (iv+ciphertext) with AES-GCM */
export async function decryptString(
  b64: string,
  key: CryptoKey
): Promise<string> {
  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const buf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(buf);
}

/** Encrypt JSON-serializable data */
export async function encryptJSON(
  data: unknown,
  key: CryptoKey
): Promise<string> {
  return encryptString(JSON.stringify(data), key);
}

/** Decrypt to JSON object */
export async function decryptJSON<T = unknown>(
  b64: string,
  key: CryptoKey
): Promise<T> {
  const text = await decryptString(b64, key);
  return JSON.parse(text) as T;
}

/** Generate a 12-word recovery mnemonic (BIP-39 style, simplified) */
const WORDLIST = [
  "abadi", "buku", "cinta", "daun", "emas", "fajar", "gajah", "hutan",
  "ikan", "jalan", "kota", "laut", "mata", "nama", "opera", "padi",
  "qari", "rina", "satu", "tani", "ujung", "viral", "warna", "xaus",
  "yang", "zaman", "aman", "biru", "cuci", "dari", "eko", "fiksi",
  "gula", "hitam", "indah", "jadi", "kali", "lupa", "muka", "nakal",
];

export function generateRecoveryPhrase(): string {
  const words: string[] = [];
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  for (let i = 0; i < 12; i++) {
    words.push(WORDLIST[bytes[i] % WORDLIST.length]);
  }
  return words.join(" ");
}

/** Validate recovery phrase format (12 space-separated words) */
export function validateRecoveryPhrase(phrase: string): boolean {
  const words = phrase.trim().toLowerCase().split(/\s+/);
  if (words.length !== 12) return false;
  return words.every((w) => WORDLIST.includes(w));
}

/** Generate device fingerprint (stable per browser) */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof navigator === "undefined") return "server";
  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    new Date().getTimezoneOffset().toString(),
    (navigator.hardwareConcurrency || 0).toString(),
    (navigator.deviceMemory || 0).toString(),
  ];
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(components.join("|")));
  return Array.from(new Uint8Array(buf))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
