"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { activateDemoMode } from "@/lib/demoMode";
import { Button, Card, Logo, StatusBadge } from "@/components/ui";

export default function DemoEntryPage() {
  const router = useRouter();
  const demoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    if (!demoEnabled) return;
    activateDemoMode();
    router.replace("/app/dashboard");
  }, [demoEnabled, router]);

  return (
    <main className="mesh grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <Logo />
        <div className="mt-8"><StatusBadge tone={demoEnabled ? "good" : "warn"}>{demoEnabled ? "Modo demo ativo" : "Modo demo desativado"}</StatusBadge></div>
        <h1 className="mt-4 text-2xl font-semibold">{demoEnabled ? "Abrindo dashboard demo..." : "Acesso demo indisponivel"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          {demoEnabled
            ? "Voce sera redirecionado para uma area interna com dados simulados para revisao visual."
            : "Para liberar a revisao externa, configure NEXT_PUBLIC_DEMO_MODE=true no ambiente e faça um novo deploy."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {demoEnabled ? <Button href="/app/dashboard">Entrar no demo</Button> : <Button href="/login">Entrar</Button>}
          <Button href="/" variant="secondary">Voltar</Button>
        </div>
      </Card>
    </main>
  );
}
