import { JSONFilePreset } from "lowdb/node";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { freshSeed } from "./seed.js";
import { hashPassword } from "./passwords.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const dbPath = path.resolve(here, "../../data/db.json");

export async function createDb(file = dbPath) {
  await mkdir(path.dirname(file), { recursive: true });
  const db = await JSONFilePreset(file, freshSeed());
  if (!db.data.users?.length) {
    db.data = freshSeed();
    await db.write();
  }
  for (const user of db.data.users) {
    if (typeof user.password === "string" && !user.passwordHash) {
      user.passwordHash = hashPassword(user.password);
      delete user.password;
    }
  }
  // Persist a newly seeded datastore and any password migration before it is used.
  await db.write();
  return db;
}
