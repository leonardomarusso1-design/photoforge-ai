import { ArrowRight, Camera, CheckCircle2, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { Button, Card, Logo, StatusBadge } from "@/components/ui";

export default function LandingPage() {
  return (
    <main className="mesh min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button href="/login" variant="ghost">Login</Button>
          <Button href="/register">Comecar agora</Button>
        </nav>
      </header>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-8 md:px-8 lg:grid-cols-[1fr_.9fr] lg:pb-20 lg:pt-14">
        <div className="flex flex-col justify-center">
          <StatusBadge tone="good">SaaS profissional para ensaios com IA</StatusBadge>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">Crie ensaios fotograficos realistas com IA para seus clientes em poucos minutos</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Envie fotos de referencia, escolha o estilo do ensaio e deixe o sistema montar prompts profissionais para gerar imagens com aparencia realista.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/register">Comecar agora <ArrowRight className="h-4 w-4" /></Button>
            <Button href="#como-funciona" variant="secondary">Ver como funciona</Button>
          </div>
        </div>
        <div className="grid min-h-[520px] gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((item) => <div key={item} className="photo-tile rounded-lg border border-white/10 p-4 shadow-premium"><div className="flex h-full flex-col justify-end rounded-lg bg-black/15 p-4"><span className="text-xs uppercase text-cyan">mock preview</span><strong className="mt-2 text-xl">Ensaio realista {item}</strong></div></div>)}
        </div>
      </section>
      <section id="como-funciona" className="border-y border-line bg-ink/80 px-4 py-12 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {[["Cadastro da cliente", Camera], ["Fotos obrigatorias", ShieldCheck], ["Prompt premium", Sparkles], ["Creditos controlados", WalletCards]].map(([label, Icon]) => {
            const I = Icon as typeof Camera;
            return <Card key={label as string}><I className="h-6 w-6 text-cyan" /><h2 className="mt-4 font-semibold">{label as string}</h2><p className="mt-2 text-sm leading-6 text-slate-400">Fluxo simples, responsivo e preparado para operacao real com Supabase e provider mock.</p></Card>;
          })}
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-12 md:grid-cols-3 md:px-8">
        {["Comunidade", "Publico", "Pro"].map((plan) => <Card key={plan}><h2 className="text-2xl font-semibold">{plan}</h2><p className="mt-3 text-sm text-slate-400">Estrutura pronta para pacotes de creditos, precos diferentes e templates exclusivos.</p><Button href="/register" className="mt-6 w-full" variant={plan === "Publico" ? "primary" : "secondary"}>Entrar</Button></Card>)}
      </section>
      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-4 py-8 text-sm text-slate-500 md:px-8">
        <span>PhotoForge AI</span>
        <div className="flex gap-4"><a href="/terms">Termos</a><a href="/privacy">Privacidade</a><a href="/image-policy">Uso de imagem</a></div>
      </footer>
    </main>
  );
}
