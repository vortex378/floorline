import { z } from "zod";
import { CONTACT_METHODS, LEAD_SOURCES } from "./types";

const phoneRe = /^\+?[0-9][0-9\s().-]{6,19}$/;

/** Shared by the client form and the command layer. Messages are i18n keys. */
export const leadInputSchema = z.object({
  name: z.string().trim().min(2, "name_min").max(80, "too_long"),
  phone: z.string().trim().regex(phoneRe, "phone_invalid"),
  email: z.union([z.literal(""), z.string().trim().email("email_invalid")]),
  preferredContact: z.enum(CONTACT_METHODS),
  locale: z.string().min(2).max(5),
  message: z.string().trim().max(1000, "too_long").default(""),
  unitCodes: z.array(z.string()).max(3).default([]),
  source: z.enum(LEAD_SOURCES),
  consent: z.literal(true, { error: "consent_required" }),
  /** Honeypot. Hidden from humans. */
  company: z.string().optional().default(""),
}).refine((v) => v.preferredContact !== "email" || v.email.length > 0, {
  path: ["email"],
  message: "email_required",
});

export type LeadInput = z.output<typeof leadInputSchema>;
