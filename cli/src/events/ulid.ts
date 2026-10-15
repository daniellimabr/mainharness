// Minimal ULID (26 chars, Crockford base32): 48-bit time + 80-bit randomness.
import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function ulid(now = Date.now()): string {
  let time = "";
  let t = now;
  for (let i = 0; i < 10; i++) {
    time = ALPHABET[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const bytes = randomBytes(16);
  let rand = "";
  for (let i = 0; i < 16; i++) rand += ALPHABET[(bytes[i] ?? 0) % 32];
  return time + rand;
}

export const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
