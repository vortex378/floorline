"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Activity, ArrowUpRight, Building2, FlaskConical, LayoutDashboard, LogOut, RotateCcw, Users } from "lucide-react";
import type { CommandError, Result } from "@/domain/commands";
import { MANAGER } from "@/domain/seed";
import type { Actor } from "@/domain/types";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { useHydrated, usePrefs } from "@/lib/store/hooks";
import { updatePrefs } from "@/lib/store/prefs";
import { resetSandbox } from "@/lib/store/sandbox";
import { Logo } from "@/components/site/Logo";
import { Sheet } from "@/components/ui/Sheet";

interface Toast {
  id: number;
  tone: "ok" | "error";
  text: string;
}

interface AdminCtx {
  actor: Actor;
  notify: (tone: Toast["tone"], text: string) => void;
  /** Show the translated error for a failed command, or a success toast. */
  report: <T>(res: Result<T>, okText?: string) => boolean;
}

const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminShell>");
  return ctx;
}

const PERSONAS: Array<{ actor: Actor; titleKey: MessageKey; hintKey: MessageKey }> = [
  { actor: { name: MANAGER, role: "admin" }, titleKey: "admin.signIn.admin", hintKey: "admin.signIn.adminHint" },
  { actor: { name: "Elira Dervishi", role: "agent" }, titleKey: "admin.signIn.agent", hintKey: "admin.signIn.agentHint" },
];

function SignIn() {
  const { t } = useI18n();
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-paper-2/60 p-6">
      <div className="card w-full max-w-lg bg-paper p-8 sm:p-10">
        <Logo />
        <h1 className="mt-8 text-3xl">{t("admin.signIn.title")}</h1>
        <p className="mt-2 text-ink-2">{t("admin.signIn.body")}</p>
        <div className="mt-8 grid gap-3">
          {PERSONAS.map(({ actor, titleKey, hintKey }) => (
            <button
              key={actor.role}
              type="button"
              data-testid={`persona-${actor.role}`}
              className="group rounded-2xl border border-line p-5 text-left transition-colors hover:border-ink"
              onClick={() => updatePrefs((p) => ({ ...p, actor }))}
            >
              <span className="flex items-center justify-between">
                <span className="font-medium">{t(titleKey)}</span>
                <span className="text-sm text-muted group-hover:text-ink">{t("admin.signIn.continue", { name: actor.name })} →</span>
              </span>
              <span className="mt-1 block text-sm text-muted">{t(hintKey)}</span>
            </button>
          ))}
        </div>
        <p className="mt-6 flex items-start gap-2 text-xs text-muted">
          <FlaskConical size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t("admin.sandboxHint")}
        </p>
      </div>
    </main>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const prefs = usePrefs();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);

  const notify = useCallback((tone: Toast["tone"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4500);
  }, []);

  const report = useCallback(
    <T,>(res: Result<T>, okText?: string) => {
      if (res.ok) {
        notify("ok", okText ?? t("admin.errors.saved"));
        return true;
      }
      const err: CommandError = res.error;
      notify("error", t(`admin.errors.${err.code}` as MessageKey));
      return false;
    },
    [notify, t],
  );

  if (!hydrated) return <div className="min-h-dvh bg-paper-2/60" />;
  if (!prefs.actor) return <SignIn />;
  const actor = prefs.actor;

  const base = `/${locale}/admin`;
  const nav = [
    { href: base, label: t("admin.nav.dashboard"), Icon: LayoutDashboard },
    { href: `${base}/units`, label: t("admin.nav.units"), Icon: Building2 },
    { href: `${base}/leads`, label: t("admin.nav.leads"), Icon: Users },
    { href: `${base}/activity`, label: t("admin.nav.activity"), Icon: Activity },
  ];

  return (
    <Ctx.Provider value={{ actor, notify, report }}>
      <div className="min-h-dvh bg-paper-2/50 lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-line bg-paper lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
          <div className="flex h-16 items-center justify-between px-5">
            <Link href={base} aria-label={t("admin.title")}>
              <Logo />
            </Link>
          </div>
          <nav aria-label={t("admin.title")} className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
            {nav.map(({ href, label, Icon }) => {
              const active = href === base ? pathname === base : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2",
                  )}
                >
                  <Icon size={17} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
            <Link href={`/${locale}/units`} target="_blank" className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:bg-paper-2">
              <ArrowUpRight size={17} aria-hidden="true" />
              {t("admin.nav.site")}
            </Link>
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/80 px-5 py-3 backdrop-blur sm:px-8">
            <p className="flex items-center gap-2 text-xs text-ink-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent-ink">
                <FlaskConical size={12} aria-hidden="true" /> {t("admin.sandbox")}
              </span>
              <span className="hidden md:inline">{t("admin.sandboxHint")}</span>
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={14} aria-hidden="true" /> <span className="hidden sm:inline">{t("admin.reset")}</span>
              </button>
              <div className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-semibold text-paper" aria-hidden="true">
                  {actor.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")}
                </span>
                <span className="text-sm">
                  {actor.name} <span className="text-muted">· {t(`admin.roles.${actor.role}`)}</span>
                </span>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-ink-2 hover:bg-paper-2"
                aria-label={t("admin.signOut")}
                title={t("admin.signOut")}
                onClick={() => updatePrefs((p) => ({ ...p, actor: null }))}
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>
          <main id="main" className="px-5 py-8 sm:px-8">
            {children}
          </main>
        </div>
      </div>

      <Sheet open={confirmReset} onOpenChange={setConfirmReset} title={t("admin.reset")} description={t("admin.resetConfirm")} side="center">
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => {
              resetSandbox();
              setConfirmReset(false);
              notify("ok", t("admin.errors.saved"));
            }}
          >
            {t("admin.reset")}
          </button>
        </div>
      </Sheet>

      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[70] grid w-[min(360px,calc(100%-2rem))] gap-2">
        {toasts.map((toast) => (
          <p
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={clsx(
              "pointer-events-auto rounded-2xl px-4 py-3 text-sm shadow-lg",
              toast.tone === "ok" ? "bg-ink text-paper" : "bg-accent text-white",
            )}
          >
            {toast.text}
          </p>
        ))}
      </div>
    </Ctx.Provider>
  );
}
