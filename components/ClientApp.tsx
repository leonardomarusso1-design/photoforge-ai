"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Camera, CheckCircle2, Copy, Download, Heart, Image as ImageIcon, Mail, MessageCircle, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Users, WalletCards } from "lucide-react";
import { categories, optionalPhotoTypes, requiredPhotoTypes } from "@/lib/demoData";
import type { Client, ClientStatus, DemoState, GeneratedImage, GenerationQuantity, ReferencePhoto, Shoot } from "@/lib/types";
import { buildPremiumPrompt, defaultNegativePrompt } from "@/lib/ai/buildPremiumPrompt";
import { auditReferencePhoto, summarizePhotoQuality } from "@/lib/ai/photoQuality";
import { Button, Card, EmptyState, Field, inputClass, MetricCard, StatusBadge } from "@/components/ui";
import { ClientAvatar, EditorialImagePlaceholder, EmptyGalleryState, MiniGalleryActions, RecentShootPreview, UploadKindForType, UploadVisualCard } from "@/components/visual";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentAuthUser, getCurrentUserId } from "@/lib/supabase/currentUser";

const defaultGenerationConfig: DemoState["generationConfig"] = {
  provider: "mock",
  effectiveProvider: "mock",
  isRealProvider: false,
  realAiEnabledForAdmin: false,
  quantityOptions: [4, 8, 16],
  creditsPerImage: 1
};

function useDemoState() {
  const [state, setState] = useState<DemoState | null>(null);
  const [loadError, setLoadError] = useState("");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function load() {
    setLoadError("");
    try {
      const user = await getCurrentAuthUser(supabase);
      if (!user?.email) return;
      const userId = user.id;

      await fetch("/api/auth/ensure-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email: user.email, name: user.user_metadata?.name })
      });

      const [profileRes, clientsRes, shootsRes, refsRes, imagesRes, creditsRes, txRes, logsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("clients").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("shoots").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("reference_photos").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("generated_images").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("credits").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("credit_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("generation_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false })
      ]);

      const queryError = [profileRes, clientsRes, shootsRes, refsRes, imagesRes, creditsRes, txRes, logsRes].find((result) => result.error)?.error;
      if (queryError) {
        throw new Error(queryError.message);
      }

      let generationConfig = defaultGenerationConfig;
      try {
        const configResponse = await fetch("/api/generation-config");
        if (configResponse.ok) {
          generationConfig = { ...defaultGenerationConfig, ...(await configResponse.json()) };
        }
      } catch (error) {
        logSupabaseError("Generation config error", error);
      }

      const now = new Date().toISOString();
      setState({
        profile: profileRes.data ?? {
          id: userId,
          user_id: userId,
          name: user.user_metadata?.name ?? user.email.split("@")[0],
          email: user.email,
          role: "user",
          plan_type: "free",
          status: "active",
          created_at: now,
          updated_at: now
        },
        clients: (clientsRes.data ?? []) as Client[],
        shoots: (shootsRes.data ?? []) as Shoot[],
        referencePhotos: (refsRes.data ?? []) as ReferencePhoto[],
        generatedImages: (imagesRes.data ?? []) as GeneratedImage[],
        credits: creditsRes.data ?? { id: userId, user_id: userId, balance: 0, total_purchased: 0, total_used: 0, updated_at: now },
        creditTransactions: txRes.data ?? [],
        generationLogs: logsRes.data ?? [],
        generationConfig
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel carregar os dados do Supabase.";
      logSupabaseError("Supabase error", error);
      setLoadError(process.env.NODE_ENV === "development" ? message : "Nao foi possivel carregar seus dados agora.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const commit = (next: DemoState) => {
    setState(next);
  };
  return { state, commit, reload: load, supabase, loadError };
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const clientStatusLabels: Record<ClientStatus, string> = {
  new: "Novo",
  waiting_photos: "Aguardando fotos",
  ready: "Pronto para gerar",
  generating: "Em geracao",
  review: "Em revisao",
  delivered: "Entregue",
  cancelled: "Cancelado"
};

const clientStatusOptions = Object.entries(clientStatusLabels) as [ClientStatus, string][];

function clientStatusLabel(status: string) {
  return clientStatusLabels[status as ClientStatus] ?? status;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function logSupabaseError(context: string, error: unknown) {
  if (!error) return;
  const supabaseError = error as { message?: string; details?: string; hint?: string; code?: string };
  console.error(context, {
    message: supabaseError.message,
    details: supabaseError.details,
    hint: supabaseError.hint,
    code: supabaseError.code,
    full: error
  });
}

function PageTitle({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{text}</p>
      </div>
      {action}
    </div>
  );
}

function planLabel(plan?: string, role?: string) {
  if (role === "admin") return "Admin";
  if (plan === "community" || plan === "Comunidade") return "Comunidade";
  if (plan === "pro" || plan === "Pro") return "Pro";
  return "Publico";
}

function firstName(name?: string) {
  return (name || "Usuario").split(" ")[0] || "Usuario";
}

function creditCostForQuantity(state: DemoState, quantity: number) {
  return quantity * state.generationConfig.creditsPerImage;
}

function quantitySelectOptions(state: DemoState) {
  return state.generationConfig.quantityOptions.length > 0 ? state.generationConfig.quantityOptions : defaultGenerationConfig.quantityOptions;
}

const optionalReferenceAliases: Record<string, string[]> = {
  outfit_visual: ["outfit_visual", "outfit_reference"],
  pose_scenario: ["pose_scenario", "mood_reference"],
  important_detail: ["important_detail", "tattoo_arm", "tattoo_leg", "back", "hair_detail"],
  extra: ["extra"]
};

function findReferenceByType(refs: ReferencePhoto[], type: string) {
  const aliases = optionalReferenceAliases[type] ?? [type];
  return refs.find((ref) => aliases.includes(ref.type));
}

function qualityStatusTone(status?: string | null): "default" | "good" | "warn" | "bad" {
  if (status === "approved" || status === "boa") return "good";
  if (status === "warning" || status === "media") return "warn";
  if (status === "rejected" || status === "ruim") return "bad";
  return "default";
}

function qualityStatusLabel(status?: string | null) {
  if (status === "approved" || status === "boa") return "Aprovada";
  if (status === "warning" || status === "media") return "Atencao";
  if (status === "rejected" || status === "ruim") return "Reprovada";
  return "Pendente";
}

async function inspectImageFile(file: File) {
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  const canvas = document.createElement("canvas");
  const size = 96;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return { width, height };
  }
  context.drawImage(bitmap, 0, 0, size, size);
  const data = context.getImageData(0, 0, size, size).data;
  let dark = 0;
  let bright = 0;
  let topDelta = 0;
  const topRows = 10;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
      if (luminance < 45) dark += 1;
      if (luminance > 235) bright += 1;
      if (y < topRows && x > 0) {
        const previous = index - 4;
        const previousLuminance = 0.2126 * data[previous] + 0.7152 * data[previous + 1] + 0.0722 * data[previous + 2];
        topDelta += Math.abs(luminance - previousLuminance);
      }
    }
  }
  bitmap.close();
  return {
    width,
    height,
    darkRatio: dark / (size * size),
    brightRatio: bright / (size * size),
    topEdgeContrast: topDelta / (topRows * Math.max(size - 1, 1))
  };
}

export function DashboardPage() {
  const { state, loadError } = useDemoState();
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const revenue = state.clients.reduce((sum, client) => sum + client.total_revenue, 0);
  const cost = state.generationLogs.reduce((sum, log) => sum + log.cost_estimate, 0);
  const activeClients = state.clients.filter((client) => !client.deleted_at);
  const activeShoots = state.shoots.filter((shoot) => !shoot.deleted_at);
  const recentImages = state.generatedImages.filter((image) => !image.deleted_at).slice(0, 4);
  const incompleteShoot = activeShoots.find((shoot) => shoot.status === "draft" || shoot.status === "ready" || shoot.status === "failed");
  const latestShoot = activeShoots[0];
  const nextStep = activeClients.length === 0
    ? { title: "Cadastre sua primeira cliente para comecar.", text: "Depois disso voce ja pode criar o primeiro ensaio guiado.", href: "/app/clients/new", label: "Novo cliente" }
    : activeShoots.length === 0
      ? { title: "Crie um ensaio para sua cliente.", text: "Escolha categoria, envie referencias e prepare a geracao.", href: "/app/shoots/new", label: "Novo ensaio" }
      : incompleteShoot
        ? { title: "Continue o ensaio em andamento.", text: `${incompleteShoot.title} ainda precisa de revisao ou conclusao.`, href: `/app/shoots/${incompleteShoot.id}`, label: "Continuar" }
        : { title: "Pronto para criar o proximo ensaio?", text: "Seu fluxo esta organizado. Comece uma nova entrega quando quiser.", href: "/app/shoots/new", label: "Novo ensaio" };
  return (
    <>
      <PageTitle title={`Ola, ${firstName(state.profile.name)}. Pronto para criar o proximo ensaio?`} text="Acompanhe clientes, ensaios, creditos e entregas em um painel pensado para operacao diaria." action={<Button href="/app/shoots/new"><Plus className="h-4 w-4" /> Novo ensaio</Button>} />
      <Card className="mb-6 grid gap-4 border-cyan/25 bg-cyan/10 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <StatusBadge tone="good">Proximo passo</StatusBadge>
          <h2 className="mt-3 text-xl font-semibold">{nextStep.title}</h2>
          <p className="mt-2 text-sm text-slate-300">{nextStep.text}</p>
        </div>
        <Button href={nextStep.href}>{nextStep.label}</Button>
      </Card>
      {state.credits.balance < 20 ? <div className="mb-5 rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm text-gold">Seus creditos estao acabando. Recarregue para continuar gerando ensaios.</div> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Creditos restantes" value={state.credits.balance} Icon={WalletCards} tone="cyan" />
        <MetricCard label="Clientes cadastrados" value={activeClients.length} Icon={Users} tone="violet" />
        <MetricCard label="Ensaios criados" value={activeShoots.length} Icon={Camera} tone="lime" />
        <MetricCard label="Imagens criadas" value={state.generatedImages.filter((img) => !img.deleted_at).length} Icon={ImageIcon} tone="gold" />
        <MetricCard label="Receita estimada" value={money(revenue)} Icon={BarChart3} tone="cyan" />
        <MetricCard label="Lucro estimado" value={money(revenue - cost)} Icon={CheckCircle2} tone="lime" />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card>
          <h2 className="text-lg font-semibold">Ultimos ensaios</h2>
          <div className="mt-4 grid gap-3">
            {activeShoots.length === 0 ? <EmptyState title="Voce ainda nao tem ensaios criados." text="Crie um ensaio para organizar fotos, estilo, consentimento e geracao." action={<Button href="/app/shoots/new">Criar ensaio</Button>} /> : activeShoots.slice(0, 5).map((shoot) => <ShootRow key={shoot.id} shoot={shoot} client={state.clients.find((c) => c.id === shoot.client_id)} />)}
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Continue criando</h2>
          <div className="mt-4">
            {latestShoot ? <RecentShootPreview title={latestShoot.title} category={latestShoot.category} imageUrl={recentImages[0]?.file_url} /> : <div className="rounded-lg border border-line bg-ink/60 p-3"><EditorialImagePlaceholder kind="template" label="Primeiro ensaio" className="aspect-[16/10]" /><p className="mt-3 text-sm text-slate-400">Voce ainda nao criou nenhum ensaio. Cadastre uma cliente e envie as fotos obrigatorias para comecar.</p></div>}
          </div>
          <h2 className="mt-6 text-lg font-semibold">Acoes rapidas</h2>
          <div className="mt-4 grid gap-3">
            <Button href="/app/clients/new" variant="secondary">Criar cliente</Button>
            <Button href="/app/shoots/new" variant="secondary">Criar ensaio</Button>
            <Button href="/app/gallery" variant="secondary">Abrir galeria</Button>
            <Button href="/app/credits" variant="secondary">Solicitar creditos</Button>
            {state.profile.role === "admin" ? <Button href="/admin/logs" variant="secondary">Ver logs admin</Button> : null}
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Imagens recentes</h2>
          <Button href="/app/gallery" variant="ghost">Ver galeria</Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {recentImages.length > 0 ? recentImages.map((image, index) => <img key={image.id} src={image.file_url} alt="Imagem recente" className="aspect-[3/4] rounded-lg border border-line object-cover" onError={(event) => { event.currentTarget.src = `/api/placeholder?seed=dashboard-${image.id}-${index}`; }} />) : Array.from({ length: 4 }).map((_, index) => <EditorialImagePlaceholder key={index} kind={index % 2 ? "portrait" : "template"} label="Em breve" className="aspect-[3/4]" />)}
        </div>
      </Card>
    </>
  );
}

function ShootRow({ shoot, client }: { shoot: Shoot; client?: Client }) {
  const tone = shoot.status === "completed" ? "good" : shoot.status === "failed" ? "bad" : shoot.status === "generating" ? "warn" : "default";
  return (
    <Link href={`/app/shoots/${shoot.id}`} className="grid gap-4 rounded-lg border border-line bg-ink/50 p-3 transition hover:border-cyan/50 sm:grid-cols-[72px_1fr_auto] sm:items-center">
      <EditorialImagePlaceholder kind="template" label={shoot.category} className="aspect-[3/4]" />
      <div>
        <p className="font-medium text-white">{shoot.title}</p>
        <p className="text-xs text-slate-400">{client?.name ?? "Cliente"} - {shoot.category}</p>
        <p className="mt-2 text-xs text-slate-500">{shoot.credits_used || 0} creditos usados - {shoot.quantity} imagens</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end"><StatusBadge tone={tone}>{shoot.status}</StatusBadge><span className="text-xs text-cyan">{shoot.status === "completed" ? "Revisar" : "Continuar"}</span></div>
    </Link>
  );
}

export function ClientsPage() {
  const { state, loadError } = useDemoState();
  const [search, setSearch] = useState("");
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const allClients = state.clients.filter((client) => !client.deleted_at);
  const clients = allClients
    .filter((client) => `${client.name} ${client.whatsapp} ${client.email ?? ""} ${client.city ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <PageTitle title="Clientes" text="Cadastre clientes finais, acompanhe status, receita informada e historico de ensaios." action={<Button href="/app/clients/new"><Plus className="h-4 w-4" /> Novo cliente</Button>} />
      <Card className="mb-6">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-ink/70 px-3">
          <Search className="h-4 w-4 text-slate-500" />
          <input className="min-h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="Buscar por nome, WhatsApp, e-mail ou cidade" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </Card>
      {clients.length === 0 ? <EmptyState title={allClients.length === 0 ? "Voce ainda nao cadastrou nenhuma cliente." : "Nenhuma cliente encontrada."} text={allClients.length === 0 ? "Cadastre a primeira cliente para criar um ensaio com IA." : "Tente buscar por outro nome, WhatsApp, e-mail ou cidade."} action={<Button href="/app/clients/new">Cadastrar cliente</Button>} /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients.map((client) => (
          <Link href={`/app/clients/${client.id}`} key={client.id}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-cyan/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <ClientAvatar name={client.name} />
                  <div>
                  <h2 className="text-lg font-semibold">{client.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{client.whatsapp}</p>
                  </div>
                </div>
                <StatusBadge>{clientStatusLabel(client.status)}</StatusBadge>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Cidade</p><p>{client.city || "-"}</p></div>
                <div><p className="text-slate-500">Receita</p><p>{money(client.total_revenue)}</p></div>
                <div><p className="text-slate-500">Ensaios</p><p>{state.shoots.filter((shoot) => shoot.client_id === client.id && !shoot.deleted_at).length}</p></div>
                <div><p className="text-slate-500">Atividade</p><p>{new Date(client.updated_at || client.created_at).toLocaleDateString("pt-BR")}</p></div>
              </div>
              <p className="mt-5 text-xs text-slate-500">Clique para ver ensaios, editar dados e abrir a galeria da cliente.</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

export function ClientFormPage() {
  const router = useRouter();
  const { state, supabase, loadError } = useDemoState();
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", city: "", age: "", notes: "", status: "new" as ClientStatus });
  const [errorMessage, setErrorMessage] = useState("");
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    let userId = "";
    try {
      userId = await getCurrentUserId(supabase);
    } catch (error) {
      logSupabaseError("Supabase error", error);
      setErrorMessage("Sessao invalida. Entre novamente para salvar a cliente.");
      return;
    }

    if (!isValidWhatsapp(form.whatsapp)) {
      setErrorMessage("Informe um WhatsApp valido com DDD.");
      return;
    }
    if (!isValidEmail(form.email)) {
      setErrorMessage("Informe um e-mail valido.");
      return;
    }
    if (form.age && (Number.isNaN(Number(form.age)) || Number(form.age) < 0 || Number(form.age) > 130)) {
      setErrorMessage("Informe uma idade valida entre 0 e 130.");
      return;
    }

    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        user_id: userId,
        name: form.name,
        whatsapp: form.whatsapp,
        email: form.email || null,
        city: form.city || null,
        age: Number(form.age) || null,
        notes: form.notes || null,
        status: form.status,
        total_revenue: 0
      })
      .select("*")
      .single();

    if (error || !client) {
      logSupabaseError("Supabase error", error);
      setErrorMessage(process.env.NODE_ENV === "development" && error?.message ? `Erro do Supabase: ${error.message}` : "Nao foi possivel salvar a cliente agora. Confira os dados e tente novamente.");
      return;
    }

    router.push(`/app/clients/${client.id}`);
  }
  return (
    <>
      <PageTitle title="Novo cliente" text="Registre os dados principais para manter contatos, ensaios e entregas organizados." action={<Button href="/app/clients" variant="secondary">Voltar</Button>} />
      <Card>
        {errorMessage ? <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{errorMessage}</div> : null}
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <Field label="Nome"><input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="WhatsApp"><input required className={inputClass} type="tel" inputMode="tel" placeholder="+55 11 90000-0000" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
          <Field label="E-mail"><input required className={inputClass} type="email" placeholder="cliente@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Cidade"><input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="Idade"><input className={inputClass} type="number" inputMode="numeric" min={0} max={130} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value.replace(/\D/g, "") })} /></Field>
          <Field label="Status"><select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}>{clientStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Observacoes"><textarea className={inputClass} rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex flex-wrap gap-3 md:col-span-2"><Button type="submit">Salvar cliente</Button><Button href="/app/clients" variant="secondary">Cancelar</Button><Button href="/app/dashboard" variant="ghost">Voltar</Button></div>
        </form>
      </Card>
    </>
  );
}

export function ClientDetailPage({ id }: { id: string }) {
  const { state, reload, supabase, loadError } = useDemoState();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editError, setEditError] = useState("");
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", city: "", age: "", notes: "", status: "new" as ClientStatus });
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const client = state.clients.find((item) => item.id === id && !item.deleted_at);
  if (!client) return <EmptyState title="Cliente nao encontrado" text="Esse registro nao existe no estado demo." />;
  const currentClient = client;
  const shoots = state.shoots.filter((shoot) => shoot.client_id === id && !shoot.deleted_at);
  const images = state.generatedImages.filter((image) => image.client_id === id && !image.deleted_at);

  function startEditing() {
    setForm({
      name: currentClient.name,
      whatsapp: currentClient.whatsapp,
      email: currentClient.email ?? "",
      city: currentClient.city ?? "",
      age: currentClient.age ? String(currentClient.age) : "",
      notes: currentClient.notes ?? "",
      status: currentClient.status
    });
    setEditError("");
    setEditing(true);
  }

  async function saveClient(event: React.FormEvent) {
    event.preventDefault();
    setEditError("");
    if (!isValidWhatsapp(form.whatsapp)) {
      setEditError("Informe um WhatsApp valido com DDD.");
      return;
    }
    if (!isValidEmail(form.email)) {
      setEditError("Informe um e-mail valido.");
      return;
    }
    setSaving(true);
    const userId = await getCurrentUserId(supabase);
    const { error } = await supabase
      .from("clients")
      .update({
        name: form.name,
        whatsapp: form.whatsapp,
        email: form.email,
        city: form.city || null,
        age: Number(form.age) || null,
        notes: form.notes || null,
        status: form.status,
        updated_at: new Date().toISOString()
      })
      .eq("id", currentClient.id)
      .eq("user_id", userId);
    setSaving(false);

    if (error) {
      logSupabaseError("Supabase error", error);
      setEditError(process.env.NODE_ENV === "development" ? `Erro do Supabase: ${error.message}` : "Nao foi possivel salvar a cliente.");
      return;
    }
    setEditing(false);
    await reload();
  }

  async function deleteClient() {
    const confirmed = window.confirm("Excluir esta cliente? Os ensaios e imagens vinculados tambem sairao do dashboard e das listas.");
    if (!confirmed) return;
    setEditError("");
    setDeleting(true);
    const userId = await getCurrentUserId(supabase);
    const deletedAt = new Date().toISOString();

    const imagesUpdate = await supabase
      .from("generated_images")
      .update({ deleted_at: deletedAt })
      .eq("client_id", currentClient.id)
      .eq("user_id", userId);

    const shootsUpdate = await supabase
      .from("shoots")
      .update({ deleted_at: deletedAt, status: "archived", updated_at: deletedAt })
      .eq("client_id", currentClient.id)
      .eq("user_id", userId);

    const clientUpdate = await supabase
      .from("clients")
      .update({ deleted_at: deletedAt, status: "cancelled", updated_at: deletedAt })
      .eq("id", currentClient.id)
      .eq("user_id", userId);

    setDeleting(false);
    const error = imagesUpdate.error || shootsUpdate.error || clientUpdate.error;
    if (error) {
      logSupabaseError("Supabase error", error);
      setEditError(process.env.NODE_ENV === "development" ? `Erro do Supabase: ${error.message}` : "Nao foi possivel excluir a cliente.");
      return;
    }

    router.push("/app/clients");
    await reload();
  }

  return (
    <>
      <PageTitle title={currentClient.name} text={`${currentClient.whatsapp} - ${currentClient.city || "Cidade nao informada"}`} action={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={startEditing}>Editar</Button><Button variant="danger" disabled={deleting} onClick={deleteClient}><Trash2 className="h-4 w-4" /> {deleting ? "Excluindo..." : "Excluir"}</Button><Button href={`/app/shoots/new?client=${currentClient.id}`}>Novo ensaio</Button></div>} />
      {editError && !editing ? <div className="mb-5 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{editError}</div> : null}
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Card>
          <h2 className="text-lg font-semibold">Dados da cliente</h2>
          {editing ? (
            <form onSubmit={saveClient} className="mt-4 grid gap-3">
              {editError ? <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{editError}</div> : null}
              <Field label="Nome"><input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="WhatsApp"><input required className={inputClass} type="tel" inputMode="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
              <Field label="E-mail"><input required className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Cidade"><input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
              <Field label="Idade"><input className={inputClass} type="number" min={0} max={130} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value.replace(/\D/g, "") })} /></Field>
              <Field label="Status"><select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}>{clientStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
              <Field label="Observacoes"><textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
              <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button></div>
            </form>
          ) : (
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <p>Status: <StatusBadge>{clientStatusLabel(client.status)}</StatusBadge></p>
              <p>Email: {client.email || "-"}</p>
              <p>Idade: {client.age || "-"}</p>
              <p>Receita informada: {money(client.total_revenue)}</p>
              <p className="text-slate-400">{client.notes}</p>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Ensaios vinculados</h2>
          <div className="mt-4 grid gap-3">{shoots.map((shoot) => <ShootRow key={shoot.id} shoot={shoot} client={client} />)}</div>
        </Card>
      </div>
      <GalleryGrid images={images} title="Imagens geradas" clients={state.clients} shoots={state.shoots} />
    </>
  );
}

export function ShootsPage() {
  const { state, loadError } = useDemoState();
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const shoots = state.shoots.filter((shoot) => !shoot.deleted_at);
  return (
    <>
      <PageTitle title="Ensaios" text="Acompanhe rascunhos, geracoes concluidas, falhas e entregas." action={<Button href="/app/shoots/new"><Plus className="h-4 w-4" /> Criar ensaio</Button>} />
      {shoots.length === 0 ? <EmptyState title="Voce ainda nao tem ensaios criados." text="Crie um ensaio para organizar fotos, briefing, consentimento e geracao." action={<Button href="/app/shoots/new">Criar ensaio</Button>} /> : <div className="grid gap-3">{shoots.map((shoot) => <ShootRow key={shoot.id} shoot={shoot} client={state.clients.find((c) => c.id === shoot.client_id)} />)}</div>}
    </>
  );
}

export function ShootCreatePage() {
  const router = useRouter();
  const { state, supabase, loadError } = useDemoState();
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState("");
  const [form, setForm] = useState<Partial<Shoot>>({ title: "", category: "Aniversario", sold_price: 0, quantity: 4, consent_confirmed: false, provider: "mock" });
  const [draftShoot, setDraftShoot] = useState<Shoot | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<Record<string, ReferencePhoto>>({});
  const [uploadPreviews, setUploadPreviews] = useState<Record<string, string>>({});
  const [flowError, setFlowError] = useState("");
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const client = state.clients.find((item) => item.id === selectedClient);
  const existingRefs = draftShoot ? state.referencePhotos.filter((photo) => photo.shoot_id === draftShoot.id) : [];
  const currentRefs = [...existingRefs, ...Object.values(uploadedPhotos)];
  const photoQuality = summarizePhotoQuality(currentRefs);
  const readyPhotos = Boolean(draftShoot) && photoQuality.ok;
  const selectedQuantity = (form.quantity as GenerationQuantity) || quantitySelectOptions(state)[0];
  const selectedCreditCost = creditCostForQuantity(state, selectedQuantity);
  const ready = Boolean(client && form.title && form.category && readyPhotos && form.consent_confirmed && state.credits.balance >= selectedCreditCost);

  async function ensureDraftShoot() {
    if (!client) {
      setFlowError("Selecione uma cliente antes de continuar.");
      return null;
    }
    if (!form.title) {
      setFlowError("Informe o nome do ensaio antes de continuar.");
      return null;
    }
    setFlowError("");
    const userId = await getCurrentUserId(supabase);
    const payload = {
      user_id: userId,
      client_id: client.id,
      title: form.title || "Novo ensaio",
      category: form.category || "Personalizado",
      status: "draft",
      sold_price: Number(form.sold_price) || 0,
      outfit: form.outfit || null,
      outfit_color: form.outfit_color || null,
      shoes: form.shoes || null,
      accessories: form.accessories || null,
      hair: form.hair || null,
      makeup: form.makeup || null,
      location: form.location || null,
      mood: form.mood || null,
      pose: form.pose || null,
      expression: form.expression || null,
      lighting: form.lighting || null,
      photo_style: form.photo_style || null,
      free_notes: form.free_notes || null,
      credits_used: 0,
      provider: "mock",
      quantity: selectedQuantity,
      consent_confirmed: Boolean(form.consent_confirmed)
    };

    const query = draftShoot
      ? supabase.from("shoots").update(payload).eq("id", draftShoot.id).eq("user_id", userId)
      : supabase.from("shoots").insert(payload);

    let { data: shoot, error } = await query.select("*").single();

    if (error?.message?.includes("'quantity' column")) {
      const { quantity, ...payloadWithoutQuantity } = payload;
      const fallbackQuery = draftShoot
        ? supabase.from("shoots").update(payloadWithoutQuantity).eq("id", draftShoot.id).eq("user_id", userId)
        : supabase.from("shoots").insert(payloadWithoutQuantity);
      const fallback = await fallbackQuery.select("*").single();
      shoot = fallback.data;
      error = fallback.error;
    }

    if (error || !shoot) {
      logSupabaseError("Supabase error", error);
      const quantityConstraint = error?.message?.includes("shoots_quantity_check") || error?.message?.includes("violates check constraint");
      setFlowError(quantityConstraint ? "O Supabase ainda precisa liberar quantidade 1 e 2 para teste real. Rode o arquivo supabase/fix-shoot-quantity-real-ai.sql no SQL Editor." : process.env.NODE_ENV === "development" && error?.message ? `Erro do Supabase: ${error.message}` : "Nao foi possivel salvar o ensaio no Supabase.");
      return null;
    }

    setDraftShoot(shoot as Shoot);
    return shoot as Shoot;
  }

  async function uploadReferencePhoto(type: string, file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFlowError("Use apenas imagens JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFlowError("A imagem precisa ter no maximo 10 MB.");
      return;
    }
    const shoot = await ensureDraftShoot();
    if (!shoot || !client) return;
    const userId = await getCurrentUserId(supabase);
    const imageInspection = await inspectImageFile(file);
    const audit = auditReferencePhoto({
      type,
      fileName: file.name,
      fileSize: file.size,
      ...imageInspection
    });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${userId}/${client.id}/${shoot.id}/${type}/${Date.now()}-${safeName}`;
    const storage = supabase.storage.from("client-reference-photos");
    const upload = await storage.upload(storagePath, file, { contentType: file.type, upsert: true });

    if (upload.error) {
      logSupabaseError("Supabase error", upload.error);
      setFlowError(process.env.NODE_ENV === "development" ? `Erro no upload: ${upload.error.message}` : "Nao foi possivel enviar a foto agora.");
      return;
    }

    await supabase
      .from("reference_photos")
      .delete()
      .eq("user_id", userId)
      .eq("shoot_id", shoot.id)
      .eq("type", type);

    const referencePayload = {
      user_id: userId,
      client_id: client.id,
      shoot_id: shoot.id,
      type,
      storage_path: storagePath,
      file_url: storagePath,
      quality_status: audit.quality_status,
      quality_score: audit.quality_score,
      quality_issues: audit.quality_issues,
      quality_recommendation: audit.quality_recommendation,
      can_be_primary_identity: audit.can_be_primary_identity,
      is_screenshot: audit.is_screenshot,
      has_face: audit.has_face,
      face_clear: audit.face_clear,
      face_visible: audit.has_face,
      body_visible: audit.body_visible,
      resolution_ok: audit.resolution_ok,
      lighting_quality: audit.lighting_quality,
      audited_at: audit.audited_at,
      notes: file.name
    };

    let { data: referencePhoto, error } = await supabase
      .from("reference_photos")
      .insert(referencePayload)
      .select("*")
      .single();

    if (error?.message?.includes("'body_visible' column") || error?.message?.includes("'face_visible' column") || error?.message?.includes("'lighting_quality' column") || error?.message?.includes("'storage_path' column") || error?.message?.includes("'quality_score' column")) {
      const { face_visible, body_visible, lighting_quality, storage_path, quality_score, quality_issues, quality_recommendation, can_be_primary_identity, is_screenshot, has_face, face_clear, resolution_ok, audited_at, ...fallbackPayload } = referencePayload;
      const fallback = await supabase
        .from("reference_photos")
        .insert(fallbackPayload)
        .select("*")
        .single();
      referencePhoto = fallback.data;
      error = fallback.error;
    }

    if (error || !referencePhoto) {
      logSupabaseError("Supabase error", error);
      setFlowError(process.env.NODE_ENV === "development" && error?.message ? `Erro do Supabase: ${error.message}` : "Nao foi possivel salvar a referencia no banco.");
      return;
    }

    setUploadedPhotos((current) => ({ ...current, [type]: referencePhoto as ReferencePhoto }));
    setUploadPreviews((current) => {
      if (current[type]) URL.revokeObjectURL(current[type]);
      return { ...current, [type]: URL.createObjectURL(file) };
    });
    setFlowError("");
  }

  async function removeReferencePhoto(type: string) {
    const shoot = draftShoot;
    if (!shoot) return;
    const userId = await getCurrentUserId(supabase);
    const current = uploadedPhotos[type] ?? existingRefs.find((ref) => ref.type === type);
    const pathToRemove = current?.storage_path || current?.file_url;
    if (pathToRemove) await supabase.storage.from("client-reference-photos").remove([pathToRemove]);
    const { error } = await supabase
      .from("reference_photos")
      .delete()
      .eq("user_id", userId)
      .eq("shoot_id", shoot.id)
      .eq("type", type);

    if (error) {
      logSupabaseError("Supabase error", error);
      setFlowError(process.env.NODE_ENV === "development" ? `Erro do Supabase: ${error.message}` : "Nao foi possivel remover a foto.");
      return;
    }

    setUploadedPhotos((currentPhotos) => {
      const next = { ...currentPhotos };
      delete next[type];
      return next;
    });
    setUploadPreviews((current) => {
      if (current[type]) URL.revokeObjectURL(current[type]);
      const next = { ...current };
      delete next[type];
      return next;
    });
  }

  async function saveDraft(target: "draft" | "generate") {
    if (!client) return;
    const shoot = await ensureDraftShoot();
    if (!shoot) return;
    const userId = await getCurrentUserId(supabase);
    const { error } = await supabase
      .from("shoots")
      .update({ status: target === "generate" ? "ready" : "draft", consent_confirmed: Boolean(form.consent_confirmed), consent_confirmed_at: form.consent_confirmed ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq("id", shoot.id)
      .eq("user_id", userId);

    if (error?.message?.includes("'consent_confirmed_at' column")) {
      const fallback = await supabase
        .from("shoots")
        .update({ status: target === "generate" ? "ready" : "draft", consent_confirmed: Boolean(form.consent_confirmed), updated_at: new Date().toISOString() })
        .eq("id", shoot.id)
        .eq("user_id", userId);
      if (fallback.error) {
        logSupabaseError("Supabase error", fallback.error);
        setFlowError(process.env.NODE_ENV === "development" ? `Erro do Supabase: ${fallback.error.message}` : "Nao foi possivel atualizar o ensaio.");
        return;
      }
    } else if (error) {
      logSupabaseError("Supabase error", error);
      setFlowError(process.env.NODE_ENV === "development" ? `Erro do Supabase: ${error.message}` : "Nao foi possivel atualizar o ensaio.");
      return;
    }

    await supabase
      .from("clients")
      .update({ total_revenue: client.total_revenue + (Number(form.sold_price) || 0), status: "ready" })
      .eq("id", client.id)
      .eq("user_id", userId);

    router.push(`/app/shoots/${shoot.id}`);
  }

  async function nextStep() {
    if (step === 1) {
      const shoot = await ensureDraftShoot();
      if (!shoot) return;
    }
    setStep(step + 1);
  }

  return (
    <>
      <PageTitle title="Criar ensaio" text="Fluxo guiado com checklist para garantir fotos, categoria, consentimento e creditos antes da geracao." />
      <div className="mb-5 grid gap-2 md:grid-cols-5">{["Dados", "Fotos", "Referencias", "Personalizacao", "Geracao"].map((label, index) => {
        const current = step === index + 1;
        const done = step > index + 1;
        return <button key={label} onClick={() => setStep(index + 1)} className={`rounded-lg border px-3 py-3 text-left text-sm transition ${current ? "border-cyan bg-cyan/10 text-cyan" : done ? "border-cyan/30 bg-panel text-white" : "border-line bg-panel text-slate-400 hover:border-white/20"}`}><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-white/10 text-xs">{done ? "OK" : index + 1}</span>{label}</button>;
      })}</div>
      <Card>
        {flowError ? <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{flowError}</div> : null}
        {step === 1 && <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome do ensaio"><input className={inputClass} value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Cliente vinculada"><select className={inputClass} value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}><option value="">Selecione</option>{state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Categoria"><select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
          <Field label="Valor vendido"><input className={inputClass} type="number" value={form.sold_price ?? 0} onChange={(e) => setForm({ ...form, sold_price: Number(e.target.value) })} /></Field>
          <Field label="Observacoes internas"><textarea className={inputClass} rows={3} value={form.free_notes ?? ""} onChange={(e) => setForm({ ...form, free_notes: e.target.value })} /></Field>
        </div>}
        {step === 2 && <PhotoStep refs={currentRefs} previews={uploadPreviews} onUpload={uploadReferencePhoto} onRemove={removeReferencePhoto} />}
        {step === 3 && <div>
          <h2 className="text-lg font-semibold">Referencias opcionais</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Use referencias para guiar roupa, pose, cenario ou detalhes importantes. A identidade deve vir das fotos principais.</p>
          <div className="mt-4 rounded-lg border border-line bg-ink/60 p-4 text-sm text-slate-300">Referencias opcionais ajudam no estilo, mas nao substituem as fotos principais de rosto e corpo.</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{optionalPhotoTypes.map((photo) => <ReferenceUploadField key={photo.type} photo={photo} refPhoto={findReferenceByType(currentRefs, photo.type)} preview={uploadPreviews[photo.type]} onUpload={uploadReferencePhoto} onRemove={removeReferencePhoto} />)}</div>
        </div>}
        {step === 4 && <PersonalizationFields form={form} setForm={setForm} />}
        {step === 5 && <GenerationStep state={state} form={form} setForm={setForm} client={client} readyPhotos={readyPhotos} ready={ready} />}
        <div className="mt-6 flex flex-wrap gap-3">
          {step > 1 ? <Button variant="secondary" onClick={() => setStep(step - 1)}>Voltar</Button> : null}
          {step < 5 ? <Button onClick={nextStep}>Continuar</Button> : <Button disabled={!ready} onClick={() => saveDraft("generate")}>Salvar e preparar geracao</Button>}
          <Button variant="ghost" onClick={() => saveDraft("draft")} disabled={!client || !form.title}>Salvar rascunho</Button>
          <Button href="/app/shoots" variant="ghost">Cancelar</Button>
        </div>
      </Card>
    </>
  );
}

function PhotoStep({ refs, previews, onUpload, onRemove }: { refs: ReferencePhoto[]; previews: Record<string, string>; onUpload: (type: string, file: File) => void; onRemove: (type: string) => void }) {
  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-line bg-ink/60 p-4 text-sm leading-6 text-slate-300">Use uma foto nitida, bem iluminada e sem filtro forte. Para tatuagens visiveis, envie areas especificas nas referencias opcionais.</div>
      <div className="grid gap-3 md:grid-cols-2">{requiredPhotoTypes.map((photo) => <ReferenceUploadField key={photo.type} photo={photo} refPhoto={refs.find((ref) => ref.type === photo.type)} preview={previews[photo.type]} required onUpload={onUpload} onRemove={onRemove} />)}</div>
    </div>
  );
}

function ReferenceUploadField({ photo, refPhoto, preview, required, onUpload, onRemove }: { photo: { type: string; label: string; description?: string }; refPhoto?: ReferencePhoto; preview?: string; required?: boolean; onUpload: (type: string, file: File) => void; onRemove: (type: string) => void }) {
  const complete = Boolean(refPhoto);
  const issues = Array.isArray(refPhoto?.quality_issues) ? refPhoto.quality_issues : [];
  return (
    <UploadVisualCard title={photo.label} text={required ? "Use uma foto nitida, bem iluminada e sem filtro forte." : photo.description ?? "Envie uma referencia complementar."} complete={complete} preview={preview} kind={UploadKindForType(photo.type)}>
      <div className="grid gap-3">
        {complete && !preview ? <div className="rounded-lg border border-line bg-ink p-3 text-xs text-slate-300">Foto enviada: {refPhoto?.notes || refPhoto?.file_url}</div> : null}
        <div className="grid gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2"><span className="text-slate-500">Upload:</span><StatusBadge tone={complete ? "good" : "warn"}>{complete ? "Enviada" : "Pendente"}</StatusBadge></div>
          <div className="flex flex-wrap items-center gap-2"><span className="text-slate-500">Qualidade:</span><StatusBadge tone={qualityStatusTone(refPhoto?.quality_status)}>{qualityStatusLabel(refPhoto?.quality_status)}</StatusBadge>{typeof refPhoto?.quality_score === "number" ? <StatusBadge tone="default">Score: {refPhoto.quality_score}/100</StatusBadge> : null}{refPhoto?.can_be_primary_identity ? <StatusBadge tone="good">Identidade principal</StatusBadge> : null}</div>
        </div>
        {complete ? <div className="rounded-lg border border-line bg-ink/70 p-3 text-xs leading-5 text-slate-300">
          <p>{refPhoto?.quality_recommendation || "Auditoria pendente. Reenvie a foto para atualizar a analise."}</p>
          {issues.length > 0 ? <p className="mt-2 text-slate-500">Problemas: {issues.join(", ")}</p> : null}
        </div> : null}
        <div className="grid gap-2">
          <input id={`upload-${photo.type}`} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(photo.type, file);
            event.currentTarget.value = "";
          }} />
          <label htmlFor={`upload-${photo.type}`} className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-line bg-panel2 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan/70 hover:bg-white/[.07]">{complete ? "Trocar" : required ? "Enviar foto" : "Enviar referencia"}</label>
        </div>
        <div className="flex flex-wrap gap-2">{complete ? <Button variant="ghost" onClick={() => onRemove(refPhoto?.type ?? photo.type)}>Remover</Button> : null}<span className="text-xs text-slate-500">{complete ? "Voce pode trocar enviando outro arquivo." : "Placeholder visual nao conta como foto enviada."}</span></div>
      </div>
    </UploadVisualCard>
  );
}

function PersonalizationFields({ form, setForm }: { form: Partial<Shoot>; setForm: (next: Partial<Shoot>) => void }) {
  const [showFineTuning, setShowFineTuning] = useState(false);
  const category = form.category ?? "";
  const isChild = category.includes("Infantil");
  const essentialFields: [keyof Shoot, string, string][] = [
    ["outfit", "Roupa", "camisa oversized branca e short cinza"],
    ["outfit_color", "Cor principal da roupa", "branco e cinza"],
    ["location", "Cenario/local", "praia ao por do sol"],
    ["pose", "Pose desejada", "sentada em uma pedra"],
    ["expression", "Expressao desejada", "natural, sorriso leve"],
    ["photo_style", "Estilo fotografico", "foto realista DSLR editorial"]
  ];
  const fineFields: [keyof Shoot, string, string][] = [
    ["shoes", "Calcado", "tenis branco"],
    ["accessories", "Acessorios", "brincos discretos"],
    ["hair", "Cabelo", "manter cabelo igual ao original"],
    ...(!isChild ? [["makeup", "Maquiagem", "natural e elegante"] as [keyof Shoot, string, string]] : []),
    ["lighting", "Iluminacao", "luz natural suave"],
    ["mood", "Clima/ambiente", "leve, sofisticado e natural"]
  ];
  const renderField = ([key, label, placeholder]: [keyof Shoot, string, string]) => (
    <Field key={key} label={label}><input className={inputClass} placeholder={placeholder} value={(form[key] as string) ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field>
  );
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-lg font-semibold">Personalize o ensaio</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Preencha apenas o essencial. Os ajustes finos sao opcionais.</p>
      </div>
      <div className="rounded-lg border border-line bg-ink/60 p-4">
        <h3 className="font-semibold">Essencial</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{essentialFields.map(renderField)}</div>
      </div>
      <div className="rounded-lg border border-line bg-ink/60 p-4">
        <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setShowFineTuning((current) => !current)}>
          <span>
            <span className="block font-semibold">Ajustes finos</span>
            <span className="mt-1 block text-sm text-slate-400">Calcado, acessorios, cabelo, maquiagem, luz e clima.</span>
          </span>
          <StatusBadge tone={showFineTuning ? "good" : "default"}>{showFineTuning ? "Aberto" : "Opcional"}</StatusBadge>
        </button>
        {showFineTuning ? <div className="mt-4 grid gap-4 md:grid-cols-2">{fineFields.map(renderField)}</div> : null}
      </div>
      <div className="rounded-lg border border-line bg-ink/60 p-4">
        <h3 className="font-semibold">Observacoes extras</h3>
        <p className="mt-2 text-sm text-slate-400">Escreva qualquer detalhe importante que nao apareceu acima.</p>
        <textarea className={`${inputClass} mt-4 min-h-28`} placeholder="Ex.: manter cabelo igual, nao afinar corpo, nao usar sorriso grande, quero sentado em uma pedra, evitar pose exagerada..." value={form.free_notes ?? ""} onChange={(e) => setForm({ ...form, free_notes: e.target.value })} />
      </div>
      <div className="rounded-lg border border-line bg-ink/60 p-4 text-sm text-slate-400">Essas informacoes serao usadas para montar o prompt final.</div>
    </div>
  );
}

function GenerationStep({ state, form, setForm, client, readyPhotos, ready }: { state: DemoState; form: Partial<Shoot>; setForm: (next: Partial<Shoot>) => void; client?: Client; readyPhotos: boolean; ready: boolean }) {
  const options = quantitySelectOptions(state);
  const quantity = (form.quantity as GenerationQuantity) || options[0];
  const creditsNeeded = creditCostForQuantity(state, quantity);
  const checklist = [
    ["Cliente selecionada", Boolean(client)],
    ["Fotos obrigatorias aprovadas", readyPhotos],
    ["Categoria escolhida", Boolean(form.category)],
    ["Consentimento confirmado", Boolean(form.consent_confirmed)],
    ["Creditos suficientes", state.credits.balance >= creditsNeeded]
  ] as const;
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
      <div className="grid gap-4">
        {state.generationConfig.realAiEnabledForAdmin ? <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm leading-6 text-gold">Modo teste com IA real ativo. Cada imagem consome 10 créditos e pode gerar custo na API.</div> : null}
        <Card className="bg-ink/60">
          <h3 className="font-semibold">Resumo do ensaio</h3>
          <div className="mt-4 grid gap-2 text-sm text-slate-300">
            <p>Cliente: {client?.name ?? "Nao selecionada"}</p>
            <p>Categoria: {form.category || "-"}</p>
            <p>Quantidade: {quantity} imagens</p>
            <p>Creditos necessarios: {creditsNeeded}</p>
          </div>
        </Card>
        <Field label="Quantidade de imagens"><select className={inputClass} value={quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) as GenerationQuantity })}>{options.map((option) => <option key={option} value={option}>Gerar {option} {option === 1 ? "imagem" : "imagens"}</option>)}</select></Field>
        <label className="flex items-start gap-3 rounded-lg border border-line bg-ink p-4 text-sm text-slate-300">
          <input type="checkbox" className="mt-1" checked={Boolean(form.consent_confirmed)} onChange={(e) => setForm({ ...form, consent_confirmed: e.target.checked })} />
          <span>Confirmo que tenho autorizacao da pessoa nas fotos para utilizar sua imagem na criacao deste ensaio com IA.</span>
        </label>
      </div>
      <div className="rounded-lg border border-line bg-ink p-4">
        <h3 className="font-semibold">Checklist de geracao</h3>
        <div className="mt-4 grid gap-2">{checklist.map(([label, ok]) => <div key={label} className="flex items-center justify-between text-sm"><span className="text-slate-300">{label}</span><StatusBadge tone={ok ? "good" : "warn"}>{ok ? "OK" : "Pendente"}</StatusBadge></div>)}</div>
        <p className="mt-4 text-xs text-slate-500">O botao so libera quando tudo estiver correto. Custo: {creditsNeeded} creditos.</p>
        <StatusBadge tone={ready ? "good" : "warn"}>{ready ? "Pronto para gerar" : "Bloqueado"}</StatusBadge>
      </div>
    </div>
  );
}

export function ShootDetailPage({ id }: { id: string }) {
  const { state, reload, supabase, loadError } = useDemoState();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [form, setForm] = useState<Partial<Shoot>>({});
  const [uploadPreviews, setUploadPreviews] = useState<Record<string, string>>({});
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const shoot = state.shoots.find((item) => item.id === id && !item.deleted_at);
  if (!shoot) return <EmptyState title="Ensaio nao encontrado" text="Esse registro nao existe no estado demo." />;
  const currentShoot = shoot;
  const client = state.clients.find((item) => item.id === shoot.client_id)!;
  const refs = state.referencePhotos.filter((photo) => photo.shoot_id === shoot.id);
  const images = state.generatedImages.filter((image) => image.shoot_id === shoot.id && !image.deleted_at);
  const prompt = buildPremiumPrompt(shoot, client, refs);
  const isAdmin = state.profile.role === "admin";
  const detailQuantityOptions = quantitySelectOptions(state);
  const detailQuantity = ((form.quantity as GenerationQuantity) ?? shoot.quantity) as GenerationQuantity;
  const editableDetailQuantity = detailQuantityOptions.includes(detailQuantity) ? detailQuantity : detailQuantityOptions[0];
  const detailCreditsNeeded = creditCostForQuantity(state, editableDetailQuantity);

  async function uploadDetailReferencePhoto(type: string, file: File) {
    setEditError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setEditError("Use apenas imagens JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setEditError("A imagem precisa ter no maximo 10 MB.");
      return;
    }
    const userId = await getCurrentUserId(supabase);
    const imageInspection = await inspectImageFile(file);
    const audit = auditReferencePhoto({
      type,
      fileName: file.name,
      fileSize: file.size,
      ...imageInspection
    });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${userId}/${client.id}/${currentShoot.id}/${type}/${Date.now()}-${safeName}`;
    const upload = await supabase.storage.from("client-reference-photos").upload(storagePath, file, { contentType: file.type, upsert: true });
    if (upload.error) {
      logSupabaseError("Supabase error", upload.error);
      setEditError(process.env.NODE_ENV === "development" ? `Erro no upload: ${upload.error.message}` : "Nao foi possivel enviar a foto agora.");
      return;
    }

    await supabase.from("reference_photos").delete().eq("user_id", userId).eq("shoot_id", currentShoot.id).eq("type", type);
    const referencePayload = {
      user_id: userId,
      client_id: client.id,
      shoot_id: currentShoot.id,
      type,
      storage_path: storagePath,
      file_url: storagePath,
      quality_status: audit.quality_status,
      quality_score: audit.quality_score,
      quality_issues: audit.quality_issues,
      quality_recommendation: audit.quality_recommendation,
      can_be_primary_identity: audit.can_be_primary_identity,
      is_screenshot: audit.is_screenshot,
      has_face: audit.has_face,
      face_clear: audit.face_clear,
      face_visible: audit.has_face,
      body_visible: audit.body_visible,
      resolution_ok: audit.resolution_ok,
      lighting_quality: audit.lighting_quality,
      audited_at: audit.audited_at,
      notes: file.name
    };
    let { error: insertError } = await supabase.from("reference_photos").insert(referencePayload);
    if (insertError?.message?.includes("'body_visible' column") || insertError?.message?.includes("'face_visible' column") || insertError?.message?.includes("'lighting_quality' column") || insertError?.message?.includes("'storage_path' column") || insertError?.message?.includes("'quality_score' column")) {
      const { face_visible, body_visible, lighting_quality, storage_path, quality_score, quality_issues, quality_recommendation, can_be_primary_identity, is_screenshot, has_face, face_clear, resolution_ok, audited_at, ...fallbackPayload } = referencePayload;
      const fallback = await supabase.from("reference_photos").insert(fallbackPayload);
      insertError = fallback.error;
    }
    if (insertError) {
      logSupabaseError("Supabase error", insertError);
      setEditError(process.env.NODE_ENV === "development" ? `Erro do Supabase: ${insertError.message}` : "Nao foi possivel salvar a foto no banco.");
      return;
    }

    setUploadPreviews((current) => {
      if (current[type]) URL.revokeObjectURL(current[type]);
      return { ...current, [type]: URL.createObjectURL(file) };
    });
    await reload();
  }

  async function removeDetailReferencePhoto(type: string) {
    setEditError("");
    const userId = await getCurrentUserId(supabase);
    const current = refs.find((ref) => ref.type === type);
    const pathToRemove = current?.storage_path || current?.file_url;
    if (pathToRemove) await supabase.storage.from("client-reference-photos").remove([pathToRemove]);
    const { error: deleteError } = await supabase.from("reference_photos").delete().eq("user_id", userId).eq("shoot_id", currentShoot.id).eq("type", type);
    if (deleteError) {
      logSupabaseError("Supabase error", deleteError);
      setEditError(process.env.NODE_ENV === "development" ? `Erro do Supabase: ${deleteError.message}` : "Nao foi possivel remover a foto.");
      return;
    }
    setUploadPreviews((current) => {
      if (current[type]) URL.revokeObjectURL(current[type]);
      const next = { ...current };
      delete next[type];
      return next;
    });
    await reload();
  }

  function startEditing() {
    setForm({ ...shoot });
    setEditError("");
    setEditing(true);
  }

  async function saveShoot(event: React.FormEvent) {
    event.preventDefault();
    setEditError("");
    const userId = await getCurrentUserId(supabase);
    const payload = {
      title: form.title || currentShoot.title,
      category: form.category || currentShoot.category,
      sold_price: Number(form.sold_price) || 0,
      outfit: form.outfit || null,
      outfit_color: form.outfit_color || null,
      shoes: form.shoes || null,
      accessories: form.accessories || null,
      hair: form.hair || null,
      makeup: form.makeup || null,
      location: form.location || null,
      mood: form.mood || null,
      pose: form.pose || null,
      expression: form.expression || null,
      lighting: form.lighting || null,
      photo_style: form.photo_style || null,
      free_notes: form.free_notes || null,
      quantity: editableDetailQuantity,
      consent_confirmed: Boolean(form.consent_confirmed),
      consent_confirmed_at: form.consent_confirmed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };
    let { error: saveError } = await supabase.from("shoots").update(payload).eq("id", currentShoot.id).eq("user_id", userId);
    if (saveError?.message?.includes("'quantity' column")) {
      const { quantity, ...fallbackPayload } = payload;
      const fallback = await supabase.from("shoots").update(fallbackPayload).eq("id", currentShoot.id).eq("user_id", userId);
      saveError = fallback.error;
    }
    if (saveError?.message?.includes("'consent_confirmed_at' column")) {
      const { consent_confirmed_at, ...fallbackPayload } = payload;
      const fallback = await supabase.from("shoots").update(fallbackPayload).eq("id", currentShoot.id).eq("user_id", userId);
      saveError = fallback.error;
    }
    if (saveError) {
      logSupabaseError("Supabase error", saveError);
      setEditError(process.env.NODE_ENV === "development" ? `Erro do Supabase: ${saveError.message}` : "Nao foi possivel salvar o ensaio.");
      return;
    }
    setEditing(false);
    await reload();
  }

  async function generate() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shoot: currentShoot, client, referencePhotos: refs }) });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Nao foi possivel gerar as imagens agora.");
      return;
    }
    await reload();
    setTimeout(() => reload(), 700);
  }

  async function deleteShoot() {
    const confirmed = window.confirm("Excluir este ensaio? As imagens vinculadas tambem sairao da galeria e do dashboard.");
    if (!confirmed) return;
    setError("");
    setDeleting(true);
    const userId = await getCurrentUserId(supabase);
    const deletedAt = new Date().toISOString();

    const imagesUpdate = await supabase
      .from("generated_images")
      .update({ deleted_at: deletedAt })
      .eq("shoot_id", currentShoot.id)
      .eq("user_id", userId);

    const shootUpdate = await supabase
      .from("shoots")
      .update({ deleted_at: deletedAt, status: "archived", updated_at: deletedAt })
      .eq("id", currentShoot.id)
      .eq("user_id", userId);

    setDeleting(false);
    const deleteError = imagesUpdate.error || shootUpdate.error;
    if (deleteError) {
      logSupabaseError("Supabase error", deleteError);
      setError(process.env.NODE_ENV === "development" ? `Erro do Supabase: ${deleteError.message}` : "Nao foi possivel excluir o ensaio.");
      return;
    }

    router.push("/app/shoots");
    await reload();
  }
  return (
    <>
      <PageTitle title={shoot.title} text={`${client.name} - ${shoot.category} - ${shoot.quantity} imagens`} action={<div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={shoot.status === "completed"} onClick={startEditing}>Editar</Button><Button variant="danger" disabled={deleting || busy} onClick={deleteShoot}><Trash2 className="h-4 w-4" /> {deleting ? "Excluindo..." : "Excluir"}</Button><Button disabled={busy || deleting || shoot.status === "completed"} onClick={generate}>{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Gerar imagens</Button></div>} />
      {error ? <div className="mb-5 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div> : null}
      {state.generationConfig.realAiEnabledForAdmin ? <div className="mb-5 rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm leading-6 text-gold">Modo teste com IA real ativo. Cada imagem consome 10 créditos e pode gerar custo na API.</div> : null}
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Card>
          <h2 className="text-lg font-semibold">Resumo visivel ao usuario</h2>
          {editing ? (
            <form onSubmit={saveShoot} className="mt-4 grid gap-3">
              {editError ? <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{editError}</div> : null}
              <Field label="Nome do ensaio"><input className={inputClass} value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Categoria"><select className={inputClass} value={form.category ?? shoot.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
              <Field label="Valor vendido"><input className={inputClass} type="number" value={form.sold_price ?? 0} onChange={(e) => setForm({ ...form, sold_price: Number(e.target.value) })} /></Field>
              <Field label="Quantidade"><select className={inputClass} value={editableDetailQuantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) as GenerationQuantity })}>{detailQuantityOptions.map((option) => <option key={option} value={option}>{option} {option === 1 ? "imagem" : "imagens"}</option>)}</select></Field>
              <PersonalizationFields form={form} setForm={setForm} />
              <label className="flex items-start gap-3 rounded-lg border border-line bg-ink p-4 text-sm text-slate-300">
                <input type="checkbox" className="mt-1" checked={Boolean(form.consent_confirmed)} onChange={(e) => setForm({ ...form, consent_confirmed: e.target.checked })} />
                <span>Confirmo que tenho autorizacao da pessoa nas fotos para utilizar sua imagem na criacao deste ensaio com IA.</span>
              </label>
              <div className="flex gap-2"><Button type="submit">Salvar ensaio</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button></div>
            </form>
          ) : (
            <div className="mt-4 grid gap-2 text-sm text-slate-300"><p>Estilo: {shoot.photo_style || "-"}</p><p>Roupa: {shoot.outfit || "-"} {shoot.outfit_color || ""}</p><p>Local: {shoot.location || "-"}</p><p>Quantidade: {shoot.quantity}</p><p>Creditos necessarios: {creditCostForQuantity(state, shoot.quantity)}</p><p>Consentimento: {shoot.consent_confirmed ? "confirmado" : "pendente"}</p></div>
          )}
        </Card>
        {isAdmin ? <PromptPreview prompt={prompt} negative={defaultNegativePrompt} /> : <Card><h2 className="text-lg font-semibold">Checklist do ensaio</h2><div className="mt-4 grid gap-2 text-sm text-slate-300"><p>Fotos obrigatorias aprovadas: {summarizePhotoQuality(refs).ok ? "sim" : "pendentes"}</p><p>Consentimento: {shoot.consent_confirmed ? "confirmado" : "pendente"}</p><p>Creditos necessarios: {detailCreditsNeeded}</p></div><p className="mt-4 text-sm leading-6 text-slate-400">Envie fotos originais, nitidas e sem captura de tela para preservar melhor a identidade antes de gerar.</p></Card>}
      </div>
      {editing ? (
        <Card className="mt-5">
          <h2 className="text-lg font-semibold">Fotos do ensaio</h2>
          <p className="mt-2 text-sm text-slate-400">Complete ou substitua as fotos obrigatorias antes de gerar.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {requiredPhotoTypes.map((photo) => <ReferenceUploadField key={photo.type} photo={photo} refPhoto={refs.find((ref) => ref.type === photo.type)} preview={uploadPreviews[photo.type]} required onUpload={uploadDetailReferencePhoto} onRemove={removeDetailReferencePhoto} />)}
            {optionalPhotoTypes.map((photo) => <ReferenceUploadField key={photo.type} photo={photo} refPhoto={findReferenceByType(refs, photo.type)} preview={uploadPreviews[photo.type]} onUpload={uploadDetailReferencePhoto} onRemove={removeDetailReferencePhoto} />)}
          </div>
        </Card>
      ) : null}
      <GalleryGrid images={images} title="Resultado do ensaio" showProvider={isAdmin} clients={state.clients} shoots={state.shoots} />
    </>
  );
}

function PromptPreview({ prompt, negative }: { prompt: string; negative: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Prompt admin</h2>
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(`${prompt}\n\nNegative prompt: ${negative}`).then(() => setCopied(true))}><Copy className="h-4 w-4" /> {copied ? "Copiado" : "Copiar"}</Button>
      </div>
      <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-ink p-4 text-xs leading-5 text-slate-300">{prompt}</pre>
      <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-ink p-4 text-xs leading-5 text-red-100">{negative}</pre>
    </Card>
  );
}

export function GalleryPage() {
  const { state, reload, supabase, loadError } = useDemoState();
  const [clientFilter, setClientFilter] = useState("");
  const [shootFilter, setShootFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [preview, setPreview] = useState<GeneratedImage | null>(null);
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const isAdmin = state.profile.role === "admin";

  async function updateImage(id: string, values: Partial<GeneratedImage>) {
    const userId = await getCurrentUserId(supabase);
    const { error } = await supabase.from("generated_images").update(values).eq("id", id).eq("user_id", userId);
    if (error) {
      logSupabaseError("Supabase error", error);
      return;
    }
    await reload();
  }

  const images = state.generatedImages
    .filter((img) => !img.deleted_at)
    .filter((img) => !clientFilter || img.client_id === clientFilter)
    .filter((img) => !shootFilter || img.shoot_id === shootFilter)
    .filter((img) => !categoryFilter || state.shoots.find((shoot) => shoot.id === img.shoot_id)?.category === categoryFilter);

  const shootsForFilter = state.shoots.filter((shoot) => !clientFilter || shoot.client_id === clientFilter);

  return (
    <>
      <PageTitle title="Galeria" text="Veja imagens por cliente e ensaio, baixe, favorite ou exclua com soft delete." />
      <Card className="mb-6">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Filtrar por cliente"><select className={inputClass} value={clientFilter} onChange={(event) => { setClientFilter(event.target.value); setShootFilter(""); }}><option value="">Todos os clientes</option>{state.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Field>
          <Field label="Filtrar por categoria"><select className={inputClass} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">Todas as categorias</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></Field>
          <Field label="Filtrar por ensaio"><select className={inputClass} value={shootFilter} onChange={(event) => setShootFilter(event.target.value)}><option value="">Todos os ensaios</option>{shootsForFilter.map((shoot) => <option key={shoot.id} value={shoot.id}>{shoot.title}</option>)}</select></Field>
        </div>
      </Card>
      <GalleryGrid images={images} title="Todas as imagens" showProvider={isAdmin} clients={state.clients} shoots={state.shoots} onPreview={setPreview} onFavorite={(image) => updateImage(image.id, { is_favorite: !image.is_favorite })} onDelete={(image) => updateImage(image.id, { deleted_at: new Date().toISOString() })} />
      {preview ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setPreview(null)}><div className="max-h-[90vh] max-w-4xl overflow-hidden rounded-lg border border-line bg-panel p-3" onClick={(event) => event.stopPropagation()}><img src={preview.file_url} alt="Preview" className="max-h-[78vh] w-full object-contain" onError={(event) => { event.currentTarget.src = `/api/placeholder?seed=preview-${preview.id}`; }} /><div className="mt-3 flex justify-end"><Button variant="secondary" onClick={() => setPreview(null)}>Fechar</Button></div></div></div> : null}
    </>
  );
}

function GalleryGrid({ images, title, showProvider = false, clients = [], shoots = [], onPreview, onFavorite, onDelete }: { images: GeneratedImage[]; title: string; showProvider?: boolean; clients?: Client[]; shoots?: Shoot[]; onPreview?: (image: GeneratedImage) => void; onFavorite?: (image: GeneratedImage) => void; onDelete?: (image: GeneratedImage) => void }) {
  return (
    <section className="mt-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {images.length === 0 ? <EmptyGalleryState /> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{images.map((image, index) => {
        const shoot = shoots.find((item) => item.id === image.shoot_id);
        const client = clients.find((item) => item.id === image.client_id);
        return <Card key={image.id} className="group overflow-hidden p-0 hover:-translate-y-0.5 hover:border-cyan/50"><button type="button" className="block w-full" onClick={() => onPreview?.(image)}><img src={image.file_url} alt="Imagem gerada" className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-[1.02]" onError={(event) => { event.currentTarget.src = `/api/placeholder?seed=fallback-${image.id}-${index}`; }} /></button><div className="p-3"><div className="flex flex-wrap gap-2">{showProvider ? <StatusBadge tone="good">{image.provider}</StatusBadge> : <StatusBadge tone="good">Pronta</StatusBadge>}<StatusBadge tone="default">{client?.name ?? "Cliente"}</StatusBadge>{shoot?.category ? <StatusBadge tone="default">{shoot.category}</StatusBadge> : null}</div><div className="mt-3 flex items-center justify-between"><p className="text-xs text-slate-500">{shoot?.title ?? "Ensaio"}</p><div className="flex gap-2"><Button variant="ghost" title="Favoritar" onClick={() => onFavorite?.(image)}><Heart className={`h-4 w-4 ${image.is_favorite ? "fill-cyan text-cyan" : ""}`} /></Button><Button variant="ghost" title="Baixar" onClick={() => window.open(image.file_url, "_blank")}><Download className="h-4 w-4" /></Button><Button variant="ghost" title="Excluir" onClick={() => onDelete?.(image)}><Trash2 className="h-4 w-4" /></Button></div></div></div></Card>;
      })}</div>}
    </section>
  );
}

export function CreditsPage() {
  const { state, loadError } = useDemoState();
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  return (
    <>
      <PageTitle title="Creditos" text="Seus creditos controlam quantas imagens podem ser geradas. Pagamento real ainda nao esta ativo." />
      <Card className="mb-6 border-cyan/25 bg-cyan/10">
        <p className="text-sm text-slate-300">Saldo atual</p>
        <div className="mt-2 text-5xl font-semibold">{state.credits.balance}</div>
        <p className="mt-2 text-sm text-slate-400">Use com cuidado em cada ensaio e acompanhe o historico abaixo.</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">{[
        ["Publico", 100, "Ideal para testar ensaios avulsos."],
        ["Comunidade", 300, "Creditos com condicoes melhores para alunos."],
        ["Pro", 1000, "Maior volume para uso profissional."]
      ].map(([plan, pack, text]) => <Card key={plan as string} className="hover:border-cyan/40"><StatusBadge tone={plan === "Comunidade" ? "good" : "default"}>{plan as string}</StatusBadge><h2 className="mt-4 text-3xl font-semibold">{pack as number}</h2><p className="mt-1 text-sm text-slate-400">creditos</p><p className="mt-3 min-h-10 text-sm leading-5 text-slate-400">{text as string}</p><Button className="mt-5 w-full" disabled>Solicitar creditos</Button><p className="mt-3 text-xs text-gold">Em breve</p></Card>)}</div>
      <Card className="mt-6"><h2 className="text-lg font-semibold">Historico de transacoes</h2><div className="mt-4 grid gap-2">{state.creditTransactions.length === 0 ? <EmptyState title="Nenhuma transacao ainda." text="Quando creditos forem usados ou adicionados, o historico aparece aqui." /> : state.creditTransactions.map((tx) => <div key={tx.id} className="flex justify-between rounded-lg border border-line bg-ink p-3 text-sm"><span>{tx.description}</span><span className={tx.amount < 0 ? "text-red-200" : "text-cyan"}>{tx.amount}</span></div>)}</div></Card>
    </>
  );
}

export function SettingsPage() {
  const { state, loadError } = useDemoState();
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  return <><PageTitle title="Configuracoes" text="Dados da conta, plano atual e preferencias basicas." /><div className="grid gap-5 lg:grid-cols-[1fr_.8fr]"><Card><h2 className="text-lg font-semibold">Dados da conta</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Nome"><input className={inputClass} defaultValue={state.profile.name} /></Field><Field label="E-mail"><input className={inputClass} defaultValue={state.profile.email} disabled /></Field><Field label="WhatsApp"><input className={inputClass} defaultValue={state.profile.whatsapp ?? ""} /></Field><Field label="Plano atual"><input className={inputClass} defaultValue={planLabel(state.profile.plan_type, state.profile.role)} disabled /></Field></div><p className="mt-4 text-sm text-slate-500">Edicao completa de perfil e avatar ficara disponivel em uma proxima versao.</p></Card><Card><h2 className="text-lg font-semibold">Seguranca</h2><p className="mt-3 text-sm leading-6 text-slate-400">Para sair com seguranca, use o menu do usuario no topo do app. Mantenha seu e-mail atualizado para recuperar acesso quando necessario.</p><Button href="/app/support" className="mt-5" variant="secondary">Falar com suporte</Button></Card></div></>;
}

export function SupportPage() {
  const faqs = [
    ["Creditos", "Confira seu saldo antes de gerar. Se o saldo for insuficiente, solicite novos creditos."],
    ["Upload", "Use JPG, PNG ou WEBP ate 10 MB, com boa luz e sem filtro forte."],
    ["Geracao", "A geracao so libera com cliente, categoria, fotos obrigatorias, consentimento e creditos."],
    ["Conta", "Se nao conseguir entrar, faca logout e login novamente ou revise o e-mail usado."],
    ["Pagamento", "Compra automatica de creditos ainda esta em preparacao."]
  ];
  return <><PageTitle title="Suporte" text="Encontre respostas rapidas para problemas comuns de conta, upload, creditos e geracao." action={<Button href="mailto:suporte@photoforge.ai" variant="secondary"><Mail className="h-4 w-4" /> E-mail</Button>} /><div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><Card><MessageCircle className="h-8 w-8 text-cyan" /><h2 className="mt-4 text-lg font-semibold">Precisa de ajuda?</h2><p className="mt-2 text-sm leading-6 text-slate-400">Use o e-mail de suporte ou fale pelo WhatsApp configurado pela equipe. Descreva o cliente, ensaio e mensagem de erro.</p><Button className="mt-5" disabled>WhatsApp em breve</Button></Card><div className="grid gap-3">{faqs.map(([title, text]) => <Card key={title}><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></Card>)}</div></div></>;
}

export function AdminPage({ section = "overview" }: { section?: string }) {
  const { state, loadError } = useDemoState();
  const [adminOverview, setAdminOverview] = useState<{
    totalUsers: number;
    creditsInCirculation: number;
    generatedImages: number;
    totalShoots: number;
    failedLogs: number;
    blockedUsers: number;
    activeProvider: string;
    logs: { id: string; provider: string; model: string; status: "pending" | "success" | "failed"; error_message?: string; credits_charged: number; cost_estimate: number }[];
    transactions: { id: string; type: string; amount: number; description: string; created_at: string }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setAdminOverview(data))
      .catch((error) => logSupabaseError("Supabase error", error));
  }, []);

  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const logs = adminOverview?.logs ?? state.generationLogs;
  const transactions = adminOverview?.transactions ?? state.creditTransactions;
  return (
    <>
      <PageTitle title={`Admin ${section}`} text="Visao tecnica para acompanhar usuarios, creditos, logs, erros e configuracoes do app." action={<Button href="/admin/users" variant="secondary">Ver usuarios</Button>} />
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Usuarios totais" value={adminOverview?.totalUsers ?? 0} Icon={Users} />
        <MetricCard label="Usuarios ativos" value={Math.max((adminOverview?.totalUsers ?? 0) - (adminOverview?.blockedUsers ?? 0), 0)} Icon={CheckCircle2} tone="lime" />
        <MetricCard label="Creditos em circulacao" value={adminOverview?.creditsInCirculation ?? 0} Icon={WalletCards} tone="violet" />
        <MetricCard label="Imagens geradas" value={adminOverview?.generatedImages ?? 0} Icon={ImageIcon} tone="lime" />
        <MetricCard label="Ensaios totais" value={adminOverview?.totalShoots ?? 0} Icon={Camera} tone="gold" />
        <MetricCard label="Logs com erro" value={adminOverview?.failedLogs ?? 0} Icon={ShieldCheck} tone="violet" />
        <MetricCard label="Usuarios bloqueados" value={adminOverview?.blockedUsers ?? 0} Icon={Users} tone="gold" />
        <MetricCard label="Provider ativo" value={adminOverview?.activeProvider ?? "mock"} Icon={BarChart3} tone="cyan" />
      </div>
      <Card className="mt-6">
        <h2 className="text-lg font-semibold">Acoes rapidas de admin</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Button href="/admin/users" variant="secondary">Ver usuarios</Button>
          <Button href="/admin/credits" variant="secondary">Adicionar creditos</Button>
          <Button href="/admin/logs" variant="secondary">Ver logs</Button>
          <Button href="/admin/settings" variant="secondary">Configuracoes</Button>
        </div>
      </Card>
      <Card className="mt-6 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-slate-400"><tr><th className="p-3">Tipo</th><th className="p-3">Item</th><th className="p-3">Status</th><th className="p-3">Detalhe</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-t border-line"><td className="p-3">Log</td><td className="p-3">{log.provider}/{log.model}</td><td className="p-3"><StatusBadge tone={log.status === "success" ? "good" : log.status === "pending" ? "warn" : "bad"}>{log.status}</StatusBadge></td><td className="p-3 text-slate-400">{log.error_message || `${log.credits_charged} creditos - custo ${money(log.cost_estimate)}`}</td></tr>)}</tbody></table></Card>
      <Card className="mt-6 overflow-x-auto"><h2 className="mb-4 text-lg font-semibold">Transacoes de credito</h2><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-slate-400"><tr><th className="p-3">Tipo</th><th className="p-3">Valor</th><th className="p-3">Descricao</th><th className="p-3">Data</th></tr></thead><tbody>{transactions.map((tx) => <tr key={tx.id} className="border-t border-line"><td className="p-3">{tx.type}</td><td className="p-3">{tx.amount}</td><td className="p-3 text-slate-400">{tx.description}</td><td className="p-3 text-slate-400">{new Date(tx.created_at).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></Card>
      <Card className="mt-6"><h2 className="text-lg font-semibold">Settings</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{["active_provider: mock", "credits_per_image: 1", "max_reference_images: 5", "max_upload_size_mb: 10", "community_discount_percentage: 30", "public_credit_price: configurable"].map((item) => <div key={item} className="rounded-lg border border-line bg-ink p-3 text-sm text-slate-300">{item}</div>)}</div></Card>
    </>
  );
}

export function LoadingState() {
  return <div className="grid gap-4"><div className="h-24 animate-pulse rounded-lg border border-line bg-panel" /><div className="grid gap-4 md:grid-cols-3"><div className="h-32 animate-pulse rounded-lg border border-line bg-panel" /><div className="h-32 animate-pulse rounded-lg border border-line bg-panel" /><div className="h-32 animate-pulse rounded-lg border border-line bg-panel" /></div></div>;
}

function LoadErrorState({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-8 text-sm leading-6 text-red-100">Nao foi possivel carregar os dados do app. Detalhe: {message}</div>;
}
