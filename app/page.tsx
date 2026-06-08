import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Sparkles, WalletCards, Workflow } from "lucide-react";
import { Button, Card, Logo, SectionHeader, StatusBadge } from "@/components/ui";
import { EditorialImagePlaceholder, GeneratedGalleryPreview, HeroProductMockup, MiniClientCard, RequiredPhotosPreview, TemplateChipsPreview, TemplatePreviewCard, VisualStepCard } from "@/components/visual";

const categories = [
  ["Aniversario", "Baloes, vestido elegante, luz de estudio e clima de celebracao.", "Celebracao", "template"],
  ["Profissional", "Retratos corporativos para perfil, autoridade e posicionamento.", "Corporativo", "portrait"],
  ["Casal", "Fotos com clima natural, conexao e composicao elegante.", "Editorial", "template"],
  ["Infantil", "Cenarios delicados, seguros e com estetica suave.", "Suave", "portrait"],
  ["Fitness", "Visual de academia, postura forte e iluminacao atletica.", "Atletico", "body-front"],
  ["Praia", "Luz natural, cenario aberto e estetica lifestyle.", "Lifestyle", "body-side"]
] as const;

const photoGuides = [
  ["Rosto neutro", "Boa iluminacao, rosto visivel e sem filtro forte.", "portrait"],
  ["Rosto sorrindo", "Ajuda a preservar expressao e tracos reais.", "portrait"],
  ["Corpo inteiro de frente", "Foto de corpo inteiro para preservar proporcoes.", "body-front"],
  ["Corpo inteiro de lado", "Referencia extra para volume, postura e silhueta.", "body-side"],
  ["Tatuagens e detalhes", "Envie detalhes visiveis para manter marcas importantes.", "detail"]
] as const;

const templates = [
  ["Aniversario Luxo", "Decoracao elegante, luz de estudio e composicao de celebracao.", "Aniversario"],
  ["Profissional Premium", "Retrato corporativo com presenca, confianca e acabamento editorial.", "Profissional"],
  ["Casal Editorial", "Conexao natural, gestos elegantes e clima sofisticado.", "Casal"],
  ["Infantil Estudio", "Cenario delicado, seguro e com estetica suave.", "Infantil"],
  ["Fitness Academia", "Luz atletica, postura forte e visual de performance.", "Fitness"],
  ["Praia Lifestyle", "Luz natural, movimento suave e cenario aberto.", "Praia"],
  ["Gestante Elegante", "Ensaio respeitoso, emocional e com styling refinado.", "Gestante"],
  ["Casual Urbano", "Ambiente natural, roupa casual e composicao moderna.", "Casual"]
];

const faqs = [
  ["Preciso ser fotografo?", "Nao. O app organiza o processo para quem vende imagens com IA e precisa de um fluxo confiavel."],
  ["Como funcionam os creditos?", "Os creditos controlam quantas imagens podem ser geradas em cada ensaio."],
  ["Posso usar para clientes reais?", "Sim, desde que voce tenha autorizacao de uso de imagem da pessoa fotografada."],
  ["As imagens ficam salvas?", "Sim. As imagens ficam vinculadas ao usuario, cliente e ensaio."],
  ["Posso excluir fotos?", "Sim. A galeria permite remover imagens do fluxo visivel."],
  ["A IA ja esta integrada?", "A estrutura esta preparada para geracao real, mas a liberacao publica deve acontecer com seguranca, testes e controle de custo."],
  ["O app substitui edicao manual?", "Ele acelera a criacao e organizacao, mas nao promete resultado perfeito nem substitui revisao profissional quando necessario."]
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

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-8 md:px-8 lg:grid-cols-[.9fr_1fr] lg:pb-20 lg:pt-14">
        <div className="flex flex-col justify-center">
          <StatusBadge tone="good">Plataforma visual para vender ensaios com IA</StatusBadge>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">Venda ensaios realistas com IA sem depender de estudio, camera ou edicao complexa</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Cadastre a cliente, envie as fotos certas, escolha o estilo do ensaio e gere imagens com aparencia profissional em um fluxo guiado.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/register">Comecar agora <ArrowRight className="h-4 w-4" /></Button>
            <Button href="#como-funciona" variant="secondary">Ver como funciona</Button>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {["Fluxo guiado por cliente", "Controle de creditos", "Galeria organizada", "Consentimento obrigatorio"].map((item) => <div key={item} className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-cyan" />{item}</div>)}
          </div>
        </div>
        <HeroProductMockup />
      </section>

      <section className="border-y border-line bg-ink/80 px-4 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Previews visuais" title="Veja o que voce pode criar com um fluxo guiado" text="Escolha o tipo de ensaio, envie as referencias certas e mantenha tudo organizado por cliente." />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(([title, description, badge, kind]) => <TemplatePreviewCard key={title} title={title} description={description} badge={badge} kind={kind} />)}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <SectionHeader eyebrow="Como funciona" title="Parece uma esteira real de producao, nao uma pagina de prompts soltos" text="Cada etapa foi pensada para reduzir improviso e aumentar confianca antes da entrega." />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <VisualStepCard title="Cadastre a cliente" text="Centralize contato, status e historico antes de iniciar o ensaio."><MiniClientCard /></VisualStepCard>
          <VisualStepCard title="Envie as fotos obrigatorias" text="O app mostra quais fotos faltam e so libera quando existem referencias reais."><RequiredPhotosPreview /></VisualStepCard>
          <VisualStepCard title="Escolha o estilo do ensaio" text="Use categorias, roupas, cenario, pose e templates para orientar a criacao."><TemplateChipsPreview /></VisualStepCard>
          <VisualStepCard title="Gere, revise e entregue" text="Revise a galeria, favorite imagens e baixe os resultados para a cliente."><GeneratedGalleryPreview /></VisualStepCard>
        </div>
      </section>

      <section className="border-y border-line bg-panel/60 px-4 py-14 md:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Fotos de referencia" title="As fotos certas aumentam a qualidade do resultado" text="O app guia o usuario sobre quais imagens enviar para preservar identidade, proporcoes, cabelo, pele e detalhes importantes." />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {photoGuides.map(([title, text, kind]) => (
              <Card key={title} className="p-3 hover:border-cyan/40">
                <EditorialImagePlaceholder kind={kind} label={title} className="aspect-[4/5]" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-5 text-slate-400">{text}</p>
                <div className="mt-3"><StatusBadge tone="warn">Orientacao</StatusBadge></div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <SectionHeader eyebrow="Templates" title="Templates prontos para vender mais rapido" text="Use ideias de ensaio como ponto de partida para criar ofertas mais claras e entregaveis mais consistentes." />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map(([title, description, badge], index) => <TemplatePreviewCard key={title} title={title} description={description} badge={badge} kind={index % 3 === 0 ? "template" : index % 3 === 1 ? "portrait" : "body-front"} />)}
        </div>
      </section>

      <section className="border-y border-line bg-ink/80 px-4 py-14 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <SectionHeader eyebrow="Seguranca e consentimento" title="Uso de imagem precisa ser tratado com responsabilidade" text="Antes de gerar, o sistema exige confirmacao de autorizacao de uso de imagem. Isso ajuda a criar um processo mais seguro para quem vende e para quem aparece nas fotos." />
          <Card className="bg-panel/80"><LockKeyhole className="h-8 w-8 text-cyan" /><p className="mt-4 text-sm leading-6 text-slate-300">Fotos de referencia, ensaios, creditos e imagens geradas ficam organizados por usuario, cliente e ensaio. O objetivo e entregar com profissionalismo sem transformar o processo em planilhas soltas e prompts perdidos.</p></Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <SectionHeader eyebrow="Planos" title="Escolha um caminho para comecar" />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["Comunidade", "Melhor para membros", "Para alunos e membros com creditos mais baratos.", ["Creditos com condicao especial", "Templates exclusivos futuramente", "Ideal para aprender vendendo"]],
            ["Publico", "Comece simples", "Para quem quer testar e comprar creditos avulsos.", ["Acesso normal ao app", "Fluxo completo de ensaios", "Bom para validar a oferta"]],
            ["Pro", "Uso profissional", "Para quem vai vender em volume e precisa de mais controle.", ["Maior volume de operacao", "Gestao avancada futuramente", "Pensado para recorrencia"]]
          ].map(([plan, badge, text, bullets]) => <Card key={plan as string} className="hover:border-cyan/40"><StatusBadge tone={plan === "Comunidade" ? "good" : "default"}>{badge as string}</StatusBadge><h3 className="mt-4 text-2xl font-semibold">{plan as string}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{text as string}</p><div className="mt-5 grid gap-2">{(bullets as string[]).map((item) => <div key={item} className="flex gap-2 text-sm text-slate-300"><CheckCircle2 className="mt-0.5 h-4 w-4 text-cyan" />{item}</div>)}</div><Button href="/register" className="mt-6 w-full" variant={plan === "Publico" ? "primary" : "secondary"}>Comecar</Button></Card>)}
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
