import { Camera, CheckCircle2, Download, Heart, Image as ImageIcon, Sparkles, UserRound } from "lucide-react";
import { clsx } from "clsx";
import { Button, Card, StatusBadge } from "@/components/ui";

type PlaceholderKind = "portrait" | "body-front" | "body-side" | "gallery" | "template" | "detail";
type VisualTone = "cyan" | "warm" | "cool" | "editorial" | "soft" | "contrast" | "bright" | "delicate" | "urban";

const kindGlow: Record<PlaceholderKind, string> = {
  portrait: "from-cyan/30 via-violet/20 to-gold/20",
  "body-front": "from-violet/30 via-cyan/15 to-white/10",
  "body-side": "from-gold/25 via-violet/20 to-cyan/15",
  gallery: "from-cyan/20 via-white/10 to-violet/25",
  template: "from-gold/25 via-cyan/15 to-violet/25",
  detail: "from-white/15 via-cyan/20 to-gold/20"
};

const toneGlow: Record<VisualTone, string> = {
  cyan: "from-cyan/30 via-violet/20 to-gold/20",
  warm: "from-gold/35 via-red-300/15 to-violet/20",
  cool: "from-cyan/25 via-blue-300/15 to-white/10",
  editorial: "from-violet/35 via-cyan/15 to-black/20",
  soft: "from-white/20 via-cyan/10 to-violet/15",
  contrast: "from-white/20 via-cyan/20 to-black/40",
  bright: "from-cyan/20 via-white/20 to-gold/20",
  delicate: "from-gold/20 via-white/15 to-violet/20",
  urban: "from-slate-400/20 via-cyan/15 to-violet/20"
};

export function EditorialImagePlaceholder({ kind = "portrait", tone, label, className }: { kind?: PlaceholderKind; tone?: VisualTone; label?: string; className?: string }) {
  return (
    <div className={clsx("relative overflow-hidden rounded-lg border border-white/10 bg-ink shadow-premium", className)}>
      <div className={clsx("absolute inset-0 bg-gradient-to-br opacity-80", tone ? toneGlow[tone] : kindGlow[kind])} />
      <div className="absolute inset-0 photo-noise opacity-60" />
      <div className="absolute -left-8 top-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-44 w-28 bg-black/20 blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
      {kind === "portrait" || kind === "detail" ? (
        <>
          <div className="absolute left-1/2 top-[24%] h-16 w-16 -translate-x-1/2 rounded-full border border-white/20 bg-white/15 shadow-[0_0_50px_rgba(45,212,191,.2)]" />
          <div className="absolute left-1/2 top-[45%] h-28 w-24 -translate-x-1/2 rounded-t-full border border-white/10 bg-white/10" />
        </>
      ) : null}
      {kind === "body-front" || kind === "body-side" ? (
        <>
          <div className="absolute left-1/2 top-[18%] h-12 w-12 -translate-x-1/2 rounded-full border border-white/20 bg-white/15" />
          <div className={clsx("absolute top-[34%] h-44 rounded-full border border-white/10 bg-white/10", kind === "body-front" ? "left-1/2 w-24 -translate-x-1/2" : "left-[52%] w-16 -translate-x-1/2")} />
          <div className="absolute left-[43%] top-[50%] h-28 w-3 rounded-full bg-white/10" />
          <div className="absolute left-[55%] top-[50%] h-28 w-3 rounded-full bg-white/10" />
        </>
      ) : null}
      {kind === "gallery" || kind === "template" ? (
        <div className="absolute inset-4 grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="rounded-md border border-white/10 bg-white/10" />)}
        </div>
      ) : null}
      {label ? <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-xs text-slate-100 backdrop-blur">{label}</div> : null}
    </div>
  );
}

export function ClientAvatar({ name, className }: { name?: string; className?: string }) {
  const initials = (name || "Cliente").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL";
  return <div className={clsx("grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-cyan/80 to-violet/80 text-sm font-semibold text-white", className)}>{initials}</div>;
}

export function HeroProductMockup() {
  return (
    <div className="relative rounded-lg border border-white/10 bg-panel/95 p-3 shadow-premium">
      <div className="absolute -inset-1 -z-10 rounded-lg bg-gradient-to-br from-cyan/20 via-violet/10 to-gold/20 blur-xl" />
      <div className="grid overflow-hidden rounded-lg border border-line bg-ink lg:grid-cols-[84px_1fr]">
        <aside className="hidden border-r border-line bg-black/20 p-3 lg:block">
          <div className="mb-5 h-8 w-8 rounded-lg bg-white" />
          <div className="grid gap-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className={clsx("h-8 rounded-md", index === 2 ? "bg-white" : "bg-white/10")} />)}</div>
        </aside>
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ClientAvatar name="Marina Alves" />
              <div>
                <p className="text-sm text-slate-400">Marina Alves</p>
                <h3 className="text-xl font-semibold">Ensaio Aniversario Luxo</h3>
              </div>
            </div>
            <div className="flex flex-wrap gap-2"><StatusBadge tone="good">25 creditos</StatusBadge><Button variant="secondary">Revisar galeria</Button></div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["warm", "portrait"],
              ["cool", "template"],
              ["editorial", "body-front"],
              ["delicate", "portrait"]
            ].map(([tone, kind], index) => <EditorialImagePlaceholder key={index} kind={kind as PlaceholderKind} tone={tone as VisualTone} className="aspect-[3/4] ring-1 ring-white/5" />)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge tone="good">4 imagens geradas</StatusBadge>
            <StatusBadge tone="warn">Pronto para revisar</StatusBadge>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplatePreviewCard({ title, description, badge, kind = "template", tone }: { title: string; description: string; badge: string; kind?: PlaceholderKind; tone?: VisualTone }) {
  return (
    <Card className="overflow-hidden p-0 hover:-translate-y-0.5 hover:border-cyan/50">
      <EditorialImagePlaceholder kind={kind} tone={tone} label={badge} className="aspect-[4/5] rounded-b-none border-x-0 border-t-0" />
      <div className="p-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-5 text-slate-400">{description}</p>
      </div>
    </Card>
  );
}

export function OrderToDeliveryMockup() {
  const checklist = ["Fotos obrigatorias", "Consentimento", "Creditos", "Estilo escolhido"];
  return (
    <div className="rounded-lg border border-white/10 bg-panel/95 p-4 shadow-premium">
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="bg-ink/70">
          <p className="text-xs uppercase text-slate-500">Cliente</p>
          <div className="mt-4 flex items-center gap-3"><ClientAvatar name="Marina Alves" /><div><p className="font-semibold">Marina Alves</p><p className="text-xs text-slate-400">Aguardando fotos</p></div></div>
        </Card>
        <Card className="bg-ink/70">
          <p className="text-xs uppercase text-slate-500">Fotos</p>
          <div className="mt-4 grid grid-cols-4 gap-2">{["portrait", "portrait", "body-front", "body-side"].map((kind, index) => <EditorialImagePlaceholder key={index} kind={kind as PlaceholderKind} tone={index % 2 ? "cool" : "soft"} className="aspect-[3/4]" />)}</div>
          <div className="mt-3"><StatusBadge tone="good">Todas enviadas</StatusBadge></div>
        </Card>
        <Card className="bg-ink/70">
          <p className="text-xs uppercase text-slate-500">Geracao</p>
          <div className="mt-4 grid gap-2">{checklist.map((item) => <div key={item} className="flex items-center justify-between rounded-lg border border-line bg-white/[.03] px-3 py-2 text-xs"><span>{item}</span><StatusBadge tone="good">OK</StatusBadge></div>)}</div>
        </Card>
        <Card className="bg-ink/70">
          <p className="text-xs uppercase text-slate-500">Entrega</p>
          <div className="mt-4 grid grid-cols-4 gap-2">{["warm", "cool", "editorial", "bright"].map((tone, index) => <EditorialImagePlaceholder key={index} tone={tone as VisualTone} kind="template" className="aspect-[3/4]" />)}</div>
          <Button variant="secondary" className="mt-4 w-full">Baixar selecao</Button>
        </Card>
      </div>
    </div>
  );
}

export function VisualStepCard({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <Card className="grid gap-4 hover:border-cyan/40">
      <div className="min-h-36 rounded-lg border border-line bg-ink/70 p-3">{children}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
      </div>
    </Card>
  );
}

export function UploadVisualCard({ title, text, complete, preview, kind = "portrait", children }: { title: string; text: string; complete?: boolean; preview?: string; kind?: PlaceholderKind; children?: React.ReactNode }) {
  return (
    <div className={clsx("rounded-lg border p-4 transition hover:border-cyan/40", complete ? "border-cyan/40 bg-cyan/10" : "border-line bg-ink/50")}>
      <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
        {preview ? <img src={preview} alt={title} className="aspect-[4/5] w-full rounded-lg border border-line object-cover" /> : <EditorialImagePlaceholder kind={kind} label={complete ? "Enviada" : "Pendente"} className="aspect-[4/5]" />}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-white">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
            </div>
            <StatusBadge tone={complete ? "good" : "warn"}>{complete ? "Enviada" : "Pendente"}</StatusBadge>
          </div>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function EmptyGalleryState() {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white/[.03] p-6 text-center">
      <div className="mx-auto grid max-w-sm grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, index) => <EditorialImagePlaceholder key={index} kind={index % 2 ? "portrait" : "template"} className="aspect-[3/4] opacity-70" />)}
      </div>
      <h3 className="mt-6 text-lg font-semibold text-white">Sua galeria ainda esta vazia.</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">Gere seu primeiro ensaio para ver as imagens aqui.</p>
      <Button href="/app/shoots/new" className="mt-5">Criar ensaio</Button>
    </div>
  );
}

export function RecentShootPreview({ title, category, imageUrl }: { title: string; category: string; imageUrl?: string }) {
  return (
    <div className="grid gap-3 rounded-lg border border-line bg-ink/60 p-3 sm:grid-cols-[96px_1fr]">
      {imageUrl ? <img src={imageUrl} alt={title} className="aspect-[3/4] rounded-lg border border-line object-cover" /> : <EditorialImagePlaceholder kind="template" label={category} className="aspect-[3/4]" />}
      <div className="flex flex-col justify-between">
        <div>
          <StatusBadge tone="default">{category}</StatusBadge>
          <h3 className="mt-3 font-semibold">{title}</h3>
          <p className="mt-2 text-sm text-slate-400">Continue revisando referencias, creditos e entrega.</p>
        </div>
        <div className="mt-4 flex gap-2 text-slate-400"><Camera className="h-4 w-4" /><Sparkles className="h-4 w-4" /><ImageIcon className="h-4 w-4" /></div>
      </div>
    </div>
  );
}

export function MiniGalleryActions() {
  return (
    <div className="flex gap-2">
      <Button variant="ghost" title="Favoritar"><Heart className="h-4 w-4" /></Button>
      <Button variant="ghost" title="Baixar"><Download className="h-4 w-4" /></Button>
      <Button variant="ghost" title="Abrir"><CheckCircle2 className="h-4 w-4" /></Button>
    </div>
  );
}

export function MiniClientCard() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[.04] p-3">
      <ClientAvatar name="Marina Alves" />
      <div>
        <p className="font-semibold">Marina Alves</p>
        <p className="text-xs text-slate-400">Pronta para gerar</p>
      </div>
      <StatusBadge tone="good">Cliente</StatusBadge>
    </div>
  );
}

export function RequiredPhotosPreview() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        ["Rosto neutro", "portrait"],
        ["Rosto sorrindo", "portrait"],
        ["Corpo frente", "body-front"],
        ["Corpo lado", "body-side"]
      ].map(([label, kind]) => <EditorialImagePlaceholder key={label} kind={kind as PlaceholderKind} label={label} className="aspect-[3/4]" />)}
    </div>
  );
}

export function TemplateChipsPreview() {
  return (
    <div className="grid gap-2">
      {["Aniversario Luxo", "Profissional Premium", "Praia Lifestyle"].map((item) => <div key={item} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[.04] p-2 text-sm"><span>{item}</span><StatusBadge tone="default">Template</StatusBadge></div>)}
    </div>
  );
}

export function GeneratedGalleryPreview() {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-4 gap-2">{Array.from({ length: 4 }).map((_, index) => <EditorialImagePlaceholder key={index} kind={index % 2 ? "portrait" : "template"} className="aspect-[3/4]" />)}</div>
      <Button variant="secondary" className="w-full"><Download className="h-4 w-4" /> Baixar</Button>
    </div>
  );
}

export function UploadKindForType(type: string): PlaceholderKind {
  if (type.includes("full_body") || type.includes("body")) return type.includes("side") ? "body-side" : "body-front";
  if (type.includes("tattoo") || type.includes("hair") || type.includes("outfit")) return "detail";
  return "portrait";
}

export function UserRoundIcon() {
  return <UserRound className="h-4 w-4" />;
}
