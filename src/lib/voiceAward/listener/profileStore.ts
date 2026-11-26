/**
 * The teacher's voice profile lives only in this browser: IndexedDB database
 * "hec-voice-award", object store "profiles", key = user id. It is never uploaded.
 */
import type { VoiceprintProfile } from "../listenerApi";

const DB = "hec-voice-award";
const STORE = "profiles";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("This browser cannot keep a voice profile (no IndexedDB).")); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open the voice profile store."));
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const r = run(t.objectStore(STORE));
      t.oncomplete = () => resolve(r.result);
      t.onerror = () => reject(t.error ?? r.error);
      t.onabort = () => reject(t.error ?? new Error("The voice profile store was interrupted."));
    });
  } finally {
    db.close();
  }
}

export async function loadProfile(userId: string): Promise<VoiceprintProfile | null> {
  try {
    const v = await tx<unknown>("readonly", (s) => s.get(userId));
    const p = v as VoiceprintProfile | undefined;
    if (!p || p.version !== 1 || p.userId !== userId || !Array.isArray(p.embedding) || !Array.isArray(p.wakeTemplates)) return null;
    return p;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: VoiceprintProfile): Promise<void> {
  await tx("readwrite", (s) => s.put(profile, profile.userId));
}

export async function deleteProfile(userId: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(userId));
}
