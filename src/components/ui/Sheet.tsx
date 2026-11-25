"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  side?: "right" | "bottom" | "center";
  wide?: boolean;
}

/** Accessible dialog (focus trap, Escape, aria) styled as a side sheet, bottom sheet or modal. */
export function Sheet({ open, onOpenChange, title, description, children, side = "right", wide }: SheetProps) {
  const { t } = useI18n();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_.2s_ease-out]" />
        <Dialog.Content
          data-lenis-prevent
          className={clsx(
            "fixed z-[61] flex flex-col bg-paper shadow-2xl outline-none",
            side === "right" && [
              "inset-y-0 right-0 w-full border-l border-line data-[state=open]:animate-[slide-in-right_.35s_var(--ease-out-expo)]",
              wide ? "sm:max-w-2xl" : "sm:max-w-md",
            ],
            side === "bottom" &&
              "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t border-line data-[state=open]:animate-[slide-in-up_.35s_var(--ease-out-expo)]",
            side === "center" && [
              "left-1/2 top-1/2 max-h-[92dvh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-line data-[state=open]:animate-[fade-in_.2s_ease-out]",
              wide ? "max-w-2xl" : "max-w-lg",
            ],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-2xl leading-tight">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{typeof title === "string" ? title : ""}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="-mr-2 rounded-full p-2 text-ink-2 hover:bg-paper-2" aria-label={t("common.close")}>
              <X size={20} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
