import type en from "./messages/en.json";

export type Dictionary = typeof en;

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends readonly unknown[]
      ? `${P}${K}`
      : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Dictionary>;
export type Vars = Record<string, string | number>;

function lookup(dict: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object" && part in node) return (node as Record<string, unknown>)[part];
    return undefined;
  }, dict);
}

export function createTranslator(dict: Dictionary) {
  function t(key: MessageKey, vars?: Vars): string {
    const value = lookup(dict, key);
    if (typeof value !== "string") return key;
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
  }
  /** Read a non-string node (arrays, objects) from the dictionary. */
  function raw<T = unknown>(key: MessageKey): T {
    return lookup(dict, key) as T;
  }
  return Object.assign(t, { raw });
}

export type Translator = ReturnType<typeof createTranslator>;
