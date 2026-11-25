import type { Actor } from "@/domain/types";

/** Per-visitor preferences: favorites, compare list, demo sign-in. */
export interface Prefs {
  favorites: string[];
  compare: string[];
  actor: Actor | null;
  leadSubmissions: number[];
}

const KEY = "floorline:prefs:v1";
const EMPTY: Prefs = { favorites: [], compare: [], actor: null, leadSubmissions: [] };
export const MAX_COMPARE = 3;

const listeners = new Set<() => void>();
let current: Prefs | null = null;
let wired = false;

function read(): Prefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Prefs>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function getPrefs(): Prefs {
  if (typeof window === "undefined") return EMPTY;
  if (!current) current = read();
  return current;
}

export const getServerPrefs = () => EMPTY;

export function subscribePrefs(listener: () => void) {
  if (!wired && typeof window !== "undefined") {
    wired = true;
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) {
        current = read();
        listeners.forEach((l) => l());
      }
    });
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updatePrefs(fn: (p: Prefs) => Prefs) {
  const next = fn(getPrefs());
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore — preferences are best-effort
  }
  listeners.forEach((l) => l());
}

export const toggleIn = (list: string[], code: string, max = Infinity) =>
  list.includes(code) ? list.filter((c) => c !== code) : list.length >= max ? list : [...list, code];
