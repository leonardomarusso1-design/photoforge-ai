import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button, Card, Logo, SectionHeader, StatusBadge } from "@/components/ui";
import { GeneratedGalleryPreview, HeroProductMockup, LandingPhotoGuideImage, MiniClientCard, OrderToDeliveryMockup, RequiredPhotosPreview, SecurityTrustGrid, TemplateChipsPreview, TemplatePreviewCard, VisualStepCard } from "@/components/visual";

const categories = [
  ["Aniversario", "Baloes, vestido elegante, luz de estudio e clima de celebracao.", "Celebracao", "template-aniversario.png"],
  ["Profissional", "Retratos corporativos para perfil, autoridade e posicionamento.", "Corporativo", "template-profissional.png"],
  ["Casal", "Fotos com clima natural, conexao e composicao elegante.", "Editorial", "template-casal.png"],
  ["Infantil", "Cenarios delicados, seguros e com estetica suave.", "Suave", "template-infantil.png"],
  ["Fitness", "Visual de academia, postura forte e iluminacao atletica.", "Atletico", "template-fitness.png"],
  ["Praia", "Luz natural, cenario aberto e estetica lifestyle.", "Lifestyle", "template-praia.png"]
] as const;

const photoGuides = [
  ["Rosto neutro", "Boa iluminacao, rosto visivel e sem filtro forte.", "upload-rosto-neutro.png"],
  ["Rosto sorrindo", "Ajuda a preservar expressao e tracos reais.", "upload-rosto-sorrindo.png"],
  ["Corpo inteiro de frente", "Foto de corpo inteiro para preservar proporcoes.", "upload-corpo-frente.png"],
  ["Corpo inteiro de lado", "Referencia extra para volume, postura e silhueta.", "upload-corpo-lado.png"]
] as const;

const templates = [
  ["Aniversario Luxo", "Decoracao elegante, luz de estudio e composicao de celebracao.", "Aniversario", "template-aniversario.png"],
  ["Profissional Premium", "Retrato corporativo com presenca, confianca e acabamento editorial.", "Profissional", "template-profissional.png"],
  ["Casal Editorial", "Conexao natural, gestos elegantes e clima sofisticado.", "Casal", "template-casal.png"],
  ["Infantil Estudio", "Cenario delicado, seguro e com estetica suave.", "Infantil", "template-infantil.png"],
  ["Fitness Academia", "Luz atletica, postura forte e visual de performance.", "Fitness", "template-fitness.png"],
  ["Praia Lifestyle", "Luz natural, movimento suave e cenario aberto.", "Praia", "template-praia.png"],
  ["Gestante Elegante", "Ensaio respeitoso, emocional e com styling refinado.", "Gestante", "template-gestante.png"],
  ["Casual Urbano", "Ambiente natural, roupa casual e composicao moderna.", "Casual", "template-casual.png"]
];

const faqs = [
  ["Preciso ser fotografo?", "Nao. O app organiza o processo para quem vende imagens com IA e precisa de um fluxo confiavel."],
  ["Como funcionam os creditos?", "Os creditos controlam quantas imagens podem ser geradas em cada ensaio."],
  ["Posso usar para clientes reais?", "Sim, desde que voce tenha autorizacao de uso de imagem da pessoa fotografada."],
  ["As imagens ficam salvas?", "Sim. As imagens ficam vinculadas ao usuario, cliente e ensaio."],
  ["Posso excluir fotos?", "Sim. A galeria permite remover imagens do fluxo visivel."],
  ["A IA ja esta integrada?", "O app ja foi pensado para geracao real. A liberacao publica deve acontecer somente apos testes de qualidade, controle de creditos e seguranca de custo."],
  ["O app garante que o rosto fique identico?", "Nao. O objetivo e preservar identidade com o maximo de qualidade possivel, mas toda geracao com IA precisa de revisao humana antes da entrega."],
  ["O app substitui edicao manual?", "Ele acelera a criacao e organizacao, mas nao promete resultado perfeito nem substitui revisao profissional quando necessario."]
];

export default function LandingPage() {
  return (
    <main className="mesh min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button href="/login" variant="ghost">Entrar</Button>
          <Button href="/register" variant="ghost">Criar conta</Button>
          <Button href="#planos" variant="secondary">Ver planos</Button>
          <Button href="/register">Comprar creditos</Button>
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

      <section className="border-y border-line bg-ink/80 px-4 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Galeria pronta para revisao" title="Veja o que voce pode criar com um fluxo guiado" text="Escolha o tipo de ensaio, envie as referencias certas e mantenha tudo organizado por cliente." />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(([title, description, badge, image]) => <TemplatePreviewCard key={title} title={title} description={description} badge={badge} imageSrc={`/assets/landing/${image}`} />)}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <SectionHeader eyebrow="Como funciona" title="Parece uma esteira real de producao, nao uma pagina de prompts soltos" text="Cada etapa foi pensada para reduzir improviso e aumentar confianca antes da entrega." />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <VisualStepCard title="Cliente" text="Centralize contato e status antes de iniciar."><MiniClientCard /></VisualStepCard>
          <VisualStepCard title="Fotos" text="Envie as referencias certas para o ensaio."><RequiredPhotosPreview /></VisualStepCard>
          <VisualStepCard title="Estilo" text="Escolha templates e detalhes do resultado."><TemplateChipsPreview /></VisualStepCard>
          <VisualStepCard title="Entrega" text="Revise a galeria e baixe a selecao."><GeneratedGalleryPreview /></VisualStepCard>
        </div>
      </section>

      <section className="border-y border-line bg-panel/60 px-4 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Fluxo completo" title="Do pedido da cliente ate a entrega final" text="O PhotoForge organiza cada etapa para voce nao depender de conversas perdidas, arquivos soltos e prompts improvisados." />
          <div className="mt-8"><OrderToDeliveryMockup /></div>
        </div>
      </section>

      <section className="border-y border-line bg-panel/60 px-4 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Fotos de referencia" title="As fotos certas aumentam a qualidade do resultado" text="O app guia o usuario sobre quais imagens enviar para preservar identidade, proporcoes, cabelo, pele e detalhes importantes." />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {photoGuides.map(([title, text, image]) => (
              <Card key={title} className="p-3 hover:border-cyan/40">
                <LandingPhotoGuideImage src={`/assets/landing/${image}`} title={title} />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-5 text-slate-400">{text}</p>
                <div className="mt-3"><StatusBadge tone="warn">Orientacao</StatusBadge></div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <SectionHeader eyebrow="Templates" title="Templates prontos para vender mais rapido" text="Use ideias de ensaio como ponto de partida para criar ofertas mais claras e entregaveis mais consistentes." />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map(([title, description, badge, image]) => <TemplatePreviewCard key={title} title={title} description={description} badge={badge} imageSrc={`/assets/landing/${image}`} />)}
        </div>
      </section>

      <section className="border-y border-line bg-ink/80 px-4 py-16 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
          <SectionHeader eyebrow="Seguranca e consentimento" title="Uso de imagem precisa ser tratado com responsabilidade" text="Antes de gerar, o sistema exige confirmacao de autorizacao de uso de imagem. Isso ajuda a criar um processo mais seguro para quem vende e para quem aparece nas fotos." />
          <SecurityTrustGrid />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <Card className="border-gold/25 bg-gold/10 p-6 md:p-8">
          <h2 className="text-2xl font-semibold">IA acelera, mas revisao humana continua essencial</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">O PhotoForge organiza clientes, fotos, creditos e entregas para reduzir improviso. A geracao com IA deve sempre ser revisada antes de ser enviada para a cliente.</p>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <SectionHeader eyebrow="Planos" title="Escolha um caminho para comecar" />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["Comunidade", "Melhor custo para membros", "Para alunos que querem vender ensaios com IA pagando menos por creditos.", ["Creditos com condicao especial", "Templates e atualizacoes primeiro", "Ideal para aprender vendendo"], "Entrar como membro"],
            ["Publico", "Teste inicial", "Para testar a plataforma e comprar creditos avulsos sem compromisso.", ["Acesso ao fluxo completo", "Creditos avulsos", "Bom para validar a oferta"], "Comecar teste"],
            ["Pro", "Mais volume", "Para quem pretende atender mais clientes e operar com volume.", ["Mais controle de operacao", "Historico e galeria organizados", "Pensado para escala futura"], "Quero usar no volume"]
          ].map(([plan, badge, text, bullets, cta]) => <Card key={plan as string} className={plan === "Comunidade" ? "border-cyan/50 bg-cyan/10 shadow-[0_24px_80px_rgba(45,212,191,.12)] hover:border-cyan" : "hover:border-cyan/40"}><StatusBadge tone={plan === "Comunidade" ? "good" : "default"}>{badge as string}</StatusBadge><h3 className="mt-4 text-2xl font-semibold">{plan as string}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{text as string}</p><div className="mt-5 grid gap-2">{(bullets as string[]).map((item) => <div key={item} className="flex gap-2 text-sm text-slate-300"><CheckCircle2 className="mt-0.5 h-4 w-4 text-cyan" />{item}</div>)}</div><Button href="/register" className="mt-6 w-full" variant={plan === "Publico" ? "primary" : "secondary"}>{cta as string}</Button></Card>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <SectionHeader eyebrow="FAQ" title="Perguntas comuns antes de comecar" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">{faqs.map(([question, answer]) => <Card key={question}><h3 className="font-semibold">{question}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{answer}</p></Card>)}</div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <Card className="grid gap-6 border-cyan/25 bg-cyan/10 p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-semibold md:text-3xl">Seu proximo ensaio pode sair de um fluxo organizado, nao de um prompt solto</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Comece criando sua conta, cadastre uma cliente e teste o processo completo dentro do PhotoForge AI.</p>
          </div>
          <div className="flex flex-wrap gap-3"><Button href="/register">Comecar agora</Button><Button href="/login" variant="secondary">Fazer login</Button></div>
        </Card>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 border-t border-line px-4 py-8 text-sm text-slate-500 md:px-8">
        <span>PhotoForge AI</span>
        <div className="flex gap-4"><a href="/terms">Termos</a><a href="/privacy">Privacidade</a><a href="/image-policy">Uso de imagem</a></div>
      </footer>
    </main>
  );
}
