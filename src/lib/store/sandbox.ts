import type { Ctx, Result } from "@/domain/commands";
import { createSeedState, SCHEMA_VERSION, type SandboxState } from "@/domain/seed";

/**
 * Browser "backend" for the demo.
 *
 * - State is persisted in localStorage, so every visitor gets a private sandbox.
 * - Writes run inside a Web Locks API lock and always re-read the latest
 *   persisted state first, so two tabs can't overwrite each other's changes.
 * - Unit writes carry an expected version (optimistic locking): if another tab
 *   changed the unit in the meantime the command fails with `conflict`.
 * - Changes are broadcast to other tabs (BroadcastChannel + storage event),
 *   which gives the picker live updates when the back office changes a unit.
 */

const STORAGE_KEY = `floorline:sandbox:v${SCHEMA_VERSION}`;
const CHANNEL = "floorline";
const LOCK = "floorline-sandbox";

export interface ChangeSignal {
  codes: string[];
  origin: "local" | "remote";
  at: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let current: SandboxState | null = null;
let channel: BroadcastChannel | null = null;
let lastChange: ChangeSignal | null = null;
let wired = false;

/** Deterministic seed used for server rendering and hydration. */
const SERVER_STATE: SandboxState = createSeedState(0);

const isBrowser = () => typeof window !== "undefined";

function readPersisted(): SandboxState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SandboxState;
    if (parsed?.schema !== SCHEMA_VERSION || typeof parsed.units !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: SandboxState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode): keep working in memory.
  }
}

function changedCodes(prev: SandboxState | null, next: SandboxState): string[] {
  if (!prev) return [];
  return Object.keys(next.units).filter((code) => {
    const a = prev.units[code];
    const b = next.units[code];
    return !a || a.version !== b.version;
  });
}

function setState(next: SandboxState, origin: ChangeSignal["origin"]) {
  const codes = changedCodes(current, next);
  current = next;
  if (codes.length) lastChange = { codes, origin, at: Date.now() };
  listeners.forEach((l) => l());
}

function syncFromStorage() {
  const latest = readPersisted();
  if (latest && latest !== current) setState(latest, "remote");
}

function wire() {
  if (wired || !isBrowser()) return;
  wired = true;
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => syncFromStorage();
  }
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) syncFromStorage();
  });
}

export function getSnapshot(): SandboxState {
  if (!isBrowser()) return SERVER_STATE;
  if (!current) {
    current = readPersisted() ?? createSeedState(Date.now());
    persist(current);
  }
  return current;
}

export const getServerSnapshot = (): SandboxState => SERVER_STATE;

export function subscribe(listener: Listener): () => void {
  wire();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getLastChange = () => lastChange;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

async function withLock<T>(fn: () => T): Promise<T> {
  if (isBrowser() && "locks" in navigator && navigator.locks) {
    return navigator.locks.request(LOCK, async () => fn());
  }
  return fn();
}

/** Run a pure command as a transaction against the latest persisted state. */
export function dispatch<T>(command: (state: SandboxState, ctx: Ctx) => Result<T>): Promise<Result<T>> {
  return withLock(() => {
    const latest = readPersisted() ?? getSnapshot();
    const result = command(latest, { now: Date.now(), id: newId });
    if (result.ok && result.state !== latest) {
      persist(result.state);
      setState(result.state, "local");
      channel?.postMessage({ type: "changed" });
    }
    return result;
  });
}

export function resetSandbox() {
  const fresh = createSeedState(Date.now());
  persist(fresh);
  setState(fresh, "local");
  channel?.postMessage({ type: "reset" });
}
