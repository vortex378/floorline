"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { UNITS } from "@/domain/catalog";
import type { Unit } from "@/domain/types";
import { getLastChange, getServerSnapshot, getSnapshot, subscribe } from "./sandbox";
import { getPrefs, getServerPrefs, subscribePrefs } from "./prefs";

export function useSandbox() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useUnits(): Unit[] {
  const state = useSandbox();
  return useMemo(() => UNITS.map((u) => ({ ...u, ...state.units[u.code] })), [state.units]);
}

export function useUnit(code: string): Unit | undefined {
  const units = useUnits();
  return useMemo(() => units.find((u) => u.code === code), [units, code]);
}

export function usePrefs() {
  return useSyncExternalStore(subscribePrefs, getPrefs, getServerPrefs);
}

/** True once the component has hydrated (client-only values are safe to show). */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const NO_CODES: ReadonlySet<string> = new Set();

/**
 * Codes changed by another tab within the last few seconds.
 * Used to pulse units in the picker when the back office updates them.
 */
export function useRemoteChanges(windowMs = 3500): ReadonlySet<string> {
  useSandbox();
  const change = getLastChange();
  const [clock, setClock] = useState(0);
  const [active, setActive] = useState<ReadonlySet<string>>(NO_CODES);
  useEffect(() => {
    if (!change || change.origin !== "remote") return;
    const remaining = windowMs - (Date.now() - change.at);
    if (remaining <= 0) return;
    const show = setTimeout(() => setActive(new Set(change.codes)), 0);
    const hide = setTimeout(() => {
      setActive(NO_CODES);
      setClock((c) => c + 1);
    }, remaining);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [change, windowMs, clock]);
  return active;
}
