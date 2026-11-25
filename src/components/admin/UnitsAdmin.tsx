"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Percent, Search } from "lucide-react";
import { bulkAdjustPrices, changeUnitStatus, previewBulkPrices, setUnitPrice } from "@/domain/commands";
import { ALL_FLOORS } from "@/domain/layouts";
import { allowedTransitions, can } from "@/domain/rules";
import { UNIT_STATUSES, UNIT_TYPES, type Unit, type UnitStatus, type UnitType } from "@/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { useSandbox, useUnits } from "@/lib/store/hooks";
import { dispatch } from "@/lib/store/sandbox";
import { Sheet } from "@/components/ui/Sheet";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FloorPlan } from "@/components/building/FloorPlan";
import { useAdmin } from "./AdminShell";

function UnitDrawer({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const { t, fmt, locale } = useI18n();
  const { actor, report } = useAdmin();
  const state = useSandbox();
  const units = useUnits();
  const transitions = allowedTransitions(unit.status, actor.role);
  // Version the user is looking at — sent with the write for optimistic locking.
  const [seenVersion, setSeenVersion] = useState(unit.version);
  const [to, setTo] = useState<UnitStatus | "">(transitions[0] ?? "");
  const [leadId, setLeadId] = useState("");
  const [note, setNote] = useState("");
  const [price, setPrice] = useState(String(unit.price));
  const [visible, setVisible] = useState(unit.priceVisible);
  const canPrice = can(actor.role, "unit.price");

  const openLeads = state.leads.filter((l) => !["won", "lost"].includes(l.stage) && !l.id.startsWith("spam"));
  const history = [
    ...state.history.filter((e) => e.code === unit.code).map((e) => ({ at: e.at, kind: "status" as const, e })),
    ...state.priceChanges.filter((p) => p.code === unit.code).map((p) => ({ at: p.at, kind: "price" as const, p })),
  ].sort((a, b) => b.at - a.at);

  const stale = seenVersion !== unit.version;

  async function applyStatus() {
    if (!to) return;
    const res = await dispatch((s, ctx) =>
      changeUnitStatus(s, { code: unit.code, to, expectedVersion: seenVersion, actor, leadId: leadId || null, note }, ctx),
    );
    report(res);
    if (res.ok) {
      setNote("");
      setLeadId("");
    }
    // On conflict, show the latest data; the user decides again.
    setSeenVersion(res.ok ? res.state.units[unit.code].version : unit.version);
  }

  async function savePrice() {
    const res = await dispatch((s, ctx) =>
      setUnitPrice(s, { code: unit.code, price: Number(price), priceVisible: visible, expectedVersion: seenVersion, actor }, ctx),
    );
    report(res);
    setSeenVersion(res.ok ? res.state.units[unit.code].version : unit.version);
  }

  return (
    <div className="grid gap-6" data-testid="unit-drawer">
      <div className="flex items-center justify-between">
        <StatusBadge status={unit.status} />
        <Link href={`/${locale}/units/${unit.code}`} target="_blank" className="text-sm underline underline-offset-4">
          {t("admin.unitDrawer.viewOnSite")}
        </Link>
      </div>
      <FloorPlan floor={unit.floor} units={units} focusCode={unit.code} interactive={false} className="h-44 w-full rounded-2xl border border-line bg-paper-2/40" />

      {stale && (
        <p role="alert" className="rounded-xl bg-st-reserved-bg px-4 py-3 text-sm">
          {t("admin.errors.conflict")}
        </p>
      )}

      <section className="grid gap-3">
        <h3 className="font-display text-lg">{t("admin.unitDrawer.changeStatus")}</h3>
        {transitions.length === 0 ? (
          <p className="text-sm text-muted">{t("admin.unitDrawer.noTransitions")}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("admin.unitDrawer.to")}>
              {transitions.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={to === s} className="chip" data-checked={to === s} onClick={() => setTo(s)}>
                  {t(`status.${s}`)}
                </button>
              ))}
            </div>
            <label className="grid gap-1.5 text-sm">
              {t("admin.unitDrawer.linkLead")}
              <select className="field" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                <option value="">{t("admin.unitDrawer.noLead")}</option>
                {openLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} · {t(`admin.stages.${l.stage}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              {t("admin.unitDrawer.note")}
              <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.unitDrawer.notePlaceholder")} />
            </label>
            <button type="button" className="btn btn-primary" onClick={applyStatus} disabled={!to} data-testid="apply-status">
              {t("admin.unitDrawer.apply")}
            </button>
          </>
        )}
      </section>

      <section className="grid gap-3 border-t border-line pt-5">
        <h3 className="font-display text-lg">{t("admin.unitDrawer.price")}</h3>
        {canPrice ? (
          <>
            <input className="field num" type="number" step={500} min={0} value={price} onChange={(e) => setPrice(e.target.value)} aria-label={t("admin.unitDrawer.price")} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
              {t("admin.unitDrawer.visible")}
            </label>
            <button type="button" className="btn btn-ghost" onClick={savePrice}>
              {t("admin.unitDrawer.savePrice")}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted">
            <span className="num font-medium text-ink">{fmt.price(unit.price)}</span> · {t("admin.unitDrawer.managerOnly")}
          </p>
        )}
      </section>

      <section className="border-t border-line pt-5">
        <h3 className="font-display text-lg">{t("admin.unitDrawer.history")}</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("admin.unitDrawer.noHistory")}</p>
        ) : (
          <ol className="mt-3 grid gap-3">
            {history.map((h) => (
              <li key={h.kind === "status" ? h.e.id : h.p.id} className="text-sm">
                <p>
                  {h.kind === "status"
                    ? t("admin.unitDrawer.statusChange", { from: t(`status.${h.e.from}`), to: t(`status.${h.e.to}`) })
                    : t("admin.unitDrawer.priceChange", { old: fmt.price(h.p.oldPrice), new: fmt.price(h.p.newPrice) })}
                </p>
                <p className="text-xs text-muted">
                  {fmt.dateTime(h.at)} · {h.kind === "status" ? h.e.actor : h.p.actor}
                  {h.kind === "status" && h.e.note ? ` · ${h.e.note}` : ""}
                  {h.kind === "price" ? ` · ${h.p.reason}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
      <button type="button" className="sr-only" onClick={onClose}>
        {t("common.close")}
      </button>
    </div>
  );
}

function BulkPrice({ onDone }: { onDone: () => void }) {
  const { t, fmt } = useI18n();
  const { actor, report } = useAdmin();
  const state = useSandbox();
  const [floors, setFloors] = useState<number[]>([]);
  const [types, setTypes] = useState<UnitType[]>([]);
  const [percent, setPercent] = useState("2.5");
  const [reason, setReason] = useState("");
  const pct = Number(percent);
  const rows = useMemo(
    () => (Number.isFinite(pct) && pct !== 0 ? previewBulkPrices(state, { floors, types, percent: pct }) : []),
    [state, floors, types, pct],
  );
  const delta = rows.reduce((s, r) => s + (r.newPrice - r.oldPrice), 0);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function apply() {
    const res = await dispatch((s, ctx) => bulkAdjustPrices(s, { floors, types, percent: pct, reason, actor }, ctx));
    if (report(res)) onDone();
  }

  return (
    <div className="grid gap-5">
      <p className="text-sm text-ink-2">{t("admin.bulk.body")}</p>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("admin.bulk.floors")}</legend>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="chip" aria-pressed={floors.length === 0} onClick={() => setFloors([])}>
            {t("admin.bulk.all")}
          </button>
          {ALL_FLOORS.map((f) => (
            <button key={f} type="button" className="chip num" aria-pressed={floors.includes(f)} onClick={() => setFloors(toggle(floors, f))}>
              {f}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("admin.bulk.types")}</legend>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="chip" aria-pressed={types.length === 0} onClick={() => setTypes([])}>
            {t("admin.bulk.all")}
          </button>
          {UNIT_TYPES.map((ty) => (
            <button key={ty} type="button" className="chip" aria-pressed={types.includes(ty)} onClick={() => setTypes(toggle(types, ty))}>
              {t(`types.${ty}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <label className="grid gap-1.5 text-sm">
          {t("admin.bulk.percent")}
          <input className="field num" type="number" step={0.5} min={-25} max={25} value={percent} onChange={(e) => setPercent(e.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm">
          {t("admin.bulk.reason")}
          <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("admin.bulk.reasonPlaceholder")} />
        </label>
      </div>

      <section className="rounded-2xl border border-line">
        <h3 className="flex items-center justify-between border-b border-line px-4 py-3 text-sm font-medium">
          {t("admin.bulk.preview")}
          <span className="num font-normal text-muted">{t("admin.bulk.rows", { count: rows.length, delta: fmt.price(delta) })}</span>
        </h3>
        <div className="max-h-64 overflow-y-auto" data-lenis-prevent>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">{t("admin.bulk.none")}</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code} className="border-t border-line first:border-t-0">
                    <td className="px-4 py-2 font-medium">{r.code}</td>
                    <td className="num px-4 py-2 text-right text-muted line-through">{fmt.price(r.oldPrice)}</td>
                    <td className="num px-4 py-2 text-right">{fmt.price(r.newPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      <button type="button" className="btn btn-accent" disabled={rows.length === 0 || reason.trim().length < 3} onClick={apply}>
        {t("admin.bulk.apply", { count: rows.length })}
      </button>
    </div>
  );
}

export function UnitsAdmin() {
  const { t, fmt } = useI18n();
  const { actor } = useAdmin();
  const state = useSandbox();
  const units = useUnits();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<UnitStatus | "">("");
  const [type, setType] = useState<UnitType | "">("");
  const [floor, setFloor] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  const selectedCode = search.get("unit");
  const selected = selectedCode ? units.find((u) => u.code === selectedCode) : undefined;
  const open = (code: string | null) => router.replace(code ? `${pathname}?unit=${code}` : pathname, { scroll: false });

  const lastChange = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of state.history) if (!map.has(e.code)) map.set(e.code, e.at);
    return map;
  }, [state.history]);

  const rows = units.filter(
    (u) =>
      (!q || u.code.toLowerCase().includes(q.toLowerCase())) &&
      (!status || u.status === status) &&
      (!type || u.type === type) &&
      (floor === "" || u.floor === Number(floor)),
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">{t("admin.nav.units")}</h1>
        {can(actor.role, "unit.bulkPrice") && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setBulkOpen(true)}>
            <Percent size={14} aria-hidden="true" /> {t("admin.units.bulk")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">{t("admin.units.search")}</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input className="field w-44 py-2 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.units.search")} />
        </label>
        <select className="field w-auto py-2" value={status} onChange={(e) => setStatus(e.target.value as UnitStatus | "")} aria-label={t("list.status")}>
          <option value="">{t("admin.units.allStatuses")}</option>
          {UNIT_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>
        <select className="field w-auto py-2" value={type} onChange={(e) => setType(e.target.value as UnitType | "")} aria-label={t("list.type")}>
          <option value="">{t("admin.units.allTypes")}</option>
          {UNIT_TYPES.map((s) => (
            <option key={s} value={s}>{t(`types.${s}`)}</option>
          ))}
        </select>
        <select className="field w-auto py-2" value={floor} onChange={(e) => setFloor(e.target.value)} aria-label={t("list.floor")}>
          <option value="">{t("admin.units.allFloors")}</option>
          {ALL_FLOORS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <span className="num ml-auto text-sm text-muted">{t("admin.units.count", { count: rows.length })}</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-paper-2/70 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">{t("list.code")}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t("list.type")}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t("list.area")}</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">{t("list.price")}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t("list.status")}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t("admin.units.lastChange")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.code} className="cursor-pointer border-t border-line hover:bg-paper-2/60" onClick={() => open(u.code)}>
                <td className="px-4 py-2.5">
                  <button type="button" className="font-medium hover:underline" onClick={(e) => { e.stopPropagation(); open(u.code); }} data-testid={`admin-unit-${u.code}`}>
                    {u.code}
                  </button>
                </td>
                <td className="px-4 py-2.5">{t(`types.${u.type}`)}</td>
                <td className="num px-4 py-2.5">{fmt.area(u.areaNet)}</td>
                <td className="num px-4 py-2.5 text-right">
                  {fmt.price(u.price)}
                  {!u.priceVisible && <span className="ml-1 text-xs text-muted">({t("unit.onRequest")})</span>}
                </td>
                <td className="px-4 py-2.5"><StatusBadge status={u.status} /></td>
                <td className="num px-4 py-2.5 text-xs text-muted">{lastChange.has(u.code) ? fmt.date(lastChange.get(u.code)!) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet
        open={!!selected}
        onOpenChange={(o) => !o && open(null)}
        title={selected ? `${selected.code} · ${t(`types.${selected.type}`)}` : ""}
        description={selected ? `${fmt.area(selected.areaNet)} · ${t("floors.floor", { n: selected.floor })}` : undefined}
      >
        {selected && <UnitDrawer key={selected.code} unit={selected} onClose={() => open(null)} />}
      </Sheet>

      <Sheet open={bulkOpen} onOpenChange={setBulkOpen} title={t("admin.bulk.title")} wide>
        <BulkPrice onDone={() => setBulkOpen(false)} />
      </Sheet>
    </div>
  );
}
