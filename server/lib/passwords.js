import crypto from "node:crypto";

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, passwordHash) {
  if (typeof password !== "string" || typeof passwordHash !== "string") return false;

  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) return false;

  const derivedHash = crypto.scryptSync(password, salt, KEY_LENGTH);
  const storedHashBuffer = Buffer.from(storedHash, "hex");
  return storedHashBuffer.length === derivedHash.length
    && crypto.timingSafeEqual(storedHashBuffer, derivedHash);
}
