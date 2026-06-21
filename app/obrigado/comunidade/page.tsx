import { CheckCircle2 } from "lucide-react";
import { Button, Card, Logo } from "@/components/ui";

const discordUrl = process.env.DISCORD_INVITE_URL ?? "https://discord.gg/Sc6t4eJPvH";

export default function ObrigadoComunidadePage() {
  return (
    <main className="mesh min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center px-4 py-5 md:px-8">
        <Logo />
      </header>

      <section className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center md:px-8">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10">
          <CheckCircle2 className="h-8 w-8 text-cyan" />
        </div>

        <h1 className="text-3xl font-semibold text-white md:text-4xl">
          Bem-vindo à comunidade PhotoForge AI!
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
          Sua assinatura foi confirmada. Você recebeu <strong className="text-white">15 créditos</strong> e vai ganhar esse saldo todo mês enquanto a assinatura estiver ativa.
        </p>

        <Card className="mt-10 w-full border-champagne/30 bg-[linear-gradient(135deg,rgba(244,213,141,.12),rgba(16,19,27,.96)_52%,rgba(45,212,191,.07))] text-left">
          <p className="text-xs font-semibold uppercase text-champagne">Próximos passos</p>
          <div className="mt-4 grid gap-3">
            {[
              "Entre no Discord e se apresente na comunidade",
              "Acesse o app e cadastre seu primeiro cliente",
              "Gere ensaios e compartilhe os resultados"
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                {item}
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href={discordUrl}>Entrar no Discord</Button>
          <Button href="/app/dashboard" variant="secondary">Ir para o app</Button>
        </div>
      </section>
    </main>
  );
}
