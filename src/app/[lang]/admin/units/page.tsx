import { Suspense } from "react";
import { UnitsAdmin } from "@/components/admin/UnitsAdmin";

export default function AdminUnitsPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper" />}>
      <UnitsAdmin />
    </Suspense>
  );
}
