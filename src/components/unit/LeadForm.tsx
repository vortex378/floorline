"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitLead } from "@/domain/commands";
import { leadInputSchema } from "@/domain/leads";
import { CONTACT_METHODS, type ContactMethod, type LeadSource } from "@/domain/types";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { getPrefs, updatePrefs } from "@/lib/store/prefs";
import { dispatch } from "@/lib/store/sandbox";

interface LeadFormProps {
  unitCodes: string[];
  source: LeadSource;
  onDone?: () => void;
  compact?: boolean;
}

type Errors = Partial<Record<string, string>>;

export function LeadForm({ unitCodes, source, onDone, compact }: LeadFormProps) {
  const { t, locale } = useI18n();
  const id = useId();
  const [method, setMethod] = useState<ContactMethod>("whatsapp");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ name: string; method: ContactMethod } | null>(null);

  const errorText = (code?: string) => (code ? t(`lead.errors.${code}` as MessageKey) : undefined);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input = {
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      preferredContact: method,
      locale,
      message: String(data.get("message") ?? ""),
      unitCodes,
      source,
      consent: data.get("consent") === "on",
      company: String(data.get("company") ?? ""),
    };

    // Same schema as the command layer → instant field errors without a round trip.
    const check = leadInputSchema.safeParse(input);
    if (!check.success) {
      const next: Errors = {};
      for (const issue of check.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }

    setErrors({});
    setFormError(null);
    setPending(true);
    const recent = getPrefs().leadSubmissions;
    const res = await dispatch((state, ctx) => submitLead(state, input, { ...ctx, recentSubmissions: recent }));
    setPending(false);

    if (!res.ok) {
      if (res.error.code === "validation") setErrors(res.error.issues);
      else if (res.error.code === "rate_limited")
        setFormError(t("lead.errors.rate_limited", { minutes: Math.ceil(res.error.retryInMs / 60_000) }));
      else setFormError(t("lead.errors.generic"));
      return;
    }
    updatePrefs((p) => ({ ...p, leadSubmissions: [...p.leadSubmissions.slice(-9), Date.now()] }));
    setDone({ name: input.name.split(" ")[0], method });
  }

  if (done) {
    return (
      <div className="py-6 text-center" role="status">
        <CheckCircle2 className="mx-auto text-st-available" size={40} aria-hidden="true" />
        <h3 className="mt-4 text-2xl">{t("lead.successTitle")}</h3>
        <p className="mt-2 text-ink-2">{t("lead.successBody", { name: done.name, method: t(`lead.methods.${done.method}`) })}</p>
        <p className="mt-4 text-sm text-muted">{t("lead.successHint")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={`/${locale}/admin/leads`} className="btn btn-ghost btn-sm">
            {t("lead.seeInOffice")}
          </Link>
          {onDone && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onDone}>
              {t("lead.close")}
            </button>
          )}
        </div>
      </div>
    );
  }

  const field = (name: string) => ({
    id: `${id}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-err` : undefined,
  });
  const errFor = (name: string) =>
    errors[name] ? (
      <p id={`${id}-${name}-err`} className="mt-1 text-xs text-accent">
        {errorText(errors[name])}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" data-testid="lead-form">
      {unitCodes.length > 0 && <p className="text-sm text-muted">{t("lead.for", { codes: unitCodes.join(", ") })}</p>}

      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <div>
          <label htmlFor={`${id}-name`} className="mb-1.5 block text-sm font-medium">{t("lead.name")}</label>
          <input {...field("name")} className="field" autoComplete="name" required />
          {errFor("name")}
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="mb-1.5 block text-sm font-medium">{t("lead.phone")}</label>
          <input {...field("phone")} className="field" type="tel" autoComplete="tel" inputMode="tel" placeholder="+355 69 …" required />
          {errFor("phone")}
        </div>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t("lead.preferred")}</legend>
        <div className="flex flex-wrap gap-2">
          {CONTACT_METHODS.map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={method === m} onClick={() => setMethod(m)}>
              {t(`lead.methods.${m}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-email`} className="mb-1.5 block text-sm font-medium">
          {method === "email" ? t("lead.email") : t("lead.emailOptional")}
        </label>
        <input {...field("email")} className="field" type="email" autoComplete="email" />
        {errFor("email")}
      </div>

      <div>
        <label htmlFor={`${id}-message`} className="mb-1.5 block text-sm font-medium">{t("lead.message")}</label>
        <textarea {...field("message")} className="field min-h-24" placeholder={t("lead.messagePlaceholder")} />
        {errFor("message")}
      </div>

      {/* Honeypot: hidden from people and assistive tech */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label className="flex items-start gap-2.5 text-sm text-ink-2">
          <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" aria-invalid={errors.consent ? true : undefined} />
          {t("lead.consent")}
        </label>
        {errFor("consent")}
      </div>

      {formError && (
        <p role="alert" className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent-ink">
          {formError}
        </p>
      )}

      <button type="submit" className="btn btn-accent w-full sm:w-auto" disabled={pending}>
        {pending ? t("lead.sending") : t("lead.submit")}
      </button>
    </form>
  );
}
