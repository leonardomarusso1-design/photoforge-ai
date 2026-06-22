"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Camera, CheckCircle2, Copy, Download, Heart, Image as ImageIcon, Mail, MessageCircle, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Users, WalletCards } from "lucide-react";
import { categories, optionalPhotoTypes, requiredPhotoTypes, templates } from "@/lib/demoData";
import type { Client, ClientStatus, DemoState, GeneratedImage, GenerationQuantity, ReferencePhoto, Shoot } from "@/lib/types";
import { buildPremiumPrompt, defaultNegativePrompt } from "@/lib/ai/buildPremiumPrompt";
import { auditReferencePhoto, summarizePhotoQuality } from "@/lib/ai/photoQuality";
import { Button, Card, EmptyState, Field, inputClass, MetricCard, StatusBadge } from "@/components/ui";
import { ClientAvatar, EditorialImagePlaceholder, EmptyGalleryState, MiniGalleryActions, RecentShootPreview, UploadKindForType, UploadVisualCard } from "@/components/visual";
import { demoUserId, isDemoMode, withDemoParam } from "@/lib/demoMode";
import { loadState as loadDemoState, saveState as saveDemoState, uid } from "@/lib/demoStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentAuthUser, getCurrentUserId } from "@/lib/supabase/currentUser";
import { plans } from "@/lib/kiwify/plans";

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
      if (isDemoMode()) {
        setState(loadDemoState());
        return;
      }
      const user = await getCurrentAuthUser(supabase);
      if (!user?.email) return;
      const userId = user.id;

      await fetch("/api/auth/ensure-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email: user.email, name: user.user_metadata?.name })
      });

      const refsRes = await supabase.from("reference_photos").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      console.log("REFS ERROR:", JSON.stringify(refsRes.error));
      console.log("REFS DATA:", refsRes.data?.length);

      const [profileRes, clientsRes, shootsRes, imagesRes, creditsRes, txRes, logsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("clients").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("shoots").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
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
    if (isDemoMode()) saveDemoState(next);
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

function clientStatusTone(status: string): "default" | "good" | "warn" | "bad" {
  if (status === "ready" || status === "delivered") return "good";
  if (status === "cancelled") return "bad";
  if (status === "waiting_photos" || status === "generating" || status === "review") return "warn";
  return "default";
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
    <div className="mb-7 overflow-hidden rounded-lg border border-white/[.09] bg-[linear-gradient(135deg,rgba(244,213,141,.12),rgba(16,19,27,.94)_42%,rgba(45,212,191,.06))] p-5 shadow-soft">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase text-champagne">PhotoForge AI</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-semibold text-white md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-steel">{text}</p>
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

function SectionTitle({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {text ? <p className="mt-1 max-w-2xl text-sm leading-6 text-steel">{text}</p> : null}
      </div>
      {action}
    </div>
  );
}

function InfoTile({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[.08] bg-ink/55 p-3">
      <p className="text-[11px] font-semibold uppercase text-steel">{label}</p>
      <div className={`mt-1 text-sm ${muted ? "text-steel" : "text-white"}`}>{value}</div>
    </div>
  );
}

function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "bad"; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border p-4 text-sm leading-6 ${tone === "info" ? "border-cyan/25 bg-cyan/10 text-slate-200" : tone === "warn" ? "border-champagne/30 bg-champagne/10 text-champagne" : "border-red-400/30 bg-red-400/10 text-red-100"}`}>
      {children}
    </div>
  );
}

function planLabel(plan?: string, role?: string) {
  if (isDemoMode()) return "Demo";
  if (role === "admin") return "Admin";
  if (plan === "community" || plan === "Comunidade") return "Comunidade";
  if (plan === "pro" || plan === "Pro") return "Pro";
  return "Publico";
}

function firstName(name?: string) {
  return (name || "Usuario").split(" ")[0] || "Usuario";
}

function userInitials(name?: string, fallback = "PF") {
  return (name || fallback).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || fallback;
}

function creditCostForQuantity(state: DemoState, quantity: number) {
  return quantity * state.generationConfig.creditsPerImage;
}

function quantitySelectOptions(state: DemoState) {
  return state.generationConfig.quantityOptions.length > 0 ? state.generationConfig.quantityOptions : defaultGenerationConfig.quantityOptions;
}

const optionalReferenceAliases: Record<string, string[]> = {
  outfit_visual: ["outfit_visual", "outfit_reference"],
  outfit_reference: ["outfit_reference", "outfit_visual"],
  pose_scenario: ["pose_scenario", "mood_reference"],
  important_detail: ["important_detail", "tattoo_arm", "tattoo_leg", "back", "hair_detail"],
  tattoo_arm: ["tattoo_arm", "important_detail"],
  tattoo_leg: ["tattoo_leg", "important_detail"],
  back: ["back", "important_detail"],
  hair_detail: ["hair_detail", "important_detail"],
  extra: ["extra"]
};

function findReferenceByType(refs: ReferencePhoto[], type: string) {
  const aliases = optionalReferenceAliases[type] ?? [type];
  return refs.find((ref) => aliases.includes(ref.type));
}

function getShootCoverImage(shoot: Shoot, images: GeneratedImage[], shoots: Shoot[]) {
  const activeImages = images.filter((image) => !image.deleted_at);
  const byDate = [...activeImages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const shootImage = byDate.find((image) => image.shoot_id === shoot.id);
  if (shootImage) return { coverUrl: shootImage.file_url, coverSource: "shoot" as const };
  const clientShootIds = new Set(shoots.filter((item) => item.client_id === shoot.client_id && !item.deleted_at).map((item) => item.id));
  const clientImage = byDate.find((image) => clientShootIds.has(image.shoot_id));
  if (clientImage) return { coverUrl: clientImage.file_url, coverSource: "client" as const };
  return { coverUrl: "", coverSource: "placeholder" as const };
}

const shootStatusLabels: Record<string, string> = {
  draft: "Rascunho",
  waiting_photos: "Aguardando fotos",
  ready: "Pronto para gerar",
  generating: "Gerando",
  completed: "Gerado",
  review: "Em revisao",
  approved: "Aprovado",
  failed: "Erro",
  delivered: "Entregue",
  archived: "Arquivado"
};

const shootStatusFilterOptions = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Rascunhos" },
  { value: "waiting_photos", label: "Aguardando fotos" },
  { value: "ready", label: "Prontos" },
  { value: "completed", label: "Gerados" },
  { value: "review", label: "Em revisao" },
  { value: "delivered", label: "Entregues" },
  { value: "failed", label: "Falharam" },
  { value: "generating", label: "Gerando" }
];

function shootStatusLabel(status: string) {
  return shootStatusLabels[status] ?? "Aberto";
}

function shootStatusTone(status: string): "default" | "good" | "warn" | "bad" {
  if (status === "completed" || status === "approved" || status === "delivered") return "good";
  if (status === "failed") return "bad";
  if (status === "generating" || status === "review" || status === "ready" || status === "waiting_photos") return "warn";
  return "default";
}

function shootActionLabel(status: string) {
  if (status === "draft") return "Continuar";
  if (status === "completed" || status === "review") return "Revisar";
  if (status === "failed") return "Ver erro";
  if (status === "generating") return "Acompanhar";
  return "Abrir";
}

function isCommunityPlan(plan?: string) {
  return plan === "community" || plan === "Comunidade";
}

function calculateResults(state: DemoState) {
  const activeShoots = state.shoots.filter((shoot) => !shoot.deleted_at);
  const generatedShoots = activeShoots.filter((shoot) => ["completed", "review", "approved", "delivered"].includes(shoot.status));
  const revenue = activeShoots.reduce((sum, shoot) => sum + (shoot.sold_price || 0), 0);
  const creditsUsed = state.credits.total_used || activeShoots.reduce((sum, shoot) => sum + (shoot.credits_used || 0), 0);
  const estimatedCost = state.generationLogs.reduce((sum, log) => sum + (Number(log.cost_estimate) || 0), 0);
  const activeClients = state.clients.filter((client) => !client.deleted_at);
  return {
    activeShoots,
    generatedShoots,
    revenue,
    creditsUsed,
    estimatedCost,
    profit: revenue - estimatedCost,
    activeClients,
    averageTicket: activeClients.length ? revenue / activeClients.length : 0
  };
}

function templateCategoryForShoot(category?: string) {
  const normalized = category ?? "";
  if (normalized.includes("Profissional")) return "Profissional";
  if (normalized.includes("Infantil")) return "Infantil";
  return normalized;
}

function formatShootDate(value?: string | null) {
  if (!value) return "Sem atualizacao";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem atualizacao";
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((todayStart - dateStart) / 86400000);
  if (days === 0) return "Atualizado hoje";
  if (days === 1) return "Atualizado ontem";
  return `Atualizado em ${date.toLocaleDateString("pt-BR")}`;
}

function pluralizeImage(count: number) {
  return `${count} ${count === 1 ? "imagem" : "imagens"}`;
}

function categoryPlaceholderTone(category?: string) {
  const normalized = (category || "").toLowerCase();
  if (normalized.includes("anivers")) return "warm" as const;
  if (normalized.includes("profissional")) return "editorial" as const;
  if (normalized.includes("casal")) return "soft" as const;
  if (normalized.includes("infantil")) return "bright" as const;
  if (normalized.includes("fitness")) return "contrast" as const;
  if (normalized.includes("praia")) return "cool" as const;
  if (normalized.includes("gestante")) return "delicate" as const;
  if (normalized.includes("casual")) return "urban" as const;
  return "cyan" as const;
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
  const results = calculateResults(state);
  const revenue = results.revenue;
  const cost = results.estimatedCost;
  const activeClients = state.clients.filter((client) => !client.deleted_at);
  const activeShoots = state.shoots.filter((shoot) => !shoot.deleted_at);
  const recentImages = state.generatedImages.filter((image) => !image.deleted_at).slice(0, 4);
  const lowCredits = state.credits.balance < Math.max(10, state.generationConfig.creditsPerImage * 2);
  const dashboardTemplates = Array.from(new Map(templates.filter((template) => template.popular).concat(templates).map((template) => [template.id, template])).values()).slice(0, 4);
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
      <PageTitle title={`Ola, ${firstName(state.profile.name)}. Seu estudio esta pronto.`} text="Acompanhe clientes, ensaios, creditos e entregas em um painel pensado para operacao diaria." action={<><Button href="/app/shoots/new"><Plus className="h-4 w-4" /> Criar novo ensaio</Button><Button href="/app/credits" variant="secondary"><WalletCards className="h-4 w-4" /> Comprar creditos</Button></>} />
      <div className="mb-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="border-champagne/35 bg-[linear-gradient(135deg,rgba(244,213,141,.16),rgba(16,19,27,.96)_55%,rgba(45,212,191,.08))] shadow-glow">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <StatusBadge tone={lowCredits ? "warn" : "good"}>{lowCredits ? "Saldo baixo" : "Saldo de producao"}</StatusBadge>
              <div className="mt-4 text-6xl font-semibold text-white">{state.credits.balance}</div>
              <p className="mt-2 text-sm leading-6 text-steel">creditos disponiveis para novas geracoes</p>
            </div>
            <div className="grid gap-2 sm:min-w-44">
              <Button href="/app/shoots/new"><Plus className="h-4 w-4" /> Criar ensaio</Button>
              <Button href="/app/credits" variant="secondary">Comprar creditos</Button>
            </div>
          </div>
        </Card>
        <Card className={`${lowCredits ? "border-champagne/35 bg-champagne/10" : "border-cyan/25 bg-cyan/10"}`}>
          <StatusBadge tone={lowCredits ? "warn" : "good"}>{lowCredits ? "Atencao" : "Proximo passo"}</StatusBadge>
          <h2 className="mt-3 text-xl font-semibold">{lowCredits ? "Recarregue antes de prometer novas entregas." : nextStep.title}</h2>
          <p className="mt-2 text-sm leading-6 text-steel">{lowCredits ? "Voce esta perto de ficar sem creditos. Assim a operacao nao trava quando a cliente aprovar." : nextStep.text}</p>
          <div className="mt-5 flex flex-wrap gap-2"><Button href={lowCredits ? "/app/credits" : nextStep.href}>{lowCredits ? "Comprar creditos" : nextStep.label}</Button>{!lowCredits ? <Button href="/app/templates" variant="secondary">Ver modelos</Button> : null}</div>
        </Card>
      </div>
      <Card className="mb-6">
        <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <StatusBadge tone="warn">Comece por aqui</StatusBadge>
            <h2 className="mt-3 text-2xl font-semibold">Uma esteira simples para vender fotos IA</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-steel">O fluxo foi desenhado para uma pessoa comum entender rapido: cliente, modelo, fotos e entrega final.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["1", "Cadastre a cliente", "Guarde WhatsApp, idade e observacoes importantes."],
              ["2", "Escolha o modelo", "Use um template pronto ou recrie uma referencia."],
              ["3", "Gere e entregue", "Revise, use creditos e salve na galeria."]
            ].map(([step, title, text]) => (
              <div key={step} className="rounded-lg border border-white/[.08] bg-ink/55 p-4">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-champagne text-sm font-semibold text-ink">{step}</span>
                <h3 className="mt-4 font-semibold text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-steel">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Creditos restantes" value={state.credits.balance} Icon={WalletCards} tone="gold" featured />
        <MetricCard label="Creditos usados" value={results.creditsUsed} Icon={Sparkles} tone="gold" />
        <MetricCard label="Clientes cadastrados" value={activeClients.length} Icon={Users} tone="violet" />
        <MetricCard label="Ensaios criados" value={activeShoots.length} Icon={Camera} tone="lime" />
        <MetricCard label="Imagens criadas" value={state.generatedImages.filter((img) => !img.deleted_at).length} Icon={ImageIcon} tone="violet" />
        <MetricCard label="Receita estimada" value={money(revenue)} Icon={BarChart3} tone="cyan" />
        <MetricCard label="Lucro estimado" value={money(revenue - cost)} Icon={CheckCircle2} tone="lime" />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card>
          <h2 className="text-lg font-semibold">Ultimos ensaios</h2>
          <div className="mt-4 grid gap-3">
            {activeShoots.length === 0 ? <EmptyState title="Voce ainda nao tem ensaios criados." text="Crie um ensaio para organizar fotos, estilo, consentimento e geracao." action={<Button href="/app/shoots/new">Criar ensaio</Button>} /> : activeShoots.slice(0, 5).map((shoot) => <ShootRow key={shoot.id} shoot={shoot} client={state.clients.find((c) => c.id === shoot.client_id)} images={state.generatedImages} shoots={state.shoots} />)}
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
            <Button href="/app/templates" variant="secondary">Ver templates</Button>
            <Button href="/app/gallery" variant="secondary">Abrir galeria</Button>
            <Button href="/app/credits" variant="secondary">Comprar creditos</Button>
            {state.profile.role === "admin" ? <Button href="/admin/logs" variant="secondary">Ver logs admin</Button> : null}
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Templates mais usados</h2>
            <p className="mt-1 text-sm text-slate-400">Atalhos para ensaios que alunos costumam vender mais rapido.</p>
          </div>
          <Button href="/app/templates" variant="ghost">Ver todos</Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {dashboardTemplates.map((template) => (
            <Link key={template.id} href={withDemoParam(`/app/shoots/new?template=${template.id}`)} className="overflow-hidden rounded-lg border border-line bg-ink/70 transition hover:-translate-y-0.5 hover:border-cyan/50">
              <img src={template.image} alt={template.name} className="aspect-[4/3] w-full object-cover" />
              <div className="p-3"><p className="font-semibold">{template.name}</p><p className="mt-1 text-xs text-slate-400">{template.description}</p></div>
            </Link>
          ))}
        </div>
      </Card>
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

function ShootRow({ shoot, client, images = [], shoots = [] }: { shoot: Shoot; client?: Client; images?: GeneratedImage[]; shoots?: Shoot[] }) {
  const status = shoot.status as string;
  const generatedCount = images.filter((image) => image.shoot_id === shoot.id && !image.deleted_at).length;
  const cover = getShootCoverImage(shoot, images, shoots.length ? shoots : [shoot]);
  return (
    <Link href={withDemoParam(`/app/shoots/${shoot.id}`)} className="group grid gap-4 rounded-lg border border-white/[.09] bg-[linear-gradient(135deg,rgba(23,27,37,.92),rgba(9,11,17,.98))] p-3 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-champagne/45 sm:grid-cols-[112px_1fr_auto] sm:items-center">
      <div className="relative min-h-32 overflow-hidden rounded-lg border border-white/10 bg-ink">
        {cover.coverUrl ? (
          <>
            <img src={cover.coverUrl} alt={`Capa do ensaio ${shoot.title}`} className="h-full min-h-32 w-full object-cover transition duration-300 group-hover:scale-[1.03]" onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
            {cover.coverSource === "client" ? <span className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/45 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">Ultima do cliente</span> : null}
          </>
        ) : (
          <EditorialImagePlaceholder kind="template" tone={categoryPlaceholderTone(shoot.category)} label={shoot.category || "Ensaio"} className="h-full min-h-32 border-0 shadow-none" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-base font-semibold text-white sm:text-lg">{shoot.title}</h2>
          <StatusBadge tone={shootStatusTone(status)}>{shootStatusLabel(status)}</StatusBadge>
        </div>
        <p className="mt-1 text-sm text-steel">{client?.name ?? "Cliente"} <span className="text-slate-600">-</span> {shoot.category || "Categoria"}</p>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {pluralizeImage(generatedCount)} geradas <span className="text-slate-700">-</span> {shoot.credits_used || 0} creditos usados <span className="text-slate-700">-</span> {formatShootDate(shoot.updated_at || shoot.created_at)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {["Revisar", "Gerar", "Refazer", "Baixar", "Entregar"].map((action) => <span key={action} className="rounded-full border border-white/[.08] bg-white/[.03] px-2.5 py-1 text-steel">{action}</span>)}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
        <span className="text-xs text-slate-500 sm:hidden">{shootStatusLabel(status)}</span>
        <span className="inline-flex min-h-9 items-center justify-center rounded-lg border border-champagne/35 bg-champagne/10 px-3 text-sm font-semibold text-champagne transition group-hover:bg-champagne group-hover:text-ink">{shootActionLabel(status)}</span>
      </div>
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
      <PageTitle title="Clientes" text="Sua carteira de clientes com WhatsApp, autorizacao, historico e proximo ensaio." action={<Button href="/app/clients/new"><Plus className="h-4 w-4" /> Novo cliente</Button>} />
      <Card className="mb-6 p-4">
        <div className="flex items-center gap-3 rounded-lg border border-white/[.08] bg-ink/70 px-3">
          <Search className="h-4 w-4 text-slate-500" />
          <input className="min-h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="Buscar por nome, WhatsApp, e-mail ou cidade" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </Card>
      {clients.length === 0 ? <EmptyState title={allClients.length === 0 ? "Voce ainda nao cadastrou nenhuma cliente." : "Nenhuma cliente encontrada."} text={allClients.length === 0 ? "Cadastre a primeira cliente para criar um ensaio com IA." : "Tente buscar por outro nome, WhatsApp, e-mail ou cidade."} action={<Button href="/app/clients/new">Cadastrar cliente</Button>} /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients.map((client) => {
          const clientShoots = state.shoots.filter((shoot) => shoot.client_id === client.id && !shoot.deleted_at);
          const latestClientShoot = clientShoots[0];
          const authorized = clientShoots.some((shoot) => shoot.consent_confirmed);
          return (
          <Link href={withDemoParam(`/app/clients/${client.id}`)} key={client.id} className="group">
            <Card className="h-full overflow-hidden transition hover:-translate-y-0.5 hover:border-champagne/45">
              <div className="flex items-start justify-between gap-3 border-b border-white/[.07] pb-4">
                <div className="flex gap-3">
                  <ClientAvatar name={client.name} />
                  <div>
                  <h2 className="text-lg font-semibold">{client.name}</h2>
                  <p className="mt-1 text-sm text-steel">{client.whatsapp}</p>
                  </div>
                </div>
                <StatusBadge tone={clientStatusTone(client.status)}>{clientStatusLabel(client.status)}</StatusBadge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <InfoTile label="Cidade" value={client.city || "-"} muted={!client.city} />
                <InfoTile label="Idade" value={client.age ? `${client.age} anos` : "-"} muted={!client.age} />
                <InfoTile label="Receita" value={money(client.total_revenue)} />
                <InfoTile label="Ensaios" value={clientShoots.length} />
                <InfoTile label="Autorizacao" value={authorized ? "Registrada" : "Pendente"} muted={!authorized} />
                <InfoTile label="Ultimo ensaio" value={latestClientShoot?.title ?? "-"} muted={!latestClientShoot} />
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-steel">Atualizada em {new Date(client.updated_at || client.created_at).toLocaleDateString("pt-BR")}</span>
                <span className="inline-flex min-h-9 items-center justify-center rounded-lg border border-champagne/35 bg-champagne/10 px-3 text-sm font-semibold text-champagne transition group-hover:bg-champagne group-hover:text-ink">Ver detalhes</span>
              </div>
            </Card>
          </Link>
        );})}
      </div>
    </>
  );
}

export function ClientFormPage() {
  const router = useRouter();
  const { state, commit, supabase, loadError } = useDemoState();
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", city: "", age: "", notes: "", status: "new" as ClientStatus });
  const [errorMessage, setErrorMessage] = useState("");
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage("");
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

    if (isDemoMode()) {
      const client: Client = {
        id: uid("client"),
        user_id: demoUserId,
        name: form.name,
        whatsapp: form.whatsapp,
        email: form.email || undefined,
        city: form.city || undefined,
        age: Number(form.age) || undefined,
        notes: form.notes || undefined,
        status: form.status,
        total_revenue: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      commit({ ...state!, clients: [client, ...state!.clients] });
      router.push(withDemoParam(`/app/clients/${client.id}`));
      return;
    }

    let userId = "";
    try {
      userId = await getCurrentUserId(supabase);
    } catch (error) {
      logSupabaseError("Supabase error", error);
      setErrorMessage("Sessao invalida. Entre novamente para salvar a cliente.");
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

    router.push(withDemoParam(`/app/clients/${client.id}`));
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
  const { state, commit, reload, supabase, loadError } = useDemoState();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    setConfirmDelete(false);
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
    if (isDemoMode()) {
      const updatedAt = new Date().toISOString();
      commit({
        ...state!,
        clients: state!.clients.map((item) => item.id === currentClient.id ? {
          ...item,
          name: form.name,
          whatsapp: form.whatsapp,
          email: form.email,
          city: form.city || undefined,
          age: Number(form.age) || undefined,
          notes: form.notes || undefined,
          status: form.status,
          updated_at: updatedAt
        } : item)
      });
      setSaving(false);
      setEditing(false);
      return;
    }
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
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setEditError("");
    setDeleting(true);
    if (isDemoMode()) {
      const deletedAt = new Date().toISOString();
      commit({
        ...state!,
        clients: state!.clients.map((item) => item.id === currentClient.id ? { ...item, deleted_at: deletedAt, status: "cancelled", updated_at: deletedAt } : item),
        shoots: state!.shoots.map((shoot) => shoot.client_id === currentClient.id ? { ...shoot, deleted_at: deletedAt, status: "archived", updated_at: deletedAt } : shoot),
        generatedImages: state!.generatedImages.map((image) => image.client_id === currentClient.id ? { ...image, deleted_at: deletedAt } : image)
      });
      setDeleting(false);
      router.push(withDemoParam("/app/clients"));
      return;
    }
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
      setConfirmDelete(false);
      return;
    }

    router.push(withDemoParam("/app/clients"));
    await reload();
  }

  return (
    <>
      <PageTitle title={currentClient.name} text={`${currentClient.whatsapp} - ${currentClient.city || "Cidade nao informada"}`} action={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={startEditing}>Editar</Button><Button variant="danger" disabled={deleting} onClick={deleteClient}><Trash2 className="h-4 w-4" /> {deleting ? "Excluindo..." : confirmDelete ? "Confirmar exclusao" : "Excluir"}</Button>{confirmDelete ? <Button variant="ghost" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancelar</Button> : null}<Button href={`/app/shoots/new?client=${currentClient.id}`}>Novo ensaio</Button></div>} />
      {confirmDelete ? <div className="mb-5 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">Confirme para excluir esta cliente. Os ensaios e imagens vinculados sairao do dashboard e das listas.</div> : null}
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
          <div className="mt-4 grid gap-3">{shoots.map((shoot) => <ShootRow key={shoot.id} shoot={shoot} client={client} images={state.generatedImages} shoots={state.shoots} />)}</div>
        </Card>
      </div>
      <GalleryGrid images={images} title="Imagens geradas" clients={state.clients} shoots={state.shoots} />
    </>
  );
}

export function ShootsPage() {
  const { state, loadError } = useDemoState();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const allShoots = state.shoots.filter((shoot) => !shoot.deleted_at);
  const categoryOptions = Array.from(new Set(allShoots.map((shoot) => shoot.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const normalizedSearch = search.trim().toLowerCase();
  const shoots = allShoots.filter((shoot) => {
    const client = state.clients.find((item) => item.id === shoot.client_id);
    const matchesSearch = normalizedSearch.length === 0 || `${shoot.title} ${client?.name ?? ""} ${shoot.category}`.toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === "all" || shoot.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || shoot.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });
  return (
    <>
      <PageTitle title="Ensaios" text="Sua fila de producao: rascunhos, fotos pendentes, geracoes e entregas." action={<Button href="/app/shoots/new"><Plus className="h-4 w-4" /> Novo ensaio</Button>} />
      <Card className="mb-6 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto] lg:items-center">
          <div className="flex items-center gap-3 rounded-lg border border-white/[.08] bg-ink/70 px-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input className="min-h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" placeholder="Buscar por ensaio ou cliente" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {shootStatusFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select className={inputClass} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">Todas categorias</option>
            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <Button href="/app/shoots/new" className="w-full lg:w-auto"><Plus className="h-4 w-4" /> Novo ensaio</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {shootStatusFilterOptions.slice(1, 6).map((option) => {
            const count = allShoots.filter((shoot) => shoot.status === option.value).length;
            return <StatusBadge key={option.value} tone={option.value === "completed" ? "good" : option.value === "failed" ? "bad" : "default"}>{option.label}: {count}</StatusBadge>;
          })}
        </div>
      </Card>
      {allShoots.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
            <EditorialImagePlaceholder kind="gallery" label="Novo fluxo" className="aspect-[4/3] md:aspect-[4/5]" />
            <div>
              <h2 className="text-xl font-semibold text-white">Voce ainda nao criou nenhum ensaio.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Cadastre uma cliente, envie as fotos principais e comece seu primeiro fluxo guiado.</p>
              <Button href="/app/shoots/new" className="mt-5">Criar primeiro ensaio</Button>
            </div>
          </div>
        </Card>
      ) : shoots.length === 0 ? (
        <EmptyState title="Nenhum ensaio encontrado." text="Tente ajustar a busca, status ou categoria para localizar outro ensaio." action={<Button variant="secondary" onClick={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); }}>Limpar filtros</Button>} />
      ) : (
        <div className="grid gap-4">{shoots.map((shoot) => <ShootRow key={shoot.id} shoot={shoot} client={state.clients.find((c) => c.id === shoot.client_id)} images={state.generatedImages} shoots={state.shoots} />)}</div>
      )}
    </>
  );
}

export function ShootCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, commit, supabase, loadError } = useDemoState();
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState("");
  const [clientForm, setClientForm] = useState({ name: "", whatsapp: "", age: "", notes: "", over50: false });
  const [form, setForm] = useState<Partial<Shoot>>({ title: "", category: "Aniversario", sold_price: 0, quantity: 4, consent_confirmed: false, provider: "mock" });
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [draftShoot, setDraftShoot] = useState<Shoot | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<Record<string, ReferencePhoto>>({});
  const [uploadPreviews, setUploadPreviews] = useState<Record<string, string>>({});
  const [resultImages, setResultImages] = useState<GeneratedImage[]>([]);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [flowError, setFlowError] = useState("");
  useEffect(() => {
    const templateId = searchParams.get("template");
    const template = templates.find((item) => item.id === templateId);
    if (template) {
      setSelectedTemplate(template.id);
      setForm((current) => ({
        ...current,
        category: template.category,
        title: current.title || template.name,
        photo_style: current.photo_style || "foto realista com celular moderno, estilo iPhone 15",
        free_notes: current.free_notes || template.description
      }));
    }
  }, [searchParams]);
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

  async function ensureClient() {
    if (client) return client;
    if (!clientForm.name.trim()) {
      setFlowError("Escolha ou cadastre uma cliente antes de continuar.");
      return null;
    }
    if (!isValidWhatsapp(clientForm.whatsapp)) {
      setFlowError("Informe um WhatsApp valido com DDD.");
      return null;
    }
    if (clientForm.age && (Number.isNaN(Number(clientForm.age)) || Number(clientForm.age) < 0 || Number(clientForm.age) > 130)) {
      setFlowError("Informe uma idade valida entre 0 e 130.");
      return null;
    }
    const now = new Date().toISOString();
    const notesWithAgeFlag = [clientForm.notes, clientForm.over50 ? "Cliente 50+: reforcar idade real, nao rejuvenescer e nao afinar corpo." : ""].filter(Boolean).join("\n");
    if (isDemoMode()) {
      const nextClient: Client = {
        id: uid("client"),
        user_id: demoUserId,
        name: clientForm.name.trim(),
        whatsapp: clientForm.whatsapp.trim(),
        age: Number(clientForm.age) || undefined,
        notes: notesWithAgeFlag || undefined,
        status: "new",
        total_revenue: 0,
        created_at: now,
        updated_at: now
      };
      commit({ ...state!, clients: [nextClient, ...state!.clients] });
      setSelectedClient(nextClient.id);
      return nextClient;
    }
    const userId = await getCurrentUserId(supabase);
    const { data, error } = await supabase
      .from("clients")
      .insert({
        user_id: userId,
        name: clientForm.name.trim(),
        whatsapp: clientForm.whatsapp.trim(),
        age: Number(clientForm.age) || null,
        notes: notesWithAgeFlag || null,
        status: "new",
        total_revenue: 0
      })
      .select("*")
      .single();
    if (error || !data) {
      logSupabaseError("Supabase error", error);
      setFlowError(process.env.NODE_ENV === "development" && error?.message ? `Erro do Supabase: ${error.message}` : "Nao foi possivel criar a cliente.");
      return null;
    }
    setSelectedClient(data.id);
    return data as Client;
  }

  async function ensureDraftShoot() {
    const activeClient = await ensureClient();
    if (!activeClient) return null;
    if (!form.title) {
      setFlowError("Informe o nome do ensaio antes de continuar.");
      return null;
    }
    setFlowError("");
    if (isDemoMode()) {
      const now = new Date().toISOString();
      const shoot: Shoot = {
        ...(draftShoot ?? {}),
        id: draftShoot?.id ?? uid("shoot"),
        user_id: demoUserId,
        client_id: activeClient.id,
        title: form.title || "Novo ensaio",
        category: form.category || "Personalizado",
        status: "draft",
        sold_price: Number(form.sold_price) || 0,
        outfit: form.outfit || undefined,
        outfit_color: form.outfit_color || undefined,
        shoes: form.shoes || undefined,
        accessories: form.accessories || undefined,
        hair: form.hair || undefined,
        makeup: form.makeup || undefined,
        location: form.location || undefined,
        mood: form.mood || undefined,
        pose: form.pose || undefined,
        expression: form.expression || undefined,
        lighting: form.lighting || undefined,
        photo_style: form.photo_style || undefined,
        free_notes: form.free_notes || undefined,
        credits_used: 0,
        provider: state!.generationConfig.effectiveProvider,
        quantity: selectedQuantity,
        consent_confirmed: Boolean(form.consent_confirmed),
        consent_internal_use: Boolean(form.consent_internal_use),
        consent_whatsapp_example: Boolean(form.consent_whatsapp_example),
        consent_portfolio: Boolean(form.consent_portfolio),
        consent_ads: Boolean(form.consent_ads),
        consent_no_public_use: Boolean(form.consent_no_public_use),
        recreate_reference_mode: Boolean(form.recreate_reference_mode),
        recreate_options: form.recreate_options ?? null,
        created_at: draftShoot?.created_at ?? now,
        updated_at: now
      } as Shoot;
      setDraftShoot(shoot);
      commit({ ...state!, shoots: draftShoot ? state!.shoots.map((item) => item.id === shoot.id ? shoot : item) : [shoot, ...state!.shoots] });
      return shoot;
    }
    const userId = await getCurrentUserId(supabase);
    const payload = {
      user_id: userId,
      client_id: activeClient.id,
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
      provider: state!.generationConfig.effectiveProvider,
      quantity: selectedQuantity,
      consent_confirmed: Boolean(form.consent_confirmed),
      consent_internal_use: Boolean(form.consent_internal_use),
      consent_whatsapp_example: Boolean(form.consent_whatsapp_example),
      consent_portfolio: Boolean(form.consent_portfolio),
      consent_ads: Boolean(form.consent_ads),
      consent_no_public_use: Boolean(form.consent_no_public_use),
      recreate_reference_mode: Boolean(form.recreate_reference_mode),
      recreate_options: form.recreate_options ?? null
    };

    let query = draftShoot
      ? supabase.from("shoots").update(payload).eq("id", draftShoot.id).eq("user_id", userId)
      : supabase.from("shoots").insert(payload);

    let { data: shoot, error } = await query.select("*").single();

    if (error?.message?.includes("consent_internal_use") || error?.message?.includes("recreate_reference_mode") || error?.message?.includes("recreate_options")) {
      const { consent_internal_use, consent_whatsapp_example, consent_portfolio, consent_ads, consent_no_public_use, recreate_reference_mode, recreate_options, ...fallbackPayload } = payload;
      query = draftShoot
        ? supabase.from("shoots").update(fallbackPayload).eq("id", draftShoot.id).eq("user_id", userId)
        : supabase.from("shoots").insert(fallbackPayload);
      const fallback = await query.select("*").single();
      shoot = fallback.data;
      error = fallback.error;
    }

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
    if (isDemoMode()) {
      const referencePhoto: ReferencePhoto = {
        id: uid("ref"),
        user_id: demoUserId,
        client_id: client.id,
        shoot_id: shoot.id,
        type,
        storage_path: "",
        file_url: URL.createObjectURL(file),
        quality_status: "approved",
        quality_score: 92,
        quality_issues: [],
        quality_recommendation: "Foto aceita para demonstracao visual.",
        can_be_primary_identity: ["face_neutral", "face_smiling", "full_body_front", "full_body_side"].includes(type),
        has_face: type.includes("face"),
        face_clear: type.includes("face"),
        face_visible: type.includes("face"),
        body_visible: type.includes("body"),
        resolution_ok: true,
        lighting_quality: "good",
        notes: file.name,
        created_at: new Date().toISOString()
      };
      setUploadedPhotos((current) => ({ ...current, [type]: referencePhoto }));
      setUploadPreviews((current) => {
        if (current[type]) URL.revokeObjectURL(current[type]);
        return { ...current, [type]: referencePhoto.file_url };
      });
      commit({
        ...state!,
        referencePhotos: [referencePhoto, ...state!.referencePhotos.filter((photo) => !(photo.shoot_id === shoot.id && photo.type === type))]
      });
      setFlowError("");
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
    if (isDemoMode()) {
      commit({ ...state!, referencePhotos: state!.referencePhotos.filter((photo) => !(photo.shoot_id === shoot.id && photo.type === type)) });
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
      return;
    }
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
    const activeClient = await ensureClient();
    if (!activeClient) return;
    const shoot = await ensureDraftShoot();
    if (!shoot) return;
    if (isDemoMode()) {
      const updatedAt = new Date().toISOString();
      const updatedShoot = { ...shoot, status: target === "generate" ? "ready" : "draft", consent_confirmed: Boolean(form.consent_confirmed), updated_at: updatedAt } as Shoot;
      commit({
        ...state!,
        shoots: state!.shoots.map((item) => item.id === updatedShoot.id ? updatedShoot : item),
        clients: state!.clients.map((item) => item.id === activeClient.id ? { ...item, total_revenue: Math.max(item.total_revenue, Number(form.sold_price) || item.total_revenue), status: "ready", updated_at: updatedAt } : item)
      });
      router.push(withDemoParam(`/app/shoots/${shoot.id}`));
      return;
    }
    const userId = await getCurrentUserId(supabase);
    const { error } = await supabase
      .from("shoots")
      .update({
        status: target === "generate" ? "ready" : "draft",
        consent_confirmed: Boolean(form.consent_confirmed),
        consent_confirmed_at: form.consent_confirmed ? new Date().toISOString() : null,
        consent_internal_use: Boolean(form.consent_internal_use),
        consent_whatsapp_example: Boolean(form.consent_whatsapp_example),
        consent_portfolio: Boolean(form.consent_portfolio),
        consent_ads: Boolean(form.consent_ads),
        consent_no_public_use: Boolean(form.consent_no_public_use),
        recreate_reference_mode: Boolean(form.recreate_reference_mode),
        recreate_options: form.recreate_options ?? null,
        updated_at: new Date().toISOString()
      })
      .eq("id", shoot.id)
      .eq("user_id", userId);

    if (error?.message?.includes("'consent_confirmed_at' column") || error?.message?.includes("consent_internal_use") || error?.message?.includes("recreate_reference_mode") || error?.message?.includes("recreate_options")) {
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
      .update({ total_revenue: activeClient.total_revenue + (Number(form.sold_price) || 0), status: "ready" })
      .eq("id", activeClient.id)
      .eq("user_id", userId);

    router.push(withDemoParam(`/app/shoots/${shoot.id}`));
  }

  async function generateDemoResult() {
    const currentState = state;
    if (!currentState) return;
    if (!isDemoMode()) {
      await saveDraft("generate");
      return;
    }
    if (!ready) {
      setFlowError(currentState.credits.balance < selectedCreditCost ? "Voce precisa de creditos para gerar. Compre creditos ou volte depois." : !readyPhotos ? "Envie as fotos obrigatorias para melhorar a preservacao da identidade." : "Complete cliente, template e consentimento antes de gerar.");
      return;
    }
    setGeneratingDemo(true);
    setFlowError("");
    const shoot = await ensureDraftShoot();
    if (!shoot || !client) {
      setGeneratingDemo(false);
      return;
    }
    window.setTimeout(() => {
      const now = new Date().toISOString();
      const prompt = buildPremiumPrompt({ ...shoot, status: "completed", generated_prompt: "" }, client, currentRefs);
      const images = Array.from({ length: selectedQuantity }, (_, index) => ({
        id: uid("image"),
        user_id: demoUserId,
        client_id: client.id,
        shoot_id: shoot.id,
        file_url: `/api/placeholder?seed=${shoot.id}-${index}`,
        prompt_used: prompt,
        provider: currentState.generationConfig.effectiveProvider,
        model: "demo-placeholder",
        status: "completed" as const,
        width: 1024,
        height: 1365,
        seed: Date.now() + index,
        cost_estimate: 1,
        is_favorite: index === 0,
        portfolio_authorized: Boolean(form.consent_portfolio),
        created_at: now
      }));
      const completedShoot = {
        ...shoot,
        status: "completed" as const,
        credits_used: selectedCreditCost,
        generated_prompt: prompt,
        negative_prompt: defaultNegativePrompt,
        updated_at: now
      };
      const nextState = {
        ...currentState,
        shoots: currentState.shoots.map((item) => item.id === shoot.id ? completedShoot : item),
        generatedImages: [...images, ...currentState.generatedImages],
        credits: { ...currentState.credits, balance: currentState.credits.balance - selectedCreditCost, total_used: currentState.credits.total_used + selectedCreditCost, updated_at: now },
        creditTransactions: [{
          id: uid("tx"),
          user_id: demoUserId,
          type: "usage" as const,
          amount: -selectedCreditCost,
          description: `Geracao demo do ensaio ${shoot.title}`,
          related_shoot_id: shoot.id,
          created_at: now
        }, ...currentState.creditTransactions],
        generationLogs: [{
          id: uid("log"),
          user_id: demoUserId,
          shoot_id: shoot.id,
          provider: currentState.generationConfig.effectiveProvider,
          model: "demo-placeholder",
          request_payload: { quantity: selectedQuantity, demo: true },
          response_payload: { images: selectedQuantity },
          status: "success" as const,
          credits_charged: selectedCreditCost,
          cost_estimate: selectedCreditCost,
          created_at: now
        }, ...currentState.generationLogs]
      };
      commit(nextState);
      setResultImages(images);
      setGeneratingDemo(false);
    }, 900);
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
      <PageTitle title="Criar ensaio" text="Uma esteira guiada para cliente, fotos de identidade, modelo, ajustes, consentimento, revisao e resultado." />
      <div className="premium-scrollbar mb-5 grid gap-2 overflow-x-auto md:grid-cols-7">{["Cliente", "Fotos", "Template", "Ajustes", "Consentimento", "Revisao", "Resultado"].map((label, index) => {
        const current = step === index + 1;
        const done = step > index + 1;
        return <button key={label} onClick={() => setStep(index + 1)} className={`min-w-36 rounded-lg border px-3 py-3 text-left text-sm transition ${current ? "border-champagne/55 bg-champagne/10 text-white shadow-glow" : done ? "border-cyan/30 bg-cyan/10 text-white" : "border-white/[.08] bg-panel text-steel hover:border-white/20"}`}><span className={`mr-2 inline-grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${current ? "bg-champagne text-ink" : done ? "bg-cyan text-ink" : "bg-white/10 text-steel"}`}>{done ? "OK" : index + 1}</span>{label}</button>;
      })}</div>
      <Card className="border-white/[.1]">
        {flowError ? <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{flowError}</div> : null}
        {step === 1 && <div className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-2">
            <button type="button" onClick={() => setForm({ ...form, recreate_reference_mode: false })} className={`rounded-lg border p-4 text-left transition ${!form.recreate_reference_mode ? "border-cyan bg-cyan/10" : "border-line bg-ink/60 hover:border-cyan/40"}`}>
              <StatusBadge tone={!form.recreate_reference_mode ? "good" : "default"}>Criar com template</StatusBadge>
              <h2 className="mt-3 font-semibold">Escolher um modelo pronto</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Ideal para primeira venda, aniversario, praia, profissional, casual e outros estilos prontos.</p>
            </button>
            <button type="button" onClick={() => setForm({ ...form, recreate_reference_mode: true, category: "Personalizado", title: form.title || "Recriar Referencia", recreate_options: { same_pose: true, similar_outfit: true, same_scene: true, same_lighting: true, keep_real_client: true, keep_real_body: true, keep_real_hair: true, keep_real_age: true, iphone_photo: true } })} className={`rounded-lg border p-4 text-left transition ${form.recreate_reference_mode ? "border-gold bg-gold/10" : "border-line bg-ink/60 hover:border-gold/40"}`}>
              <StatusBadge tone="warn">Mais usado por clientes</StatusBadge>
              <h2 className="mt-3 font-semibold">Recriar uma referencia</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Use quando a cliente mandar uma inspiracao e pedir algo igual. A IA usa a referencia apenas para pose, roupa, ambiente, luz e composicao, preservando rosto, corpo, cabelo e idade da cliente.</p>
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Cliente existente"><select className={inputClass} value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}><option value="">Cadastrar rapidamente abaixo</option>{state.clients.filter((item) => !item.deleted_at).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Nome do ensaio"><input className={inputClass} placeholder="Ex.: Aniversario Luxo da Marina" value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          </div>
          {!selectedClient ? <div className="rounded-lg border border-line bg-ink/60 p-4">
            <h2 className="text-lg font-semibold">Dados da cliente</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Nome da cliente"><input className={inputClass} value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} /></Field>
              <Field label="WhatsApp"><input className={inputClass} type="tel" inputMode="tel" placeholder="+55 11 90000-0000" value={clientForm.whatsapp} onChange={(e) => setClientForm({ ...clientForm, whatsapp: e.target.value })} /></Field>
              <Field label="Idade"><input className={inputClass} type="number" min={0} max={130} inputMode="numeric" value={clientForm.age} onChange={(e) => setClientForm({ ...clientForm, age: e.target.value.replace(/\D/g, "") })} /></Field>
              <Field label="Observacoes"><textarea className={inputClass} rows={3} value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} /></Field>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-lg border border-line bg-panel/70 p-3 text-sm text-slate-300">
              <input type="checkbox" className="mt-1" checked={clientForm.over50 || Number(clientForm.age) >= 50} onChange={(event) => setClientForm({ ...clientForm, over50: event.target.checked })} />
              <span><span className="block font-semibold">Cliente tem 50 anos ou mais</span><span className="mt-1 block text-slate-400">O prompt sera reforcado para nao rejuvenescer, nao afinar o corpo e manter pele, bracos, pernas e proporcoes compativeis com a idade real.</span></span>
            </label>
          </div> : null}
          {(client?.age && client.age >= 50) || clientForm.over50 || Number(clientForm.age) >= 50 ? <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm leading-6 text-gold">O prompt sera reforcado para nao rejuvenescer, nao afinar o corpo e manter pele, bracos, pernas e proporcoes compativeis com a idade real.</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Categoria"><select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
            <Field label="Valor vendido"><input className={inputClass} type="number" value={form.sold_price ?? 0} onChange={(e) => setForm({ ...form, sold_price: Number(e.target.value) })} /></Field>
          </div>
        </div>}
        {step === 2 && <PhotoStep refs={currentRefs} previews={uploadPreviews} onUpload={uploadReferencePhoto} onRemove={removeReferencePhoto} />}
        {step === 3 && <TemplatePickStep selectedTemplate={selectedTemplate} onSelect={(templateId) => {
          const template = templates.find((item) => item.id === templateId);
          if (!template) return;
          setSelectedTemplate(template.id);
          setForm({
            ...form,
            category: template.category,
            title: form.title || template.name,
            photo_style: "foto realista com celular moderno, estilo iPhone 15",
            free_notes: [form.free_notes, template.description].filter(Boolean).join(" "),
            recreate_reference_mode: template.name === "Recriar Referencia" ? true : form.recreate_reference_mode,
            recreate_options: template.name === "Recriar Referencia" ? { same_pose: true, similar_outfit: true, same_scene: true, same_lighting: true, keep_real_client: true, keep_real_body: true, keep_real_hair: true, keep_real_age: true, iphone_photo: true } : form.recreate_options
          });
        }} />}
        {step === 4 && <div className="grid gap-5"><PersonalizationFields form={form} setForm={setForm} /><div className="rounded-lg border border-line bg-ink/60 p-4"><h2 className="text-lg font-semibold">Imagem de referencia opcional</h2><p className="mt-2 text-sm leading-6 text-slate-400">As fotos da cliente definem a identidade. A referencia serve apenas para pose, roupa, cenario e composicao.</p><RecreateReferenceMode form={form} setForm={setForm} /><div className="mt-4 grid gap-3 md:grid-cols-2">{optionalPhotoTypes.map((photo) => <ReferenceUploadField key={photo.type} photo={photo} refPhoto={findReferenceByType(currentRefs, photo.type)} preview={uploadPreviews[photo.type]} onUpload={uploadReferencePhoto} onRemove={removeReferencePhoto} />)}</div></div></div>}
        {step === 5 && <ConsentStep form={form} setForm={setForm} />}
        {step === 6 && <ReviewStep form={form} client={client} refs={currentRefs} />}
        {step === 7 && <GenerationStep state={state} form={form} setForm={setForm} client={client} readyPhotos={readyPhotos} ready={ready} resultImages={resultImages} generating={generatingDemo} onGenerate={generateDemoResult} />}
        <div className="mt-6 flex flex-wrap gap-3">
          {step > 1 ? <Button variant="secondary" onClick={() => setStep(step - 1)}>Voltar</Button> : null}
          {step < 7 ? <Button onClick={nextStep}>Proximo</Button> : <Button disabled={!ready || generatingDemo} onClick={generateDemoResult}>{generatingDemo ? "Gerando..." : isDemoMode() ? "Gerar foto demo" : "Salvar e preparar geracao"}</Button>}
          <Button variant="ghost" onClick={() => saveDraft("draft")} disabled={(!client && !clientForm.name) || !form.title}>Salvar rascunho</Button>
          <Button href="/app/shoots" variant="ghost">Cancelar</Button>
        </div>
      </Card>
    </>
  );
}

function TemplatePickStep({ selectedTemplate, onSelect }: { selectedTemplate: string; onSelect: (templateId: string) => void }) {
  const grouped = ["Aniversario", "Casual", "Profissional/empresa", "Casal", "Praia", "Gestante", "Infantil/bebe", "Fitness", "Personalizado"];
  return (
    <div className="grid gap-5">
      <SectionTitle title="Escolha o template do ensaio" text="O template complementa o prompt base de identidade. Ele nao substitui as fotos reais da cliente." />
      <div className="grid gap-5">
        {grouped.map((category) => {
          const categoryTemplates = templates.filter((template) => template.category === category);
          if (categoryTemplates.length === 0) return null;
          return (
            <div key={category}>
              <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">{templateCategoryForShoot(category)}</h3><StatusBadge>{categoryTemplates.length} opcoes</StatusBadge></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {categoryTemplates.map((template) => {
                  const selected = selectedTemplate === template.id;
                  return (
                    <button key={template.id} type="button" onClick={() => onSelect(template.id)} className={`overflow-hidden rounded-lg border bg-ink/70 text-left transition hover:-translate-y-0.5 ${selected ? "border-champagne shadow-glow" : "border-white/[.08] hover:border-cyan/50"}`}>
                      {templateVisual(template)}
                      <div className="p-3">
                        <div className="flex flex-wrap gap-2"><StatusBadge tone={template.popular ? "good" : "default"}>{template.subtype}</StatusBadge>{template.badge ? <StatusBadge tone={template.name === "Recriar Referencia" ? "warn" : "good"}>{template.badge}</StatusBadge> : null}<StatusBadge tone="warn">{template.credits} creditos</StatusBadge></div>
                        <h4 className="mt-3 font-semibold">{template.name}</h4>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{template.description}</p>
                        <span className="mt-3 inline-flex text-sm font-semibold text-champagne">{selected ? "Selecionado" : "Usar modelo"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecreateReferenceMode({ form, setForm }: { form: Partial<Shoot>; setForm: (next: Partial<Shoot>) => void }) {
  const options = [
    ["same_pose", "Usar mesma pose"],
    ["similar_outfit", "Usar roupa parecida"],
    ["same_scene", "Usar mesmo ambiente"],
    ["same_lighting", "Usar mesma iluminacao"],
    ["change_age_number", "Alterar idade/numero de aniversario"],
    ["keep_real_client", "Manter cliente real"],
    ["keep_real_body", "Manter corpo real"],
    ["keep_real_hair", "Manter cabelo real"],
    ["keep_real_age", "Manter idade real"],
    ["iphone_photo", "Aparencia de foto iPhone 15"]
  ] as const;
  const selected = form.recreate_options ?? {};
  return (
    <div className="mt-4 rounded-lg border border-cyan/25 bg-cyan/10 p-4">
      <label className="flex items-start gap-3 text-sm text-slate-200">
        <input type="checkbox" className="mt-1" checked={Boolean(form.recreate_reference_mode)} onChange={(event) => setForm({ ...form, recreate_reference_mode: event.target.checked })} />
        <span><span className="block font-semibold">Modo recriar referencia</span><span className="mt-1 block text-slate-400">Use quando a cliente disser "quero igual essa", preservando a cliente real e usando a referencia apenas como direcao visual.</span></span>
      </label>
      {form.recreate_reference_mode ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {options.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border border-line bg-ink/70 p-3 text-sm text-slate-300">
              <input type="checkbox" checked={Boolean(selected[key])} onChange={(event) => setForm({ ...form, recreate_options: { ...selected, [key]: event.target.checked } })} />
              {label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ReviewStep({ form, client, refs }: { form: Partial<Shoot>; client?: Client; refs: ReferencePhoto[] }) {
  const previewShoot = {
    id: "preview",
    user_id: "",
    client_id: client?.id ?? "",
    title: form.title || "Novo ensaio",
    category: form.category || "Personalizado",
    status: "draft",
    sold_price: Number(form.sold_price) || 0,
    credits_used: 0,
    provider: "preview",
    quantity: (form.quantity as GenerationQuantity) || 4,
    consent_confirmed: Boolean(form.consent_confirmed),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...form
  } as Shoot;
  const prompt = client ? buildPremiumPrompt(previewShoot, client, refs) : "Selecione a cliente para visualizar o prompt.";
  const requiredCount = refs.filter((ref) => ["face_neutral", "face_smiling", "full_body_front"].includes(ref.type)).length;
  const optionalCount = refs.length - requiredCount;
  const credits = Number(form.quantity || 4);
  return (
    <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <Card className="bg-ink/60">
        <SectionTitle title="Revisao antes de gerar" text="Confira identidade, modelo, creditos e consentimento antes de consumir saldo." />
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTile label="Cliente" value={client?.name ?? "Pendente"} muted={!client} />
          <InfoTile label="Template" value={form.title || form.category || "Pendente"} muted={!form.title && !form.category} />
          <InfoTile label="Fotos de identidade" value={`${requiredCount}/3 enviadas`} />
          <InfoTile label="Creditos previstos" value={credits} />
          <InfoTile label="Roupa" value={form.outfit || "A definir"} muted={!form.outfit} />
          <InfoTile label="Cenario" value={form.location || "A definir"} muted={!form.location} />
          <InfoTile label="Pose" value={form.pose || "A definir"} muted={!form.pose} />
          <InfoTile label="Referencias opcionais" value={optionalCount} muted={optionalCount === 0} />
        </div>
        <Notice tone={form.recreate_reference_mode ? "warn" : "info"}>
          {form.recreate_reference_mode ? "Modo recriar referencia ativo: a referencia orienta pose, roupa, cenario, luz e composicao." : "As fotos enviadas serao usadas como identidade, nao como referencia visual opcional."}
        </Notice>
      </Card>
      <Card className="bg-ink/60">
        <h2 className="text-lg font-semibold">Prompt montado</h2>
        <Button variant="secondary" className="mt-3" onClick={() => navigator.clipboard?.writeText(prompt)}><Copy className="h-4 w-4" /> Copiar prompt</Button>
        <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-ink p-4 text-xs leading-5 text-slate-300">{prompt}</pre>
      </Card>
    </div>
  );
}

function ConsentStep({ form, setForm }: { form: Partial<Shoot>; setForm: (next: Partial<Shoot>) => void }) {
  const consentFields = [
    ["consent_confirmed", "Cliente autorizou gerar imagens"],
    ["consent_internal_use", "Cliente autorizou uso interno"],
    ["consent_whatsapp_example", "Cliente autorizou usar como exemplo no WhatsApp"],
    ["consent_portfolio", "Cliente autorizou usar no portfolio"],
    ["consent_ads", "Cliente autorizou usar em anuncio"],
    ["consent_no_public_use", "Cliente nao autorizou divulgacao"]
  ] as const;
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-lg font-semibold">Consentimento da cliente</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Registre o que a cliente autorizou antes de gerar ou divulgar qualquer imagem.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {consentFields.map(([key, label]) => (
          <label key={key} className="flex items-start gap-3 rounded-lg border border-line bg-ink/70 p-4 text-sm text-slate-300">
            <input type="checkbox" className="mt-1" checked={Boolean(form[key])} onChange={(event) => {
              const next = { ...form, [key]: event.target.checked };
              if (key === "consent_no_public_use" && event.target.checked) {
                next.consent_whatsapp_example = false;
                next.consent_portfolio = false;
                next.consent_ads = false;
              }
              setForm(next);
            }} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm leading-6 text-gold">A primeira autorizacao e obrigatoria para liberar a geracao. As demais controlam uso interno, portfolio e anuncios.</div>
    </div>
  );
}

function PhotoStep({ refs, previews, onUpload, onRemove }: { refs: ReferencePhoto[]; previews: Record<string, string>; onUpload: (type: string, file: File) => void; onRemove: (type: string) => void }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-2">
        <Notice>As fotos da cliente definem a identidade. A referencia serve apenas para pose, roupa, ambiente, luz e composicao.</Notice>
        <Notice tone="warn">Use boa luz, rosto nitido, sem filtro forte e corpo visivel. Placeholder visual nao libera geracao.</Notice>
      </div>
      <div>
        <SectionTitle title="Fotos de identidade obrigatorias" text="Essas fotos preservam rosto, sorriso e proporcoes reais da cliente." />
        <div className="mt-4 grid gap-3 md:grid-cols-2">{requiredPhotoTypes.map((photo) => <ReferenceUploadField key={photo.type} photo={photo} refPhoto={refs.find((ref) => ref.type === photo.type)} preview={previews[photo.type]} required onUpload={onUpload} onRemove={onRemove} />)}</div>
      </div>
      <div>
        <SectionTitle title="Referencias opcionais" text="Use para roupa, pose, cabelo, tatuagens, costas ou uma inspiracao extra." />
        <div className="mt-4 grid gap-3 md:grid-cols-2">{optionalPhotoTypes.map((photo) => <ReferenceUploadField key={photo.type} photo={photo} refPhoto={findReferenceByType(refs, photo.type)} preview={previews[photo.type]} onUpload={onUpload} onRemove={onRemove} />)}</div>
      </div>
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

function GenerationStep({ state, form, setForm, client, readyPhotos, ready, resultImages = [], generating = false, onGenerate }: { state: DemoState; form: Partial<Shoot>; setForm: (next: Partial<Shoot>) => void; client?: Client; readyPhotos: boolean; ready: boolean; resultImages?: GeneratedImage[]; generating?: boolean; onGenerate?: () => void }) {
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
  const consentFields = [
    ["consent_confirmed", "Cliente autorizou gerar imagens"],
    ["consent_internal_use", "Cliente autorizou uso interno"],
    ["consent_whatsapp_example", "Cliente autorizou usar como exemplo no WhatsApp"],
    ["consent_portfolio", "Cliente autorizou usar no portfolio"],
    ["consent_ads", "Cliente autorizou usar em anuncios"],
    ["consent_no_public_use", "Cliente nao autorizou divulgacao"]
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
        <Card className="bg-ink/60">
          <h3 className="font-semibold">Resultado</h3>
          {generating ? <div className="mt-4 rounded-lg border border-cyan/30 bg-cyan/10 p-5 text-sm text-cyan">Gerando preview demo...</div> : null}
          {resultImages.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{resultImages.slice(0, 4).map((image) => <div key={image.id} className="overflow-hidden rounded-lg border border-line bg-panel"><img src={image.file_url} alt="Resultado demo" className="aspect-[3/4] w-full object-cover" /><div className="flex flex-wrap gap-2 p-3"><Button variant="ghost" onClick={() => window.open(image.file_url, "_blank")}><Download className="h-4 w-4" /> Baixar</Button><Button variant="ghost" href="/app/gallery">Salvar na galeria</Button></div></div>)}</div> : <div className="mt-4"><EditorialImagePlaceholder kind="portrait" label="Preview" className="aspect-[16/10]" /><p className="mt-3 text-sm text-slate-400">No modo demo, a geracao usa uma imagem placeholder se Gemini real nao estiver disponivel.</p></div>}
          {resultImages.length > 0 ? <div className="mt-4 flex flex-wrap gap-2"><Button href="/app/gallery" variant="secondary">Abrir galeria</Button><Button variant="secondary" onClick={onGenerate}>Refazer</Button></div> : null}
        </Card>
      </div>
      <div className="rounded-lg border border-line bg-ink p-4">
        <h3 className="font-semibold">Checklist de geracao</h3>
        <div className="mt-4 grid gap-2">{checklist.map(([label, ok]) => <div key={label} className="flex items-center justify-between text-sm"><span className="text-slate-300">{label}</span><StatusBadge tone={ok ? "good" : "warn"}>{ok ? "OK" : "Pendente"}</StatusBadge></div>)}</div>
        <p className="mt-4 text-xs text-slate-500">O botao so libera quando tudo estiver correto. Custo: {creditsNeeded} creditos.</p>
        {state.credits.balance < creditsNeeded ? <Button href="/app/credits" className="mt-4 w-full"><WalletCards className="h-4 w-4" /> Comprar creditos</Button> : null}
        <StatusBadge tone={ready ? "good" : "warn"}>{ready ? "Pronto para gerar" : "Bloqueado"}</StatusBadge>
        {ready ? <Button className="mt-4 w-full" onClick={onGenerate} disabled={generating}>{generating ? "Gerando..." : "Gerar foto"}</Button> : null}
      </div>
    </div>
  );
}

export function ShootDetailPage({ id }: { id: string }) {
  const { state, commit, reload, supabase, loadError } = useDemoState();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
  const shootCreditsNeeded = creditCostForQuantity(state, shoot.quantity);
  const canGenerateFromDetail = state.credits.balance >= shootCreditsNeeded;

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
    if (isDemoMode()) {
      const referencePhoto: ReferencePhoto = {
        id: uid("ref"),
        user_id: demoUserId,
        client_id: client.id,
        shoot_id: currentShoot.id,
        type,
        storage_path: "",
        file_url: URL.createObjectURL(file),
        quality_status: "approved",
        quality_score: 92,
        quality_issues: [],
        quality_recommendation: "Foto aceita para demonstracao visual.",
        can_be_primary_identity: ["face_neutral", "face_smiling", "full_body_front", "full_body_side"].includes(type),
        has_face: type.includes("face"),
        face_clear: type.includes("face"),
        face_visible: type.includes("face"),
        body_visible: type.includes("body"),
        resolution_ok: true,
        lighting_quality: "good",
        notes: file.name,
        created_at: new Date().toISOString()
      };
      commit({ ...state!, referencePhotos: [referencePhoto, ...state!.referencePhotos.filter((photo) => !(photo.shoot_id === currentShoot.id && photo.type === type))] });
      setUploadPreviews((current) => ({ ...current, [type]: referencePhoto.file_url }));
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
    if (isDemoMode()) {
      commit({ ...state!, referencePhotos: state!.referencePhotos.filter((photo) => !(photo.shoot_id === currentShoot.id && photo.type === type)) });
      setUploadPreviews((current) => {
        if (current[type]) URL.revokeObjectURL(current[type]);
        const next = { ...current };
        delete next[type];
        return next;
      });
      return;
    }
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
    setConfirmDelete(false);
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
    if (isDemoMode()) {
      const updatedAt = new Date().toISOString();
      commit({ ...state!, shoots: state!.shoots.map((item) => item.id === currentShoot.id ? { ...item, ...payload, updated_at: updatedAt } as Shoot : item) });
      setEditing(false);
      return;
    }
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
    if (!canGenerateFromDetail) {
      setBusy(false);
      setError("Creditos insuficientes. Compre creditos para gerar este ensaio.");
      return;
    }
    if (isDemoMode()) {
      const now = new Date().toISOString();
      const creditsCharged = shootCreditsNeeded;
      const newImages = Array.from({ length: currentShoot.quantity }, (_, index) => ({
        id: uid("image"),
        user_id: demoUserId,
        client_id: currentShoot.client_id,
        shoot_id: currentShoot.id,
        file_url: `/api/placeholder?seed=demo-${currentShoot.id}-${Date.now()}-${index}`,
        prompt_used: prompt,
        provider: state!.generationConfig.effectiveProvider === "gemini" ? "gemini-demo" : "demo",
        model: state!.generationConfig.effectiveProvider === "gemini" ? (process.env.NEXT_PUBLIC_DEMO_MODE ? "demo-safe-preview" : "gemini") : "demo-v1",
        status: "completed" as const,
        width: 1024,
        height: 1365,
        seed: Date.now() + index,
        cost_estimate: 0,
        is_favorite: false,
        created_at: now
      }));
      commit({
        ...state!,
        shoots: state!.shoots.map((item) => item.id === currentShoot.id ? { ...item, status: "completed", generated_prompt: prompt, negative_prompt: defaultNegativePrompt, credits_used: creditsCharged, updated_at: now } : item),
        generatedImages: [...newImages, ...state!.generatedImages],
        generationLogs: [{
          id: uid("log"),
          user_id: demoUserId,
          shoot_id: currentShoot.id,
          provider: state!.generationConfig.effectiveProvider === "gemini" ? "gemini-demo" : "demo",
          model: "demo-safe-preview",
          request_payload: { demo_mode: true, prompt },
          response_payload: { images: newImages.length },
          status: "success",
          credits_charged: creditsCharged,
          cost_estimate: 0,
          created_at: now
        }, ...state!.generationLogs],
        credits: { ...state!.credits, balance: Math.max(0, state!.credits.balance - creditsCharged), total_used: state!.credits.total_used + creditsCharged, updated_at: now },
        creditTransactions: [{ id: uid("tx"), user_id: demoUserId, type: "usage", amount: -creditsCharged, description: `Demo: geracao do ensaio ${currentShoot.title}`, related_shoot_id: currentShoot.id, created_at: now }, ...state!.creditTransactions]
      });
      setBusy(false);
      setError("Modo demo ativo: resultado gerado com placeholder seguro, sem chamada real de IA.");
      return;
    }
    const response = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shoot: currentShoot, client, referencePhotos: refs }) });
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
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError("");
    setDeleting(true);
    if (isDemoMode()) {
      const deletedAt = new Date().toISOString();
      commit({
        ...state!,
        shoots: state!.shoots.map((item) => item.id === currentShoot.id ? { ...item, deleted_at: deletedAt, status: "archived", updated_at: deletedAt } : item),
        generatedImages: state!.generatedImages.map((image) => image.shoot_id === currentShoot.id ? { ...image, deleted_at: deletedAt } : image)
      });
      setDeleting(false);
      router.push(withDemoParam("/app/shoots"));
      return;
    }
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
      setConfirmDelete(false);
      return;
    }

    router.push(withDemoParam("/app/shoots"));
    await reload();
  }
  return (
    <>
      <PageTitle title={shoot.title} text={`${client.name} - ${shoot.category} - ${shoot.quantity} imagens`} action={<div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={shoot.status === "completed"} onClick={startEditing}>Editar</Button><Button variant="danger" disabled={deleting || busy} onClick={deleteShoot}><Trash2 className="h-4 w-4" /> {deleting ? "Excluindo..." : confirmDelete ? "Confirmar exclusao" : "Excluir"}</Button>{confirmDelete ? <Button variant="ghost" disabled={deleting || busy} onClick={() => setConfirmDelete(false)}>Cancelar</Button> : null}{!canGenerateFromDetail ? <Button href="/app/credits" variant="secondary"><WalletCards className="h-4 w-4" /> Comprar creditos</Button> : null}<Button disabled={busy || deleting || shoot.status === "completed" || !canGenerateFromDetail} onClick={generate}>{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Gerar foto</Button></div>} />
      {confirmDelete ? <div className="mb-5 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">Confirme para excluir este ensaio. As imagens vinculadas tambem sairao da galeria e do dashboard.</div> : null}
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
        {isAdmin ? <PromptPreview prompt={prompt} negative={defaultNegativePrompt} /> : <Card><h2 className="text-lg font-semibold">Checklist do ensaio</h2><div className="mt-4 grid gap-2 text-sm text-slate-300"><p>Fotos obrigatorias aprovadas: {summarizePhotoQuality(refs).ok ? "sim" : "pendentes"}</p><p>Consentimento: {shoot.consent_confirmed ? "confirmado" : "pendente"}</p><p>Creditos necessarios: {detailCreditsNeeded}</p></div><p className="mt-4 text-sm leading-6 text-slate-400">Envie fotos nitidas e bem iluminadas para preservar melhor a identidade antes de gerar.</p></Card>}
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
  const { state, commit, reload, supabase, loadError } = useDemoState();
  const [clientFilter, setClientFilter] = useState("");
  const [shootFilter, setShootFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [preview, setPreview] = useState<GeneratedImage | null>(null);
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const isAdmin = state.profile.role === "admin";

  async function updateImage(id: string, values: Partial<GeneratedImage>) {
    if (isDemoMode()) {
      commit({ ...state!, generatedImages: state!.generatedImages.map((image) => image.id === id ? { ...image, ...values } : image) });
      return;
    }
    const userId = await getCurrentUserId(supabase);
    const { error } = await supabase.from("generated_images").update(values).eq("id", id).eq("user_id", userId);
    if (error) {
      logSupabaseError("Supabase error", error);
      return;
    }
    await reload();
  }

  async function markShootDelivered(shootId: string) {
    if (isDemoMode()) {
      commit({ ...state!, shoots: state!.shoots.map((shoot) => shoot.id === shootId ? { ...shoot, status: "delivered", updated_at: new Date().toISOString() } : shoot) });
      return;
    }
    const userId = await getCurrentUserId(supabase);
    const { error } = await supabase.from("shoots").update({ status: "delivered", updated_at: new Date().toISOString() }).eq("id", shootId).eq("user_id", userId);
    if (error) logSupabaseError("Supabase error", error);
    await reload();
  }

  async function markPortfolio(image: GeneratedImage) {
    if (isDemoMode()) {
      commit({ ...state!, generatedImages: state!.generatedImages.map((item) => item.id === image.id ? { ...item, portfolio_authorized: !item.portfolio_authorized } : item) });
      return;
    }
    const userId = await getCurrentUserId(supabase);
    const { error } = await supabase.from("generated_images").update({ portfolio_authorized: !image.portfolio_authorized }).eq("id", image.id).eq("user_id", userId);
    if (error?.message?.includes("portfolio_authorized")) {
      await navigator.clipboard?.writeText("Coluna portfolio_authorized ainda nao existe no Supabase. Rode a migration de consentimentos.");
      return;
    }
    if (error) logSupabaseError("Supabase error", error);
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
      <PageTitle title="Galeria" text="Seu portfolio de imagens geradas, com filtros por cliente, categoria e ensaio." />
      <Card className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Filtrar por cliente"><select className={inputClass} value={clientFilter} onChange={(event) => { setClientFilter(event.target.value); setShootFilter(""); }}><option value="">Todos os clientes</option>{state.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Field>
          <Field label="Filtrar por categoria"><select className={inputClass} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">Todas as categorias</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></Field>
          <Field label="Filtrar por ensaio"><select className={inputClass} value={shootFilter} onChange={(event) => setShootFilter(event.target.value)}><option value="">Todos os ensaios</option>{shootsForFilter.map((shoot) => <option key={shoot.id} value={shoot.id}>{shoot.title}</option>)}</select></Field>
        </div>
      </Card>
      <GalleryGrid images={images} title="Todas as imagens" showProvider={isAdmin} clients={state.clients} shoots={state.shoots} onPreview={setPreview} onFavorite={(image) => updateImage(image.id, { is_favorite: !image.is_favorite })} onDelete={(image) => updateImage(image.id, { deleted_at: new Date().toISOString() })} onPortfolio={markPortfolio} onDelivered={(image) => markShootDelivered(image.shoot_id)} />
      {preview ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setPreview(null)}><div className="max-h-[90vh] max-w-4xl overflow-hidden rounded-lg border border-line bg-panel p-3" onClick={(event) => event.stopPropagation()}><img src={preview.file_url} alt="Preview" className="max-h-[78vh] w-full object-contain" onError={(event) => { event.currentTarget.src = `/api/placeholder?seed=preview-${preview.id}`; }} /><div className="mt-3 flex justify-end"><Button variant="secondary" onClick={() => setPreview(null)}>Fechar</Button></div></div></div> : null}
    </>
  );
}

function GalleryGrid({ images, title, showProvider = false, clients = [], shoots = [], onPreview, onFavorite, onDelete, onPortfolio, onDelivered }: { images: GeneratedImage[]; title: string; showProvider?: boolean; clients?: Client[]; shoots?: Shoot[]; onPreview?: (image: GeneratedImage) => void; onFavorite?: (image: GeneratedImage) => void; onDelete?: (image: GeneratedImage) => void; onPortfolio?: (image: GeneratedImage) => void; onDelivered?: (image: GeneratedImage) => void }) {
  return (
    <section className="mt-6">
      <SectionTitle title={title} text={`${images.length} imagem${images.length === 1 ? "" : "s"} pronta${images.length === 1 ? "" : "s"} para revisar, baixar ou entregar.`} />
      {images.length === 0 ? <EmptyGalleryState /> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{images.map((image, index) => {
        const shoot = shoots.find((item) => item.id === image.shoot_id);
        const client = clients.find((item) => item.id === image.client_id);
        return <Card key={image.id} className="group overflow-hidden p-0 hover:-translate-y-0.5 hover:border-champagne/45"><button type="button" className="relative block w-full overflow-hidden" onClick={() => onPreview?.(image)}><img src={image.file_url} alt="Imagem gerada" className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-[1.02]" onError={(event) => { event.currentTarget.src = `/api/placeholder?seed=fallback-${image.id}-${index}`; }} /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition group-hover:opacity-100"><span className="text-xs font-semibold text-white">Abrir preview</span></div></button><div className="p-4"><div className="flex flex-wrap gap-2">{showProvider ? <StatusBadge tone="good">{image.provider}</StatusBadge> : <StatusBadge tone="good">Imagem gerada</StatusBadge>}<StatusBadge tone="default">{client?.name ?? "Cliente"}</StatusBadge>{shoot?.category ? <StatusBadge tone="default">{shoot.category}</StatusBadge> : null}<StatusBadge tone={shootStatusTone(shoot?.status ?? image.status)}>{shootStatusLabel(shoot?.status ?? image.status)}</StatusBadge>{image.portfolio_authorized ? <StatusBadge tone="good">Portfolio autorizado</StatusBadge> : null}</div><div className="mt-3"><p className="font-semibold text-white">{shoot?.title ?? "Ensaio"}</p><p className="mt-1 text-xs text-steel">{formatShootDate(image.created_at)} - {shoot?.credits_used ?? image.cost_estimate} creditos</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="ghost" title="Favoritar" onClick={() => onFavorite?.(image)}><Heart className={`h-4 w-4 ${image.is_favorite ? "fill-cyan text-cyan" : ""}`} /></Button><Button variant="ghost" title="Baixar" onClick={() => window.open(image.file_url, "_blank")}><Download className="h-4 w-4" /></Button><Button variant="ghost" title="Copiar prompt" onClick={() => navigator.clipboard?.writeText(image.prompt_used)}><Copy className="h-4 w-4" /></Button>{shoot ? <Button variant="ghost" title="Refazer com mesmo prompt" href={`/app/shoots/${shoot.id}`}><RefreshCw className="h-4 w-4" /></Button> : null}<Button variant="ghost" title="Marcar entregue" onClick={() => onDelivered?.(image)}>Entregue</Button><Button variant="ghost" title="Portfolio" onClick={() => onPortfolio?.(image)}>Portfolio</Button><Button variant="ghost" title="Criar imagem de exemplo para WhatsApp" onClick={() => navigator.clipboard?.writeText(`Exemplo de ensaio PhotoForge AI para WhatsApp: ${image.file_url}`)}>WhatsApp</Button><Button variant="ghost" title="Excluir" onClick={() => onDelete?.(image)}><Trash2 className="h-4 w-4" /></Button></div></div></div></Card>;
      })}</div>}
    </section>
  );
}

export function CreditsPage() {
  const { state, loadError } = useDemoState();
  const [demoMessage, setDemoMessage] = useState("");
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const balance = state.credits.balance;
  const lowCredits = balance < state.generationConfig.creditsPerImage;

  function buildCheckoutUrl(base: string) {
    if (isDemoMode()) return "#";
    const url = new URL(base);
    if (state!.profile.email) url.searchParams.set("email", state!.profile.email);
    if (state!.profile.name) url.searchParams.set("name", state!.profile.name);
    return url.toString();
  }

  function handleBuy(plan: (typeof plans)[number]) {
    if (isDemoMode()) {
      setDemoMessage("Compra simulada no modo demo.");
      return;
    }
    window.open(buildCheckoutUrl(plan.checkoutUrl), "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <PageTitle title="Creditos" text="Compre creditos para gerar imagens profissionais com IA." />
      {demoMessage ? <div className="mb-4"><Notice tone="warn">{demoMessage}</Notice></div> : null}
      {lowCredits ? (
        <div className="mb-4">
          <Notice tone="warn">
            {balance === 0
              ? "Voce nao tem creditos. Escolha um plano abaixo para comecar a gerar."
              : "Creditos insuficientes para gerar. Escolha um plano para continuar."}
          </Notice>
        </div>
      ) : null}
      <Card className="my-6 grid gap-5 border-champagne/30 bg-[linear-gradient(135deg,rgba(244,213,141,.14),rgba(16,19,27,.96)_52%,rgba(45,212,191,.07))] md:grid-cols-3">
        <div>
          <p className="text-sm text-steel">Saldo atual</p>
          <div className={`mt-2 text-6xl font-semibold ${balance === 0 ? "text-red-100" : ""}`}>{balance}</div>
          <p className="mt-2 text-sm text-steel">creditos disponiveis para novas geracoes.</p>
        </div>
        <div>
          <p className="text-sm text-steel">Creditos usados</p>
          <div className="mt-2 text-5xl font-semibold">{state.credits.total_used}</div>
          <p className="mt-2 text-sm text-steel">Historico total de consumo.</p>
        </div>
        <div>
          <p className="text-sm text-steel">Total comprado</p>
          <div className="mt-2 text-5xl font-semibold">{state.credits.total_purchased}</div>
          <p className="mt-2 text-sm text-steel">Creditos adquiridos desde o inicio.</p>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.name} className={`flex flex-col hover:border-cyan/40 ${plan.isSubscription ? "border-champagne/35" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={plan.isSubscription ? "warn" : "default"}>
                {plan.isSubscription ? "Assinatura mensal" : "Avulso"}
              </StatusBadge>
            </div>
            <h2 className="mt-4 text-xl font-semibold">{plan.name}</h2>
            <div className="mt-4 text-5xl font-semibold">{plan.credits}</div>
            <p className="mt-1 text-sm text-steel">creditos inclusos</p>
            <Button className="mt-6 w-full" onClick={() => handleBuy(plan)}>
              Comprar
            </Button>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <SectionTitle title="Historico de transacoes" text="Entradas, usos e reembolsos de credito aparecem aqui." />
        <div className="mt-4 grid gap-2">
          {state.creditTransactions.length === 0 ? (
            <EmptyState title="Nenhuma transacao ainda." text="Quando creditos forem usados ou adicionados, o historico aparece aqui." />
          ) : (
            state.creditTransactions.map((tx) => (
              <div key={tx.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[.08] bg-ink/60 p-3 text-sm">
                <span>{tx.description}</span>
                <span className={tx.amount < 0 ? "font-semibold text-red-100" : "font-semibold text-cyan"}>{tx.amount}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </>
  );
}

type TemplateItem = (typeof templates)[number];

const templateFilterOptions = [
  { value: "all", label: "Todos" },
  { value: "Aniversario", label: "Aniversario" },
  { value: "Casual", label: "Casual" },
  { value: "Praia", label: "Praia" },
  { value: "Profissional/empresa", label: "Profissional" },
  { value: "Casal", label: "Casal" },
  { value: "Gestante", label: "Gestante" },
  { value: "Infantil/bebe", label: "Infantil" },
  { value: "Fitness", label: "Fitness" },
  { value: "special", label: "Especiais" }
];

function isSpecialTemplate(template: TemplateItem) {
  return template.name === "Recriar Referencia" || template.name === "Prompt Personalizado";
}

function templateTags(template: TemplateItem) {
  return [templateCategoryForShoot(template.category), template.badge, template.subtype, `${template.credits} creditos`].filter(Boolean);
}

function templateVisual(template: TemplateItem) {
  const key = template.name.toLowerCase();
  const palette = key.includes("luxo")
    ? "from-gold/45 via-red-400/20 to-violet/35"
    : key.includes("balo")
      ? "from-cyan/40 via-violet/25 to-white/15"
      : key.includes("bolo")
        ? "from-gold/35 via-pink-300/25 to-cyan/15"
        : key.includes("urbano")
          ? "from-slate-400/25 via-cyan/25 to-violet/25"
          : key.includes("cafe")
            ? "from-gold/25 via-white/15 to-cyan/20"
            : key.includes("praia") && key.includes("editorial")
              ? "from-cyan/35 via-white/20 to-violet/30"
              : key.includes("praia")
                ? "from-cyan/45 via-blue-300/25 to-gold/25"
                : key.includes("profissional") || key.includes("linkedin")
                  ? "from-slate-300/25 via-cyan/25 to-black/30"
                  : key.includes("casal")
                    ? "from-violet/35 via-red-300/20 to-gold/20"
                    : key.includes("gestante")
                      ? "from-gold/25 via-white/20 to-violet/25"
                      : key.includes("infantil")
                        ? "from-cyan/25 via-gold/25 to-white/20"
                        : key.includes("fitness")
                          ? "from-lime/35 via-cyan/15 to-black/35"
                          : key.includes("recriar")
                            ? "from-violet/45 via-cyan/25 to-gold/20"
                            : "from-white/20 via-cyan/20 to-violet/25";
  const label = key.includes("bolo") ? "bolo" : key.includes("balo") ? "baloes" : key.includes("cafe") ? "cafe" : key.includes("praia") ? "praia" : key.includes("recriar") ? "referencia" : key.includes("personalizado") ? "prompt" : templateCategoryForShoot(template.category).toLowerCase();
  return (
    <div className="relative aspect-video overflow-hidden rounded-t-lg border-b border-white/10 bg-ink">
      <div className={`absolute inset-0 bg-gradient-to-br ${palette}`} />
      <div className="absolute inset-0 photo-noise opacity-60" />
      <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-xs text-white backdrop-blur">{label}</div>
      <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
        <div className="h-14 rounded-lg border border-white/10 bg-white/15" />
        <div className="h-14 rounded-lg border border-white/10 bg-white/10" />
        <div className="h-14 rounded-lg border border-white/10 bg-white/20" />
      </div>
    </div>
  );
}

function TemplateCard({ template, special = false }: { template: TemplateItem; special?: boolean }) {
  return (
    <Card className={`overflow-hidden p-0 hover:-translate-y-0.5 ${special ? "border-gold/35 bg-gold/10 hover:border-gold/60" : "hover:border-cyan/50"}`}>
      {templateVisual(template)}
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5">{templateTags(template).map((tag, index) => <StatusBadge key={`${template.id}-${tag}`} tone={index === 1 || special ? "warn" : index === 0 ? "good" : "default"}>{tag}</StatusBadge>)}</div>
        <h2 className="mt-3 text-base font-semibold">{template.name}</h2>
        <p className="mt-2 min-h-12 text-xs leading-5 text-slate-400">{template.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href={`/app/shoots/new?template=${template.id}`} className="min-h-9 px-3 py-1.5 text-xs">{special && template.name === "Recriar Referencia" ? "Recriar uma referencia" : special ? "Criar do zero" : "Usar modelo"}</Button>
          <Button href={`/app/shoots/new?template=${template.id}`} variant="ghost" className="min-h-9 px-3 py-1.5 text-xs">Ver detalhes</Button>
        </div>
      </div>
    </Card>
  );
}

export function TemplatesPage() {
  const { state, loadError } = useDemoState();
  const [categoryFilter, setCategoryFilter] = useState("all");
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const readyTemplates = templates.filter((template) => !isSpecialTemplate(template));
  const specialTemplates = templates.filter(isSpecialTemplate);
  const matchesFilter = (template: TemplateItem) => categoryFilter === "all" || (categoryFilter === "special" ? isSpecialTemplate(template) : template.category === categoryFilter);
  const visibleReady = readyTemplates.filter(matchesFilter);
  const visibleSpecial = specialTemplates.filter(matchesFilter);
  const countFor = (value: string) => templates.filter((template) => value === "all" || (value === "special" ? isSpecialTemplate(template) : template.category === value)).length;
  return (
    <>
      <PageTitle title="Templates" text="Uma biblioteca compacta para escolher rapido o melhor modelo antes de ajustar roupa, pose, cenario e detalhes." action={<Button href="/app/shoots/new"><Plus className="h-4 w-4" /> Novo ensaio</Button>} />
      <Card className="mb-6 p-3">
        <div className="flex gap-2 overflow-x-auto">
          {templateFilterOptions.map((option) => <Button key={option.value} variant={categoryFilter === option.value ? "primary" : "ghost"} onClick={() => setCategoryFilter(option.value)}>{option.label} ({countFor(option.value)})</Button>)}
        </div>
      </Card>
      {visibleReady.length > 0 ? (
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Modelos prontos</h2>
            <p className="mt-1 text-sm text-slate-400">Escolha um cenario pronto e depois ajuste roupa, pose e detalhes antes de gerar.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleReady.map((template) => <TemplateCard key={template.id} template={template} />)}
          </div>
        </section>
      ) : null}
      {visibleSpecial.length > 0 ? (
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Modos especiais</h2>
            <p className="mt-1 text-sm text-slate-400">Use quando quiser partir de uma referencia ou criar algo do zero.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleSpecial.map((template) => <TemplateCard key={template.id} template={template} special />)}
          </div>
        </section>
      ) : null}
    </>
  );
}

export function ResultsPage() {
  const { state, loadError } = useDemoState();
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const results = calculateResults(state);
  const deliveredShoots = results.activeShoots.filter((shoot) => shoot.status === "delivered" || shoot.status === "completed");
  const achievements = [
    ["Primeira cliente", results.activeClients.length > 0],
    ["Primeiro ensaio entregue", deliveredShoots.length > 0],
    ["10 imagens geradas", state.generatedImages.filter((image) => !image.deleted_at).length >= 10],
    ["100 creditos usados", results.creditsUsed >= 100],
    ["Primeira venda", results.revenue > 0]
  ] as const;
  return (
    <>
      <PageTitle title="Seu progresso com fotos IA" text="Lucrômetro simples para acompanhar vendas, custo estimado, margem e evolução da operação." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Lucro estimado" value={money(results.profit)} Icon={BarChart3} tone="gold" featured />
        <MetricCard label="Ensaios gerados" value={results.generatedShoots.length} Icon={Camera} tone="cyan" />
        <MetricCard label="Creditos usados" value={results.creditsUsed} Icon={WalletCards} tone="gold" />
        <MetricCard label="Clientes atendidos" value={results.activeClients.length} Icon={Users} tone="violet" />
        <MetricCard label="Ticket medio" value={money(results.averageTicket)} Icon={BarChart3} tone="lime" />
        <MetricCard label="Valor vendido" value={money(results.revenue)} Icon={CheckCircle2} tone="cyan" />
        <MetricCard label="Custo estimado" value={money(results.estimatedCost)} Icon={Sparkles} tone="gold" />
        <MetricCard label="Meta do mes" value={money(Math.max(1500, results.revenue + 500))} Icon={ShieldCheck} tone="violet" />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card><SectionTitle title="Conquistas" text="Pequenos marcos para acompanhar a evolucao do seu uso." /><div className="mt-4 grid gap-2">{achievements.map(([label, done]) => <div key={label} className="flex items-center justify-between rounded-lg border border-white/[.08] bg-ink/60 p-3 text-sm"><span>{label}</span><StatusBadge tone={done ? "good" : "default"}>{done ? "feito" : "em andamento"}</StatusBadge></div>)}</div></Card>
        <Card><SectionTitle title="Ranking" text="Comparativos por comunidade, turma e periodo ficam em breve." /><Notice tone="warn">Por enquanto, acompanhe faturamento, creditos usados, custo estimado, lucro e ticket medio.</Notice></Card>
      </div>
    </>
  );
}

export function HistoryPage() {
  const { state, loadError } = useDemoState();
  const [filter, setFilter] = useState("all");
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const logRows = state.generationLogs.map((log) => ({ kind: "generations", date: log.created_at, log }));
  const creditRows = state.creditTransactions.map((tx) => ({ kind: "credits", date: tx.created_at, tx }));
  const rows = [...logRows, ...creditRows]
    .filter((row) => filter === "all" || row.kind === filter || (filter === "errors" && "log" in row && row.log.status === "failed") || (filter === "deliveries" && "log" in row && state.shoots.find((shoot) => shoot.id === row.log.shoot_id)?.status === "delivered"))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <>
      <PageTitle title="Historico" text="Uma linha do tempo de geracoes, creditos, erros e entregas." />
      <Card className="mb-5 p-3"><div className="premium-scrollbar flex gap-2 overflow-x-auto">{[["all", "Tudo"], ["generations", "Geracoes"], ["credits", "Creditos"], ["clients", "Clientes"], ["errors", "Erros"], ["deliveries", "Entregas"]].map(([value, label]) => <Button key={value} variant={filter === value ? "primary" : "ghost"} onClick={() => setFilter(value)}>{label}</Button>)}</div></Card>
      <Card className="premium-scrollbar overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-steel"><tr><th className="p-3">Data</th><th className="p-3">Acao</th><th className="p-3">Cliente</th><th className="p-3">Template</th><th className="p-3">Status</th><th className="p-3">Creditos</th><th className="p-3">Erro/detalhe</th><th className="p-3">Acao</th></tr></thead>
          <tbody>{rows.length === 0 ? <tr><td className="p-4 text-slate-400" colSpan={8}>Nenhum item encontrado neste filtro.</td></tr> : rows.map((row) => {
            if ("tx" in row) return <tr key={row.tx.id} className="border-t border-line"><td className="p-3">{formatShootDate(row.tx.created_at)}</td><td className="p-3">Credito</td><td className="p-3">-</td><td className="p-3">-</td><td className="p-3"><StatusBadge tone={row.tx.amount < 0 ? "warn" : "good"}>{row.tx.type}</StatusBadge></td><td className="p-3">{row.tx.amount}</td><td className="p-3 text-slate-400">{row.tx.description}</td><td className="p-3">-</td></tr>;
            const shoot = state.shoots.find((item) => item.id === row.log.shoot_id);
            const client = state.clients.find((item) => item.id === shoot?.client_id);
            return <tr key={row.log.id} className="border-t border-line"><td className="p-3">{formatShootDate(row.log.created_at)}</td><td className="p-3">Geracao</td><td className="p-3">{client?.name ?? "-"}</td><td className="p-3">{shoot?.title ?? "Ensaio removido"}</td><td className="p-3"><StatusBadge tone={row.log.status === "success" ? "good" : row.log.status === "failed" ? "bad" : "warn"}>{row.log.status === "success" ? "Sucesso" : row.log.status === "failed" ? "Erro" : "Pendente"}</StatusBadge></td><td className="p-3">{row.log.credits_charged}</td><td className="p-3 text-slate-400">{row.log.error_message || `${row.log.model} - ${money(row.log.cost_estimate)}`}</td><td className="p-3">{shoot ? <Button href={`/app/shoots/${shoot.id}`} variant="ghost">Ver ensaio</Button> : "-"}</td></tr>;
          })}</tbody>
        </table>
      </Card>
    </>
  );
}

export function SettingsPage() {
  const { state, commit, reload, supabase, loadError } = useDemoState();
  const [profileError, setProfileError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;

  async function uploadAvatar(file: File) {
    setProfileError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProfileError("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setProfileError("A foto de perfil precisa ter no maximo 4 MB.");
      return;
    }
    setUploadingAvatar(true);
    if (isDemoMode()) {
      const avatarUrl = URL.createObjectURL(file);
      commit({ ...state!, profile: { ...state!.profile, avatar_url: avatarUrl, updated_at: new Date().toISOString() } });
      setUploadingAvatar(false);
      return;
    }
    const userId = await getCurrentUserId(supabase);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${userId}/${Date.now()}-${safeName}`;
    const upload = await supabase.storage.from("avatars").upload(storagePath, file, { contentType: file.type, upsert: true });
    if (upload.error) {
      logSupabaseError("Supabase error", upload.error);
      setProfileError(process.env.NODE_ENV === "development" ? `Erro no upload: ${upload.error.message}` : "Nao foi possivel enviar a foto. Confira se o bucket avatars existe no Supabase.");
      setUploadingAvatar(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(storagePath);
    const { error } = await supabase.from("profiles").update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() }).eq("user_id", userId);
    setUploadingAvatar(false);
    if (error) {
      logSupabaseError("Supabase error", error);
      setProfileError(process.env.NODE_ENV === "development" ? `Erro do Supabase: ${error.message}` : "Nao foi possivel atualizar sua foto.");
      return;
    }
    await reload();
  }

  async function removeAvatar() {
    setProfileError("");
    if (isDemoMode()) {
      commit({ ...state!, profile: { ...state!.profile, avatar_url: undefined, updated_at: new Date().toISOString() } });
      return;
    }
    const userId = await getCurrentUserId(supabase);
    const { error } = await supabase.from("profiles").update({ avatar_url: null, updated_at: new Date().toISOString() }).eq("user_id", userId);
    if (error) {
      logSupabaseError("Supabase error", error);
      setProfileError(process.env.NODE_ENV === "development" ? `Erro do Supabase: ${error.message}` : "Nao foi possivel remover sua foto.");
      return;
    }
    await reload();
  }

  return (
    <>
      <PageTitle title="Configuracoes" text="Conta, plano, preferencias de geracao, autorizacao de imagem, suporte e seguranca." />
      {isDemoMode() ? <div className="mb-5"><Notice tone="warn">Voce esta no modo demo. Nenhuma compra ou geracao real sera cobrada.</Notice></div> : null}
      <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <Card>
          <SectionTitle title="Conta" text="Dados principais do perfil usado na operacao." />
          {profileError ? <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{profileError}</div> : null}
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            {state.profile.avatar_url ? <img src={state.profile.avatar_url} alt={state.profile.name} className="h-24 w-24 rounded-full border border-white/10 object-cover" /> : <div className="grid h-24 w-24 place-items-center rounded-full border border-champagne/25 bg-gradient-to-br from-champagne via-cyan to-violet text-2xl font-semibold text-ink">{userInitials(state.profile.name)}</div>}
            <div className="grid gap-3">
              <div>
                <p className="font-semibold text-white">{state.profile.name}</p>
                <p className="text-sm text-slate-400">{state.profile.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input id="avatar-upload" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadAvatar(file);
                  event.currentTarget.value = "";
                }} />
                <label htmlFor="avatar-upload" className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-line bg-panel2 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan/70 hover:bg-white/[.07]">{uploadingAvatar ? "Enviando..." : state.profile.avatar_url ? "Trocar foto" : "Enviar foto"}</label>
                {state.profile.avatar_url ? <Button variant="ghost" onClick={removeAvatar}>Remover foto</Button> : null}
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Nome"><input className={inputClass} defaultValue={state.profile.name} disabled /></Field>
            <Field label="E-mail"><input className={inputClass} defaultValue={state.profile.email} disabled /></Field>
            <Field label="WhatsApp"><input className={inputClass} defaultValue={state.profile.whatsapp ?? ""} disabled /></Field>
            <Field label="Plano atual"><input className={inputClass} defaultValue={planLabel(state.profile.plan_type, state.profile.role)} disabled /></Field>
            <Field label="Status de membro"><input className={inputClass} defaultValue={isCommunityPlan(state.profile.plan_type) ? "Membro da comunidade" : "Plano publico"} disabled /></Field>
          </div>
        </Card>
        <div className="grid gap-5">
          <Card><SectionTitle title="Preferencias de geracao" text="Configuracoes visiveis da operacao atual." /><div className="grid gap-3"><InfoTile label="Provider ativo" value={state.generationConfig.effectiveProvider} /><InfoTile label="Creditos por imagem" value={state.generationConfig.creditsPerImage} /><InfoTile label="Quantidades" value={quantitySelectOptions(state).join(", ")} /></div></Card>
          <Card><SectionTitle title="Autorizacao de imagem" text="Regras de uso interno, portfolio, WhatsApp e anuncios." /><p className="text-sm leading-6 text-steel">Gere imagens apenas com consentimento da cliente. Portfolio, WhatsApp e anuncios devem respeitar as marcacoes do ensaio.</p><Button href="/image-policy" className="mt-5" variant="secondary">Ver politica de imagem</Button></Card>
          <Card><SectionTitle title="Suporte e seguranca" text="Ajuda rapida, termos e canais oficiais." /><p className="text-sm leading-6 text-steel">WhatsApp de suporte: +55 11 90000-0000. Leia tambem os termos de uso antes de vender ensaios para clientes.</p><div className="mt-5 flex flex-wrap gap-2"><Button href="/app/support" variant="secondary">Falar com suporte</Button><Button href="/terms" variant="secondary">Termos de uso</Button><Button href="/" variant="ghost">Sair</Button></div></Card>
        </div>
      </div>
    </>
  );
}

export function SupportPage() {
  const faqs = [
    ["Creditos", "Confira seu saldo antes de gerar. Se o saldo for insuficiente, solicite novos creditos."],
    ["Upload", "Use JPG, PNG ou WEBP ate 10 MB, com boa luz e sem filtro forte."],
    ["Geracao", "A geracao so libera com cliente, categoria, fotos obrigatorias, consentimento e creditos."],
    ["Conta", "Se nao conseguir entrar, faca logout e login novamente ou revise o e-mail usado."],
    ["Pagamento", "Compra automatica de creditos ainda esta em preparacao."]
  ];
  return (
    <>
      <PageTitle title="Suporte" text="Respostas rapidas para conta, upload, creditos, geracao e entrega." action={<Button href="mailto:suporte@photoforge.ai" variant="secondary"><Mail className="h-4 w-4" /> E-mail</Button>} />
      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <Card className="border-cyan/25 bg-cyan/10">
          <MessageCircle className="h-8 w-8 text-cyan" />
          <h2 className="mt-4 text-xl font-semibold">Precisa de ajuda?</h2>
          <p className="mt-2 text-sm leading-6 text-steel">Use os atalhos abaixo para seguir o fluxo ou falar com suporte. Descreva cliente, ensaio e mensagem de erro quando houver.</p>
          <div className="mt-5 grid gap-3">
            <Button href="https://wa.me/5511900000000" variant="secondary">Falar no WhatsApp</Button>
            <Button href="/app/templates" variant="secondary">Tutorial rapido</Button>
            <Button href="/image-policy" variant="secondary">Guia de fotos boas</Button>
            <Button href="/app/shoots/new">Criar novo ensaio</Button>
            <Button href="/app/credits" variant="ghost">Comprar creditos</Button>
          </div>
        </Card>
        <div className="grid gap-3 md:grid-cols-2">
          {faqs.map(([title, text]) => <Card key={title} className="hover:-translate-y-0.5 hover:border-champagne/35"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-steel">{text}</p></Card>)}
        </div>
      </div>
    </>
  );
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
