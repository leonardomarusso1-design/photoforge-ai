import { Suspense } from "react";
import { ShootCreatePage } from "@/components/ClientApp";

export default function Page() {
  return (
    <Suspense fallback={<div className="rounded-lg border border-line bg-panel/95 p-5 text-sm text-slate-300">Carregando fluxo do ensaio...</div>}>
      <ShootCreatePage />
    </Suspense>
  );
}
