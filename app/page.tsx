import { ArrowRight, Camera, CheckCircle2, GalleryHorizontal, LockKeyhole, ShieldCheck, Sparkles, Users, WalletCards, Workflow } from "lucide-react";
import { Button, Card, Logo, SectionHeader, StatusBadge } from "@/components/ui";

const steps = [
  ["Cadastre a cliente", "Organize nome, contato, perfil e historico antes de vender ou produzir.", Users],
  ["Envie as fotos obrigatorias", "O fluxo guia quais imagens sao necessarias para preservar identidade.", ShieldCheck],
  ["Escolha o estilo do ensaio", "Defina roupa, cenario, pose, expressao, luz e observacoes em um briefing claro.", Sparkles],
  ["Gere, revise e entregue", "Salve as imagens no ensaio, favorite, baixe e mantenha a galeria organizada.", GalleryHorizontal]
];

const audiences = ["Alunos de comunidade de IA", "Fotografos", "Social medias", "Designers", "Prestadores de servico digital", "Quem vende fotos personalizadas com IA"];
const solves = ["Organiza clientes", "Controla creditos", "Evita prompt baguncado", "Salva historico", "Mantem galeria por cliente", "Ajuda a entregar mais rapido"];
const previews = [
  ["Previa do ensaio", "Cards visuais para acompanhar cada entrega."],
  ["Galeria organizada", "Imagens por cliente, ensaio e favorito."],
  ["Fluxo guiado", "Checklist antes de gerar imagens."],
  ["Controle de creditos", "Saldo e transacoes sempre visiveis."]
];
const faqs = [
  ["Preciso ser fotografo?", "Nao. O app foi pensado para quem vende imagens com IA e precisa de um fluxo organizado."],
  ["A IA ja esta integrada?", "O MVP roda com geracao controlada e esta preparado para providers reais no backend."],
  ["Como funcionam os creditos?", "Cada geracao consome creditos conforme a quantidade de imagens escolhida."],
  ["Posso usar para clientes reais?", "Sim, desde que voce tenha autorizacao de uso de imagem da pessoa fotografada."],
  ["As fotos ficam salvas?", "As referencias e resultados ficam vinculados ao usuario, cliente e ensaio."],
  ["Posso apagar imagens?", "Sim. A galeria permite favoritar, visualizar, baixar e remover imagens."]
];

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

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-8 md:px-8 lg:grid-cols-[1fr_.9fr] lg:pb-20 lg:pt-14">
        <div className="flex flex-col justify-center">
          <StatusBadge tone="good">SaaS para vender ensaios com IA</StatusBadge>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">Venda ensaios realistas com IA sem depender de estudio, camera ou edicao complexa</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Cadastre a cliente, envie fotos de referencia, escolha o estilo do ensaio e gere imagens profissionais com fluxo guiado, creditos controlados e galeria organizada.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/register">Comecar agora <ArrowRight className="h-4 w-4" /></Button>
            <Button href="#como-funciona" variant="secondary">Ver como funciona</Button>
          </div>
        </div>
        <div className="grid min-h-[520px] gap-4 sm:grid-cols-2">
          {previews.map(([title, text], index) => (
            <div key={title} className="photo-tile rounded-lg border border-white/10 p-4 shadow-premium">
              <div className="flex h-full flex-col justify-between rounded-lg bg-black/20 p-4">
                <div className="h-24 rounded-lg border border-white/10 bg-white/[.06]" />
                <div>
                  <span className="text-xs uppercase text-cyan">PhotoForge AI</span>
                  <strong className="mt-2 block text-xl">{title}</strong>
                  <p className="mt-2 text-sm leading-5 text-slate-300">{text}</p>
                  <div className="mt-4 flex gap-1">{Array.from({ length: index + 2 }).map((_, dot) => <span key={dot} className="h-1.5 w-8 rounded-full bg-cyan/60" />)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="border-y border-line bg-ink/80 px-4 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Como funciona" title="Do cadastro a entrega, tudo em um fluxo guiado" text="A plataforma organiza o trabalho para voce vender, produzir e acompanhar ensaios com mais previsibilidade." />
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {steps.map(([label, text, Icon], index) => {
              const I = Icon as typeof Camera;
              return <Card key={label as string} className="hover:border-cyan/40"><div className="flex items-center justify-between"><I className="h-6 w-6 text-cyan" /><span className="text-sm text-slate-500">0{index + 1}</span></div><h3 className="mt-4 font-semibold">{label as string}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text as string}</p></Card>;
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:px-8 lg:grid-cols-2">
        <div>
          <SectionHeader eyebrow="Para quem e" title="Para quem quer vender imagens personalizadas com processo profissional" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">{audiences.map((item) => <div key={item} className="rounded-lg border border-line bg-panel/70 p-3 text-sm text-slate-300"><CheckCircle2 className="mr-2 inline h-4 w-4 text-cyan" />{item}</div>)}</div>
        </div>
        <div>
          <SectionHeader eyebrow="O que resolve" title="Menos improviso, mais controle sobre cada entrega" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">{solves.map((item) => <div key={item} className="rounded-lg border border-line bg-panel/70 p-3 text-sm text-slate-300"><Workflow className="mr-2 inline h-4 w-4 text-gold" />{item}</div>)}</div>
        </div>
      </section>

      <section className="border-y border-line bg-panel/60 px-4 py-14 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <SectionHeader eyebrow="Seguranca e consentimento" title="Uso de imagem precisa ser tratado com responsabilidade" text="Antes de gerar, o sistema exige confirmacao de autorizacao de uso de imagem. Isso ajuda a criar um processo mais seguro para quem vende e para quem aparece nas fotos." />
          <Card className="bg-ink/80"><LockKeyhole className="h-8 w-8 text-cyan" /><p className="mt-4 text-sm leading-6 text-slate-300">Fotos de referencia, ensaios, creditos e imagens geradas ficam organizados por usuario, cliente e ensaio. O objetivo e entregar com profissionalismo sem transformar o processo em planilhas soltas e prompts perdidos.</p></Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <SectionHeader eyebrow="Planos" title="Comece simples e evolua conforme o volume" />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["Comunidade", "Creditos mais baratos, templates exclusivos futuramente e ideal para alunos."],
            ["Publico", "Acesso normal, creditos avulsos e ideal para testar a oferta."],
            ["Pro", "Maior volume, uso profissional e gestao avancada futuramente."]
          ].map(([plan, text]) => <Card key={plan} className="hover:border-cyan/40"><h3 className="text-2xl font-semibold">{plan}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{text}</p><Button href="/register" className="mt-6 w-full" variant={plan === "Publico" ? "primary" : "secondary"}>Entrar</Button></Card>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <SectionHeader eyebrow="FAQ" title="Perguntas comuns antes de comecar" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">{faqs.map(([question, answer]) => <Card key={question}><h3 className="font-semibold">{question}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{answer}</p></Card>)}</div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 border-t border-line px-4 py-8 text-sm text-slate-500 md:px-8">
        <span>PhotoForge AI</span>
        <div className="flex gap-4"><a href="/terms">Termos</a><a href="/privacy">Privacidade</a><a href="/image-policy">Uso de imagem</a></div>
      </footer>
    </main>
  );
}
