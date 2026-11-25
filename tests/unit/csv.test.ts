import { describe, expect, it } from "vitest";
import { toCsv } from "@/components/admin/LeadsBoard";
import { createSeedState } from "@/domain/seed";

describe("lead CSV export", () => {
  it("escapes commas, quotes and newlines", () => {
    const [lead] = createSeedState(0).leads;
    const csv = toCsv([{ ...lead, message: 'Hi, "quoted"\nline' }]);
    const [header, row] = csv.split("\n", 2);
    expect(header.startsWith("id,created_at,name")).toBe(true);
    expect(row).toContain('"Hi, ""quoted""');
  });
});
