"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Camera, CheckCircle2, Copy, Download, Heart, Image as ImageIcon, Plus, RefreshCw, ShieldCheck, Trash2, Users, WalletCards } from "lucide-react";
import { categories, optionalPhotoTypes, requiredPhotoTypes } from "@/lib/demoData";
import type { Client, ClientStatus, DemoState, GeneratedImage, QualityStatus, ReferencePhoto, Shoot } from "@/lib/types";
import { buildPremiumPrompt, defaultNegativePrompt } from "@/lib/ai/buildPremiumPrompt";
import { Button, Card, EmptyState, Field, inputClass, MetricCard, StatusBadge, UploadBox } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentAuthUser, getCurrentUserId } from "@/lib/supabase/currentUser";

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
        generationLogs: logsRes.data ?? []
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

export function DashboardPage() {
  const { state, loadError } = useDemoState();
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const revenue = state.clients.reduce((sum, client) => sum + client.total_revenue, 0);
  const cost = state.generationLogs.reduce((sum, log) => sum + log.cost_estimate, 0);
  return (
    <>
      <PageTitle title="Dashboard" text="Resumo operacional da sua esteira de clientes, ensaios, creditos e margem estimada." action={<Button href="/app/clients/new"><Plus className="h-4 w-4" /> Novo cliente</Button>} />
      {state.credits.balance < 20 ? <div className="mb-5 rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm text-gold">Seus creditos estao acabando. Recarregue para continuar gerando ensaios.</div> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Creditos restantes" value={state.credits.balance} Icon={WalletCards} tone="cyan" />
        <MetricCard label="Clientes cadastrados" value={state.clients.filter((c) => !c.deleted_at).length} Icon={Users} tone="violet" />
        <MetricCard label="Ensaios gerados" value={state.shoots.length} Icon={Camera} tone="lime" />
        <MetricCard label="Imagens criadas" value={state.generatedImages.filter((img) => !img.deleted_at).length} Icon={ImageIcon} tone="gold" />
        <MetricCard label="Receita estimada" value={money(revenue)} Icon={BarChart3} tone="cyan" />
        <MetricCard label="Lucro estimado" value={money(revenue - cost)} Icon={CheckCircle2} tone="lime" />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card>
          <h2 className="text-lg font-semibold">Ultimos ensaios</h2>
          <div className="mt-4 grid gap-3">
            {state.shoots.slice(0, 5).map((shoot) => <ShootRow key={shoot.id} shoot={shoot} client={state.clients.find((c) => c.id === shoot.client_id)} />)}
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Atalhos rapidos</h2>
          <div className="mt-4 grid gap-3">
            <Button href="/app/shoots/new" variant="secondary">Criar ensaio</Button>
            <Button href="/app/gallery" variant="secondary">Abrir galeria</Button>
            {state.profile.role === "admin" ? <Button href="/admin/logs" variant="secondary">Ver logs admin</Button> : null}
          </div>
        </Card>
      </div>
    </>
  );
}

function ShootRow({ shoot, client }: { shoot: Shoot; client?: Client }) {
  const tone = shoot.status === "completed" ? "good" : shoot.status === "failed" ? "bad" : shoot.status === "generating" ? "warn" : "default";
  return (
    <Link href={`/app/shoots/${shoot.id}`} className="flex items-center justify-between gap-4 rounded-lg border border-line bg-ink/50 p-3 hover:border-cyan/50">
      <div>
        <p className="font-medium text-white">{shoot.title}</p>
        <p className="text-xs text-slate-400">{client?.name ?? "Cliente"} - {shoot.category}</p>
      </div>
      <StatusBadge tone={tone}>{shoot.status}</StatusBadge>
    </Link>
  );
}

export function ClientsPage() {
  const { state, loadError } = useDemoState();
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  return (
    <>
      <PageTitle title="Clientes" text="Cadastre clientes finais, acompanhe status, receita informada e historico de ensaios." action={<Button href="/app/clients/new"><Plus className="h-4 w-4" /> Novo cliente</Button>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.clients.filter((c) => !c.deleted_at).map((client) => (
          <Link href={`/app/clients/${client.id}`} key={client.id}>
            <Card className="h-full transition hover:border-cyan/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{client.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{client.whatsapp}</p>
                </div>
                <StatusBadge>{clientStatusLabel(client.status)}</StatusBadge>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Cidade</p><p>{client.city || "-"}</p></div>
                <div><p className="text-slate-500">Receita</p><p>{money(client.total_revenue)}</p></div>
              </div>
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
      <PageTitle title="Novo cliente" text="Registre os dados principais antes de criar ensaios e uploads." />
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
          <div className="md:col-span-2"><Button type="submit">Salvar cliente</Button></div>
        </form>
      </Card>
    </>
  );
}

export function ClientDetailPage({ id }: { id: string }) {
  const { state, reload, supabase, loadError } = useDemoState();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", city: "", age: "", notes: "", status: "new" as ClientStatus });
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const client = state.clients.find((item) => item.id === id);
  if (!client) return <EmptyState title="Cliente nao encontrado" text="Esse registro nao existe no estado demo." />;
  const currentClient = client;
  const shoots = state.shoots.filter((shoot) => shoot.client_id === id);
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

  return (
    <>
      <PageTitle title={currentClient.name} text={`${currentClient.whatsapp} - ${currentClient.city || "Cidade nao informada"}`} action={<div className="flex gap-2"><Button variant="secondary" onClick={startEditing}>Editar</Button><Button href={`/app/shoots/new?client=${currentClient.id}`}>Novo ensaio</Button></div>} />
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
      <GalleryGrid images={images} title="Imagens geradas" />
    </>
  );
}

export function ShootsPage() {
  const { state, loadError } = useDemoState();
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  return (
    <>
      <PageTitle title="Ensaios" text="Acompanhe rascunhos, geracoes concluidas, falhas e entregas." action={<Button href="/app/shoots/new"><Plus className="h-4 w-4" /> Criar ensaio</Button>} />
      <div className="grid gap-3">{state.shoots.map((shoot) => <ShootRow key={shoot.id} shoot={shoot} client={state.clients.find((c) => c.id === shoot.client_id)} />)}</div>
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
  const readyPhotos = Boolean(draftShoot) && requiredPhotoTypes.every((photo) => currentRefs.some((ref) => ref.type === photo.type));
  const ready = Boolean(client && form.title && form.category && readyPhotos && form.consent_confirmed && state.credits.balance >= (form.quantity ?? 4));

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
      quantity: (form.quantity as 4 | 8 | 16) || 4,
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
      setFlowError(process.env.NODE_ENV === "development" && error?.message ? `Erro do Supabase: ${error.message}` : "Nao foi possivel salvar o ensaio no Supabase.");
      return null;
    }

    setDraftShoot(shoot as Shoot);
    return shoot as Shoot;
  }

  async function uploadReferencePhoto(type: string, file: File, quality: QualityStatus = "boa") {
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
      quality_status: quality,
      face_visible: type.includes("face"),
      body_visible: type.includes("body") || type.includes("full_body"),
      lighting_quality: quality,
      notes: file.name
    };

    let { data: referencePhoto, error } = await supabase
      .from("reference_photos")
      .insert(referencePayload)
      .select("*")
      .single();

    if (error?.message?.includes("'body_visible' column") || error?.message?.includes("'face_visible' column") || error?.message?.includes("'lighting_quality' column") || error?.message?.includes("'storage_path' column")) {
      const { face_visible, body_visible, lighting_quality, storage_path, ...fallbackPayload } = referencePayload;
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
      <div className="mb-5 grid gap-2 md:grid-cols-5">{["Dados", "Fotos", "Referencias", "Personalizacao", "Geracao"].map((label, index) => <button key={label} onClick={() => setStep(index + 1)} className={`rounded-lg border px-3 py-2 text-sm ${step === index + 1 ? "border-cyan bg-cyan/10 text-cyan" : "border-line bg-panel text-slate-300"}`}>{index + 1}. {label}</button>)}</div>
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
          <p className="mb-4 text-sm text-slate-400">As referencias ajudam no estilo, mas a identidade da cliente deve vir das fotos principais.</p>
          <div className="grid gap-3 md:grid-cols-2">{optionalPhotoTypes.slice(0, 6).map((photo) => <ReferenceUploadField key={photo.type} photo={photo} refPhoto={currentRefs.find((ref) => ref.type === photo.type)} preview={uploadPreviews[photo.type]} onUpload={uploadReferencePhoto} onRemove={removeReferencePhoto} />)}</div>
        </div>}
        {step === 4 && <PersonalizationFields form={form} setForm={setForm} />}
        {step === 5 && <GenerationStep state={state} form={form} setForm={setForm} client={client} readyPhotos={readyPhotos} ready={ready} />}
        <div className="mt-6 flex flex-wrap gap-3">
          {step > 1 ? <Button variant="secondary" onClick={() => setStep(step - 1)}>Voltar</Button> : null}
          {step < 5 ? <Button onClick={nextStep}>Continuar</Button> : <Button disabled={!ready} onClick={() => saveDraft("generate")}>Salvar e preparar geracao</Button>}
          <Button variant="ghost" onClick={() => saveDraft("draft")} disabled={!client || !form.title}>Salvar rascunho</Button>
        </div>
      </Card>
    </>
  );
}

function PhotoStep({ refs, previews, onUpload, onRemove }: { refs: ReferencePhoto[]; previews: Record<string, string>; onUpload: (type: string, file: File, quality?: QualityStatus) => void; onRemove: (type: string) => void }) {
  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-line bg-ink/60 p-4 text-sm leading-6 text-slate-300">Use fotos nitidas, sem filtros fortes, com boa iluminacao, sem oculos escuros cobrindo o rosto. Para tatuagens visiveis, envie areas especificas.</div>
      <div className="grid gap-3 md:grid-cols-2">{requiredPhotoTypes.map((photo) => <ReferenceUploadField key={photo.type} photo={photo} refPhoto={refs.find((ref) => ref.type === photo.type)} preview={previews[photo.type]} required onUpload={onUpload} onRemove={onRemove} />)}</div>
    </div>
  );
}

function ReferenceUploadField({ photo, refPhoto, preview, required, onUpload, onRemove }: { photo: { type: string; label: string }; refPhoto?: ReferencePhoto; preview?: string; required?: boolean; onUpload: (type: string, file: File, quality?: QualityStatus) => void; onRemove: (type: string) => void }) {
  const [quality, setQuality] = useState<QualityStatus>(refPhoto?.quality_status ?? "boa");
  const complete = Boolean(refPhoto);
  return (
    <UploadBox title={photo.label} subtitle={required ? "Obrigatoria para preservar identidade." : "Referencia opcional para pose, roupa, cenario ou detalhe."} complete={complete}>
      <div className="grid gap-3">
        {preview ? <img src={preview} alt={photo.label} className="aspect-video w-full rounded-lg border border-line object-cover" /> : complete ? <div className="rounded-lg border border-line bg-ink p-3 text-xs text-slate-300">Foto enviada: {refPhoto?.notes || refPhoto?.file_url}</div> : null}
        <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
          <input className={inputClass} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(photo.type, file, quality);
            event.currentTarget.value = "";
          }} />
          <select className={inputClass} value={quality} onChange={(event) => setQuality(event.target.value as QualityStatus)}>
            <option value="boa">Foto boa</option>
            <option value="media">Foto media</option>
            <option value="ruim">Foto ruim</option>
          </select>
        </div>
        {complete ? <Button variant="ghost" onClick={() => onRemove(photo.type)}>Remover foto</Button> : null}
      </div>
    </UploadBox>
  );
}

function PersonalizationFields({ form, setForm }: { form: Partial<Shoot>; setForm: (next: Partial<Shoot>) => void }) {
  const fields: [keyof Shoot, string, string][] = [["outfit", "Tipo de roupa", "vestido longo"], ["outfit_color", "Cor da roupa", "vermelho"], ["shoes", "Calcado", "salto preto"], ["accessories", "Acessorios", "brincos discretos"], ["hair", "Cabelo", "cabelo solto natural"], ["makeup", "Maquiagem", "elegante"], ["location", "Cenario/local", "estudio elegante com fundo escuro"], ["mood", "Clima/ambiente", "sofisticado"], ["pose", "Pose desejada", "confiante"], ["expression", "Expressao desejada", "sorriso leve"], ["lighting", "Iluminacao", "luz suave de estudio"], ["photo_style", "Estilo fotografico", "foto realista DSLR"]];
  return <div className="grid gap-4 md:grid-cols-2">{fields.map(([key, label, placeholder]) => <Field key={key} label={label}><input className={inputClass} placeholder={placeholder} value={(form[key] as string) ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field>)}</div>;
}

function GenerationStep({ state, form, setForm, client, readyPhotos, ready }: { state: DemoState; form: Partial<Shoot>; setForm: (next: Partial<Shoot>) => void; client?: Client; readyPhotos: boolean; ready: boolean }) {
  const quantity = (form.quantity as 4 | 8 | 16) || 4;
  const checklist = [
    ["Cliente selecionada", Boolean(client)],
    ["Fotos obrigatorias enviadas", readyPhotos],
    ["Categoria escolhida", Boolean(form.category)],
    ["Consentimento confirmado", Boolean(form.consent_confirmed)],
    ["Creditos suficientes", state.credits.balance >= quantity]
  ] as const;
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
      <div className="grid gap-4">
        <Field label="Quantidade de imagens"><select className={inputClass} value={quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) as 4 | 8 | 16 })}><option value={4}>Gerar 4 imagens</option><option value={8}>Gerar 8 imagens</option><option value={16}>Gerar 16 imagens</option></select></Field>
        <label className="flex items-start gap-3 rounded-lg border border-line bg-ink p-4 text-sm text-slate-300">
          <input type="checkbox" className="mt-1" checked={Boolean(form.consent_confirmed)} onChange={(e) => setForm({ ...form, consent_confirmed: e.target.checked })} />
          <span>Confirmo que tenho autorizacao da pessoa nas fotos para utilizar sua imagem na criacao deste ensaio com IA.</span>
        </label>
      </div>
      <div className="rounded-lg border border-line bg-ink p-4">
        <h3 className="font-semibold">Checklist de geracao</h3>
        <div className="mt-4 grid gap-2">{checklist.map(([label, ok]) => <div key={label} className="flex items-center justify-between text-sm"><span className="text-slate-300">{label}</span><StatusBadge tone={ok ? "good" : "warn"}>{ok ? "OK" : "Pendente"}</StatusBadge></div>)}</div>
        <p className="mt-4 text-xs text-slate-500">O botao so libera quando tudo estiver correto. Custo: {quantity} creditos.</p>
        <StatusBadge tone={ready ? "good" : "warn"}>{ready ? "Pronto para gerar" : "Bloqueado"}</StatusBadge>
      </div>
    </div>
  );
}

export function ShootDetailPage({ id }: { id: string }) {
  const { state, reload, supabase, loadError } = useDemoState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [form, setForm] = useState<Partial<Shoot>>({});
  const [uploadPreviews, setUploadPreviews] = useState<Record<string, string>>({});
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  const shoot = state.shoots.find((item) => item.id === id);
  if (!shoot) return <EmptyState title="Ensaio nao encontrado" text="Esse registro nao existe no estado demo." />;
  const currentShoot = shoot;
  const client = state.clients.find((item) => item.id === shoot.client_id)!;
  const refs = state.referencePhotos.filter((photo) => photo.shoot_id === shoot.id);
  const images = state.generatedImages.filter((image) => image.shoot_id === shoot.id && !image.deleted_at);
  const prompt = buildPremiumPrompt(shoot, client, refs);

  async function uploadDetailReferencePhoto(type: string, file: File, quality: QualityStatus = "boa") {
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
      quality_status: quality,
      face_visible: type.includes("face"),
      body_visible: type.includes("body") || type.includes("full_body"),
      lighting_quality: quality,
      notes: file.name
    };
    let { error: insertError } = await supabase.from("reference_photos").insert(referencePayload);
    if (insertError?.message?.includes("'body_visible' column") || insertError?.message?.includes("'face_visible' column") || insertError?.message?.includes("'lighting_quality' column") || insertError?.message?.includes("'storage_path' column")) {
      const { face_visible, body_visible, lighting_quality, storage_path, ...fallbackPayload } = referencePayload;
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
      quantity: (form.quantity as 4 | 8 | 16) || currentShoot.quantity,
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
  return (
    <>
      <PageTitle title={shoot.title} text={`${client.name} - ${shoot.category} - ${shoot.quantity} imagens`} action={<div className="flex gap-2"><Button variant="secondary" disabled={shoot.status === "completed"} onClick={startEditing}>Editar</Button><Button disabled={busy || shoot.status === "completed"} onClick={generate}>{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Gerar com mockProvider</Button></div>} />
      {error ? <div className="mb-5 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div> : null}
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Card>
          <h2 className="text-lg font-semibold">Resumo visivel ao usuario</h2>
          {editing ? (
            <form onSubmit={saveShoot} className="mt-4 grid gap-3">
              {editError ? <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{editError}</div> : null}
              <Field label="Nome do ensaio"><input className={inputClass} value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Categoria"><select className={inputClass} value={form.category ?? shoot.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
              <Field label="Valor vendido"><input className={inputClass} type="number" value={form.sold_price ?? 0} onChange={(e) => setForm({ ...form, sold_price: Number(e.target.value) })} /></Field>
              <Field label="Quantidade"><select className={inputClass} value={(form.quantity as number) ?? shoot.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) as 4 | 8 | 16 })}><option value={4}>4 imagens</option><option value={8}>8 imagens</option><option value={16}>16 imagens</option></select></Field>
              <PersonalizationFields form={form} setForm={setForm} />
              <label className="flex items-start gap-3 rounded-lg border border-line bg-ink p-4 text-sm text-slate-300">
                <input type="checkbox" className="mt-1" checked={Boolean(form.consent_confirmed)} onChange={(e) => setForm({ ...form, consent_confirmed: e.target.checked })} />
                <span>Confirmo que tenho autorizacao da pessoa nas fotos para utilizar sua imagem na criacao deste ensaio com IA.</span>
              </label>
              <div className="flex gap-2"><Button type="submit">Salvar ensaio</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button></div>
            </form>
          ) : (
            <div className="mt-4 grid gap-2 text-sm text-slate-300"><p>Estilo: {shoot.photo_style || "-"}</p><p>Roupa: {shoot.outfit || "-"} {shoot.outfit_color || ""}</p><p>Local: {shoot.location || "-"}</p><p>Quantidade: {shoot.quantity}</p><p>Consentimento: {shoot.consent_confirmed ? "confirmado" : "pendente"}</p></div>
          )}
        </Card>
        <PromptPreview prompt={prompt} negative={defaultNegativePrompt} />
      </div>
      {editing ? (
        <Card className="mt-5">
          <h2 className="text-lg font-semibold">Fotos do ensaio</h2>
          <p className="mt-2 text-sm text-slate-400">Complete ou substitua as fotos obrigatorias antes de gerar.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {requiredPhotoTypes.map((photo) => <ReferenceUploadField key={photo.type} photo={photo} refPhoto={refs.find((ref) => ref.type === photo.type)} preview={uploadPreviews[photo.type]} required onUpload={uploadDetailReferencePhoto} onRemove={removeDetailReferencePhoto} />)}
            {optionalPhotoTypes.slice(0, 6).map((photo) => <ReferenceUploadField key={photo.type} photo={photo} refPhoto={refs.find((ref) => ref.type === photo.type)} preview={uploadPreviews[photo.type]} onUpload={uploadDetailReferencePhoto} onRemove={removeDetailReferencePhoto} />)}
          </div>
        </Card>
      ) : null}
      <GalleryGrid images={images} title="Resultado do ensaio" />
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
  const [preview, setPreview] = useState<GeneratedImage | null>(null);
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;

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
    .filter((img) => !shootFilter || img.shoot_id === shootFilter);

  const shootsForFilter = state.shoots.filter((shoot) => !clientFilter || shoot.client_id === clientFilter);

  return (
    <>
      <PageTitle title="Galeria" text="Veja imagens por cliente e ensaio, baixe, favorite ou exclua com soft delete." />
      <Card className="mb-6">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Filtrar por cliente"><select className={inputClass} value={clientFilter} onChange={(event) => { setClientFilter(event.target.value); setShootFilter(""); }}><option value="">Todos os clientes</option>{state.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Field>
          <Field label="Filtrar por ensaio"><select className={inputClass} value={shootFilter} onChange={(event) => setShootFilter(event.target.value)}><option value="">Todos os ensaios</option>{shootsForFilter.map((shoot) => <option key={shoot.id} value={shoot.id}>{shoot.title}</option>)}</select></Field>
        </div>
      </Card>
      <GalleryGrid images={images} title="Todas as imagens" onPreview={setPreview} onFavorite={(image) => updateImage(image.id, { is_favorite: !image.is_favorite })} onDelete={(image) => updateImage(image.id, { deleted_at: new Date().toISOString() })} />
      {preview ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setPreview(null)}><div className="max-h-[90vh] max-w-4xl overflow-hidden rounded-lg border border-line bg-panel p-3" onClick={(event) => event.stopPropagation()}><img src={preview.file_url} alt="Preview" className="max-h-[78vh] w-full object-contain" onError={(event) => { event.currentTarget.src = `/api/placeholder?seed=preview-${preview.id}`; }} /><div className="mt-3 flex justify-end"><Button variant="secondary" onClick={() => setPreview(null)}>Fechar</Button></div></div></div> : null}
    </>
  );
}

function GalleryGrid({ images, title, onPreview, onFavorite, onDelete }: { images: GeneratedImage[]; title: string; onPreview?: (image: GeneratedImage) => void; onFavorite?: (image: GeneratedImage) => void; onDelete?: (image: GeneratedImage) => void }) {
  return (
    <section className="mt-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {images.length === 0 ? <EmptyState title="Nenhuma imagem ainda" text="Gere um ensaio com o mockProvider para popular esta galeria." /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{images.map((image, index) => <Card key={image.id} className="overflow-hidden p-0"><button type="button" className="block w-full" onClick={() => onPreview?.(image)}><img src={image.file_url} alt="Imagem gerada" className="aspect-[3/4] w-full object-cover" onError={(event) => { event.currentTarget.src = `/api/placeholder?seed=fallback-${image.id}-${index}`; }} /></button><div className="flex items-center justify-between p-3"><StatusBadge tone="good">{image.provider}</StatusBadge><div className="flex gap-2"><Button variant="ghost" onClick={() => onFavorite?.(image)}><Heart className={`h-4 w-4 ${image.is_favorite ? "fill-cyan text-cyan" : ""}`} /></Button><Button variant="ghost" onClick={() => window.open(image.file_url, "_blank")}><Download className="h-4 w-4" /></Button><Button variant="ghost" onClick={() => onDelete?.(image)}><Trash2 className="h-4 w-4" /></Button></div></div></Card>)}</div>}
    </section>
  );
}

export function CreditsPage() {
  const { state, loadError } = useDemoState();
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  return (
    <>
      <PageTitle title="Creditos" text="Consumo configuravel por imagem. Pagamento real fica preparado para Stripe, Kiwify ou Mercado Pago." />
      <div className="grid gap-4 md:grid-cols-4">{[100, 300, 500, 1000].map((pack) => <Card key={pack}><h2 className="text-2xl font-semibold">{pack}</h2><p className="mt-1 text-sm text-slate-400">creditos</p><Button className="mt-5 w-full" disabled>Comprar</Button><p className="mt-3 text-xs text-gold">Pagamento ainda em configuracao.</p></Card>)}</div>
      <Card className="mt-6"><h2 className="text-lg font-semibold">Transacoes</h2><div className="mt-4 grid gap-2">{state.creditTransactions.map((tx) => <div key={tx.id} className="flex justify-between rounded-lg border border-line bg-ink p-3 text-sm"><span>{tx.description}</span><span>{tx.amount}</span></div>)}</div></Card>
    </>
  );
}

export function SettingsPage() {
  const { state, loadError } = useDemoState();
  if (loadError) return <LoadErrorState message={loadError} />;
  if (!state) return <LoadingState />;
  return <><PageTitle title="Configuracoes" text="Perfil, plano, preferencias e conta." /><Card><div className="grid gap-4 md:grid-cols-2"><Field label="Nome"><input className={inputClass} defaultValue={state.profile.name} /></Field><Field label="WhatsApp"><input className={inputClass} defaultValue={state.profile.whatsapp} /></Field><Field label="Plano"><input className={inputClass} defaultValue={state.profile.plan_type} disabled /></Field><Field label="Idioma"><select className={inputClass} defaultValue="pt-BR"><option>pt-BR</option></select></Field></div></Card></>;
}

export function SupportPage() {
  return <><PageTitle title="Suporte" text="Area simples para orientar usuarios em caso de falhas, creditos e consentimento." /><Card><p className="text-sm leading-6 text-slate-300">Nao foi possivel gerar as imagens agora? Tente novamente, confira creditos e fotos obrigatorias. Para uso indevido, a conta pode ser bloqueada pelo admin.</p></Card></>;
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
      <PageTitle title={`Admin ${section}`} text="Painel administrativo separado do dashboard do usuario comum." />
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Usuarios totais" value={adminOverview?.totalUsers ?? 0} Icon={Users} />
        <MetricCard label="Creditos em circulacao" value={adminOverview?.creditsInCirculation ?? 0} Icon={WalletCards} tone="violet" />
        <MetricCard label="Imagens geradas" value={adminOverview?.generatedImages ?? 0} Icon={ImageIcon} tone="lime" />
        <MetricCard label="Ensaios totais" value={adminOverview?.totalShoots ?? 0} Icon={Camera} tone="gold" />
        <MetricCard label="Logs com erro" value={adminOverview?.failedLogs ?? 0} Icon={ShieldCheck} tone="violet" />
        <MetricCard label="Usuarios bloqueados" value={adminOverview?.blockedUsers ?? 0} Icon={Users} tone="gold" />
        <MetricCard label="Provider ativo" value={adminOverview?.activeProvider ?? "mock"} Icon={BarChart3} tone="cyan" />
        <MetricCard label="Acoes de credito" value="Admin" Icon={WalletCards} tone="lime" />
      </div>
      <Card className="mt-6 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-slate-400"><tr><th className="p-3">Tipo</th><th className="p-3">Item</th><th className="p-3">Status</th><th className="p-3">Detalhe</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-t border-line"><td className="p-3">Log</td><td className="p-3">{log.provider}/{log.model}</td><td className="p-3"><StatusBadge tone={log.status === "success" ? "good" : log.status === "pending" ? "warn" : "bad"}>{log.status}</StatusBadge></td><td className="p-3 text-slate-400">{log.error_message || `${log.credits_charged} creditos - custo ${money(log.cost_estimate)}`}</td></tr>)}</tbody></table></Card>
      <Card className="mt-6 overflow-x-auto"><h2 className="mb-4 text-lg font-semibold">Transacoes de credito</h2><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-slate-400"><tr><th className="p-3">Tipo</th><th className="p-3">Valor</th><th className="p-3">Descricao</th><th className="p-3">Data</th></tr></thead><tbody>{transactions.map((tx) => <tr key={tx.id} className="border-t border-line"><td className="p-3">{tx.type}</td><td className="p-3">{tx.amount}</td><td className="p-3 text-slate-400">{tx.description}</td><td className="p-3 text-slate-400">{new Date(tx.created_at).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></Card>
      <Card className="mt-6"><h2 className="text-lg font-semibold">Settings</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{["active_provider: mock", "credits_per_image: 1", "max_reference_images: 5", "max_upload_size_mb: 10", "community_discount_percentage: 30", "public_credit_price: configurable"].map((item) => <div key={item} className="rounded-lg border border-line bg-ink p-3 text-sm text-slate-300">{item}</div>)}</div></Card>
    </>
  );
}

export function LoadingState() {
  return <div className="rounded-lg border border-line bg-panel p-8 text-sm text-slate-400">Carregando PhotoForge AI...</div>;
}

function LoadErrorState({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-8 text-sm leading-6 text-red-100">Nao foi possivel carregar os dados do app. Detalhe: {message}</div>;
}
