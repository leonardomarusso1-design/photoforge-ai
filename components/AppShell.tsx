"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Camera, ChevronDown, GalleryHorizontal, Headphones, History, LayoutDashboard, LogOut, Plus, Settings, Shield, Sparkles, User, Users, WalletCards } from "lucide-react";
import { Button, Logo, StatusBadge } from "@/components/ui";
import { isDemoMode, withDemoParam } from "@/lib/demoMode";
import { loadState as loadDemoState } from "@/lib/demoStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const navGroups = [
  {
    title: "Principal",
    items: [
      { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/shoots/new", label: "Novo ensaio", icon: Plus }
    ]
  },
  {
    title: "Producao",
    items: [
      { href: "/app/clients", label: "Clientes", icon: Users },
      { href: "/app/shoots", label: "Ensaios", icon: Camera },
      { href: "/app/templates", label: "Templates", icon: Sparkles },
      { href: "/app/gallery", label: "Galeria", icon: GalleryHorizontal }
    ]
  },
  {
    title: "Negocio",
    items: [
      { href: "/app/credits", label: "Creditos", icon: WalletCards },
      { href: "/app/results", label: "Resultados", icon: BarChart3 },
      { href: "/app/history", label: "Historico", icon: History }
    ]
  },
  {
    title: "Conta",
    items: [
      { href: "/app/settings", label: "Configuracoes", icon: Settings },
      { href: "/app/support", label: "Suporte", icon: Headphones }
    ]
  }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function loadRole() {
      if (isDemoMode()) {
        const demoState = loadDemoState();
        setProfile(demoState.profile);
        setCredits(demoState.credits.balance);
        setIsAdmin(false);
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      const { data: creditData } = await supabase.from("credits").select("balance").eq("user_id", user.id).maybeSingle();
      setProfile(data as Profile | null);
      setCredits(creditData?.balance ?? 0);
      setIsAdmin(data?.role === "admin" && data?.status === "active");
    }
    loadRole();
  }, []);

  async function logout() {
    if (isDemoMode()) {
      window.location.href = "/";
      return;
    }
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const displayName = profile?.name || profile?.email?.split("@")[0] || "Usuario";
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PF";
  const plan = isDemoMode() ? "Demo" : profile?.role === "admin" ? "Admin" : profile?.plan_type === "community" || profile?.plan_type === "Comunidade" ? "Comunidade" : profile?.plan_type === "pro" || profile?.plan_type === "Pro" ? "Pro" : "Publico";
  const visibleGroups = navGroups.filter((group) => group.items.length > 0);
  const mobileItems = visibleGroups.flatMap((group) => group.items).slice(0, 9);

  return (
    <div className="min-h-screen bg-ink text-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/[.08] bg-[linear-gradient(180deg,rgba(16,19,27,.98),rgba(7,9,14,.98))] p-5 lg:block">
        <Logo />
        <Button href="/app/shoots/new" className="mt-7 w-full"><Plus className="h-4 w-4" /> Criar novo ensaio</Button>
        <nav className="premium-scrollbar mt-7 grid max-h-[calc(100vh-300px)] gap-5 overflow-y-auto pr-1">
          {visibleGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase text-steel">{group.title}</p>
              <div className="grid gap-1">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={withDemoParam(item.href)} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "border border-champagne/45 bg-champagne/[.12] text-white shadow-glow" : "border border-transparent text-steel hover:border-white/10 hover:bg-white/[.045] hover:text-white"}`}>
                      <span className={`grid h-8 w-8 place-items-center rounded-lg border ${active ? "border-champagne/35 bg-champagne/15 text-champagne" : "border-white/10 bg-white/[.03] text-steel group-hover:text-cyan"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        {isAdmin && (
          <Link href="/admin" className="group mt-4 flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm text-steel transition hover:border-white/10 hover:bg-white/[.045] hover:text-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[.03] text-steel group-hover:text-cyan">
              <Shield className="h-4 w-4" />
            </span>
            Admin
          </Link>
        )}
        <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-champagne/[.18] bg-ink/85 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-sm text-steel">Creditos disponiveis</span>
            <StatusBadge tone={(credits ?? 0) > 0 ? "good" : "warn"}>{credits ?? 0}</StatusBadge>
          </div>
          <p className="mt-3 text-xs leading-5 text-steel">Use o saldo para gerar imagens e acompanhar margem por ensaio.</p>
          {isAdmin || process.env.NODE_ENV === "development" ? <p className="mt-3 text-xs text-slate-500">Provider ativo: mock</p> : null}
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-white/[.08] bg-ink/[.86] px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden"><Logo /></div>
            <div className="hidden lg:block">
              <div className="flex items-center gap-3"><p className="text-sm text-steel">Operacao de ensaios IA, creditos e entrega em um fluxo unico.</p>{isDemoMode() ? <StatusBadge tone="warn">Modo demo ativo</StatusBadge> : null}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 rounded-lg border border-white/10 bg-panel2/75 px-3 py-2 shadow-soft md:flex">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt={displayName} className="h-9 w-9 rounded-full border border-white/10 object-cover" /> : <div className="grid h-9 w-9 place-items-center rounded-full border border-champagne/25 bg-champagne text-sm font-semibold text-ink">{initials}</div>}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <Link href={withDemoParam("/app/credits")} className="flex items-center gap-1 text-xs text-steel transition hover:text-champagne">
                    <WalletCards className="h-3.5 w-3.5" />
                    {credits ?? 0} crédito{(credits ?? 0) !== 1 ? "s" : ""}
                  </Link>
                </div>
              </div>
              <Button href="/app/shoots/new"><Plus className="h-4 w-4" /> Novo ensaio</Button>
              <div className="relative">
                <Button variant="ghost" onClick={() => setMenuOpen((open) => !open)} title="Menu"><ChevronDown className="h-4 w-4" /></Button>
                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-white/10 bg-panel p-2 shadow-premium">
                    <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-steel hover:bg-white/5 hover:text-white" href={withDemoParam("/app/settings")}><User className="h-4 w-4" /> Minha conta</Link>
                    <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-steel hover:bg-white/5 hover:text-white" href={withDemoParam("/app/credits")}><WalletCards className="h-4 w-4" /> Creditos</Link>
                    <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-steel hover:bg-white/5 hover:text-white" href={withDemoParam("/app/support")}><Headphones className="h-4 w-4" /> Suporte</Link>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-200 hover:bg-red-500/10" onClick={logout}><LogOut className="h-4 w-4" /> Sair</button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="premium-scrollbar mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {isDemoMode() ? <StatusBadge tone="warn">Modo demo ativo</StatusBadge> : null}
            {mobileItems.map((item) => <Button key={item.href} href={item.href} variant="ghost">{item.label}</Button>)}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-7 md:px-8">{children}</main>
      </div>
    </div>
  );
}
