import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/messages/en.json";
import it_ from "@/lib/i18n/messages/it.json";
import sq from "@/lib/i18n/messages/sq.json";
import { switchLocalePath } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/translate";

function keys(node: unknown, prefix = ""): string[] {
  if (node === null || typeof node !== "object" || Array.isArray(node)) return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("i18n", () => {
  it.each([
    ["sq", sq],
    ["it", it_],
  ])("%s has exactly the same keys as en", (_, dict) => {
    expect(keys(dict).sort()).toEqual(keys(en).sort());
  });

  it("interpolates variables and falls back to the key", () => {
    const t = createTranslator(en);
    expect(t("floors.floor", { n: 7 })).toBe("Floor 7");
    expect(t("nope.missing" as never)).toBe("nope.missing");
  });

  it("switches the locale segment of a path", () => {
    expect(switchLocalePath("/en/units/07-B", "sq")).toBe("/sq/units/07-B");
    expect(switchLocalePath("/en", "it")).toBe("/it");
  });
});
