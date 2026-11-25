"use client";

import Link from "next/link";
import { useMemo, useState, type DragEvent } from "react";
import clsx from "clsx";
import { Download, Mail, MessageCircle, Phone, Search } from "lucide-react";
import { addLeadNote, assignLead, moveLead } from "@/domain/commands";
import { MANAGER } from "@/domain/seed";
import { LEAD_SOURCES, LEAD_STAGES, type Lead, type LeadSource, type LeadStage } from "@/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { useSandbox } from "@/lib/store/hooks";
import { dispatch } from "@/lib/store/sandbox";
import { Sheet } from "@/components/ui/Sheet";
import { useAdmin } from "./AdminShell";

const AGENTS = [MANAGER, "Elira Dervishi", "Ardit Kola"];
const METHOD_ICON = { whatsapp: MessageCircle, phone: Phone, email: Mail } as const;

export function toCsv(leads: Lead[]): string {
  const header = ["id", "created_at", "name", "phone", "email", "locale", "source", "preferred_contact", "stage", "assigned_to", "units", "message"];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = leads.map((l) =>
    [l.id, new Date(l.createdAt).toISOString(), l.name, l.phone, l.email, l.locale, l.source, l.preferredContact, l.stage, l.assignedTo ?? "", l.unitCodes.join(" "), l.message]
      .map((v) => esc(String(v)))
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

function LeadDetail({ lead }: { lead: Lead }) {
  const { t, fmt, locale } = useI18n();
  const { actor, report } = useAdmin();
  const [note, setNote] = useState("");
  const [now] = useState(() => Date.now());
  const Icon = METHOD_ICON[lead.preferredContact];

  return (
    <div className="grid gap-6" data-testid="lead-detail">
      <div className="grid gap-2 text-sm">
        <p className="text-xs uppercase tracking-wider text-muted">{t("admin.leads.contact")}</p>
        <p className="flex items-center gap-2">
          <Icon size={15} aria-hidden="true" /> {t(`lead.methods.${lead.preferredContact}`)}
        </p>
        <p className="num">{lead.phone}</p>
        {lead.email && <p>{lead.email}</p>}
        <p className="text-xs text-muted">
          {t("admin.leads.received", { when: fmt.relative(lead.createdAt, now) })} · {t(`admin.sources.${lead.source}`)} · {lead.locale.toUpperCase()}
        </p>
      </div>

      {lead.message && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">{t("admin.leads.message")}</p>
          <blockquote className="mt-2 rounded-xl bg-paper-2 px-4 py-3 text-sm">{lead.message}</blockquote>
        </div>
      )}

      {lead.unitCodes.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">{t("admin.leads.units")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lead.unitCodes.map((c) => (
              <Link key={c} href={`/${locale}/admin/units?unit=${c}`} className="chip hover:border-ink">
                {c}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          {t("admin.leads.moveTo")}
          <select
            className="field"
            value={lead.stage}
            onChange={async (e) => report(await dispatch((s) => moveLead(s, { id: lead.id, stage: e.target.value as LeadStage, actor })))}
          >
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>{t(`admin.stages.${s}`)}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          {t("admin.leads.assign")}
          <select
            className="field"
            value={lead.assignedTo ?? ""}
            onChange={async (e) => report(await dispatch((s) => assignLead(s, { id: lead.id, assignee: e.target.value || null, actor })))}
          >
            <option value="">{t("admin.leads.unassigned")}</option>
            {AGENTS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      </div>

      <section className="border-t border-line pt-5">
        <h3 className="font-display text-lg">{t("admin.leads.notes")}</h3>
        <ol className="mt-3 grid gap-3">
          {lead.notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-line px-4 py-3 text-sm">
              <p>{n.body}</p>
              <p className="mt-1 text-xs text-muted">{n.author} · {fmt.dateTime(n.createdAt)}</p>
            </li>
          ))}
        </ol>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await dispatch((s, ctx) => addLeadNote(s, { id: lead.id, body: note, actor }, ctx));
            if (report(res)) setNote("");
          }}
        >
          <label className="sr-only" htmlFor="note">{t("admin.leads.addNote")}</label>
          <input id="note" className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.leads.notePlaceholder")} />
          <button type="submit" className="btn btn-primary" disabled={!note.trim()}>
            {t("admin.leads.addNote")}
          </button>
        </form>
      </section>
    </div>
  );
}

export function LeadsBoard() {
  const { t, fmt } = useI18n();
  const { actor, report } = useAdmin();
  const state = useSandbox();
  const [q, setQ] = useState("");
  const [source, setSource] = useState<LeadSource | "">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<LeadStage | null>(null);
  const [now] = useState(() => Date.now());

  const leads = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.leads.filter(
      (l) =>
        !l.id.startsWith("spam") &&
        (!source || l.source === source) &&
        (!needle || [l.name, l.phone, l.email, ...l.unitCodes].some((v) => v.toLowerCase().includes(needle))),
    );
  }, [state.leads, q, source]);

  const open = openId ? state.leads.find((l) => l.id === openId) : undefined;

  const move = async (id: string, stage: LeadStage) => report(await dispatch((s) => moveLead(s, { id, stage, actor })));

  const onDrop = (e: DragEvent, stage: LeadStage) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/lead");
    const lead = state.leads.find((l) => l.id === id);
    if (lead && lead.stage !== stage) void move(id, stage);
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(leads)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vela-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">{t("admin.nav.leads")}</h1>
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}>
          <Download size={14} aria-hidden="true" /> {t("admin.leads.export")}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">{t("admin.leads.search")}</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input className="field w-64 py-2 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.leads.search")} />
        </label>
        <select className="field w-auto py-2" value={source} onChange={(e) => setSource(e.target.value as LeadSource | "")} aria-label={t("admin.charts.leadsBySource")}>
          <option value="">{t("admin.leads.allSources")}</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>{t(`admin.sources.${s}`)}</option>
          ))}
        </select>
        <p className="text-xs text-muted">{t("admin.leads.dragHint")}</p>
      </div>

      <div className="-mx-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8" data-lenis-prevent>
        <div className="grid min-w-[1100px] grid-cols-6 gap-3">
          {LEAD_STAGES.map((stage) => {
            const column = leads.filter((l) => l.stage === stage);
            return (
              <section
                key={stage}
                aria-label={t(`admin.stages.${stage}`)}
                data-testid={`stage-${stage}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(stage);
                }}
                onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
                onDrop={(e) => onDrop(e, stage)}
                className={clsx("flex min-h-[60vh] flex-col rounded-2xl border bg-paper/70 p-2.5 transition-colors", dragOver === stage ? "border-accent bg-accent/5" : "border-line")}
              >
                <h2 className="flex items-center justify-between px-1.5 pb-2 pt-1 text-sm font-medium">
                  {t(`admin.stages.${stage}`)}
                  <span className="num rounded-full bg-paper-2 px-2 text-xs text-muted">{column.length}</span>
                </h2>
                <ul className="grid content-start gap-2">
                  {column.length === 0 && <li className="px-2 py-6 text-center text-xs text-muted">{t("admin.leads.empty")}</li>}
                  {column.map((l) => {
                    const Icon = METHOD_ICON[l.preferredContact];
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/lead", l.id)}
                          onClick={() => setOpenId(l.id)}
                          className="w-full cursor-grab rounded-xl border border-line bg-paper p-3 text-left text-sm shadow-sm transition-colors hover:border-ink active:cursor-grabbing"
                          data-testid={`lead-${l.id}`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium">{l.name}</span>
                            <Icon size={13} className="shrink-0 text-muted" aria-label={t(`lead.methods.${l.preferredContact}`)} />
                          </span>
                          {l.unitCodes.length > 0 && <span className="mt-1 block truncate text-xs text-ink-2">{l.unitCodes.join(", ")}</span>}
                          <span className="mt-2 flex items-center justify-between text-[11px] text-muted">
                            <span className="truncate">{l.assignedTo ?? t("admin.leads.unassigned")}</span>
                            <span className="num shrink-0">{fmt.relative(l.createdAt, now)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)} title={open?.name ?? ""} description={open ? t(`admin.stages.${open.stage}`) : undefined}>
        {open && <LeadDetail key={open.id} lead={open} />}
      </Sheet>
    </div>
  );
}
