"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Camera, ChevronDown, GalleryHorizontal, Headphones, History, LayoutDashboard, LogOut, Plus, Settings, Shield, Sparkles, User, Users, WalletCards } from "lucide-react";
import { Button, Logo, StatusBadge } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

const nav = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/shoots/new", label: "Novo ensaio", icon: Plus },
  { href: "/app/clients", label: "Clientes", icon: Users },
  { href: "/app/shoots", label: "Ensaios", icon: Camera },
  { href: "/app/templates", label: "Templates", icon: Sparkles },
  { href: "/app/gallery", label: "Galeria", icon: GalleryHorizontal },
  { href: "/app/credits", label: "Creditos", icon: WalletCards },
  { href: "/app/results", label: "Resultados", icon: BarChart3 },
  { href: "/app/history", label: "Historico", icon: History },
  { href: "/app/settings", label: "Configuracoes", icon: Settings },
  { href: "/app/support", label: "Suporte", icon: Headphones },
  { href: "/admin", label: "Admin", icon: Shield }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function loadRole() {
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
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const displayName = profile?.name || profile?.email?.split("@")[0] || "Usuario";
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PF";
  const plan = profile?.role === "admin" ? "Admin" : profile?.plan_type === "community" || profile?.plan_type === "Comunidade" ? "Comunidade" : profile?.plan_type === "pro" || profile?.plan_type === "Pro" ? "Pro" : "Publico";

  return (
    <div className="min-h-screen bg-ink text-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-line bg-panel/95 p-5 lg:block">
        <Logo />
        <Button href="/app/shoots/new" className="mt-7 w-full"><Plus className="h-4 w-4" /> Novo ensaio</Button>
        <nav className="mt-8 grid gap-1">
          {nav.filter((item) => item.href !== "/admin" || isAdmin).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-white text-ink shadow-premium" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-line bg-ink p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Creditos</span>
            <StatusBadge tone={(credits ?? 0) > 0 ? "good" : "warn"}>{credits ?? 0}</StatusBadge>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">Seus creditos controlam quantas imagens podem ser geradas.</p>
          {isAdmin || process.env.NODE_ENV === "development" ? <p className="mt-3 text-xs text-slate-500">Provider ativo: mock</p> : null}
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-line bg-ink/85 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden"><Logo /></div>
            <div className="hidden lg:block">
              <p className="text-sm text-slate-400">Organize clientes, gere ensaios e entregue imagens em menos tempo.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 rounded-lg border border-line bg-panel2 px-3 py-2 md:flex">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt={displayName} className="h-9 w-9 rounded-full border border-white/10 object-cover" /> : <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-semibold text-ink">{initials}</div>}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-slate-400">Plano: {plan} - {credits ?? 0} creditos</p>
                </div>
              </div>
              <Button href="/app/shoots/new"><Plus className="h-4 w-4" /> Novo ensaio</Button>
              <div className="relative">
                <Button variant="ghost" onClick={() => setMenuOpen((open) => !open)} title="Menu"><ChevronDown className="h-4 w-4" /></Button>
                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-line bg-panel p-2 shadow-premium">
                    <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white" href="/app/settings"><User className="h-4 w-4" /> Minha conta</Link>
                    <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white" href="/app/credits"><WalletCards className="h-4 w-4" /> Creditos</Link>
                    <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white" href="/app/support"><Headphones className="h-4 w-4" /> Suporte</Link>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-200 hover:bg-red-500/10" onClick={logout}><LogOut className="h-4 w-4" /> Sair</button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {nav.filter((item) => item.href !== "/admin" || isAdmin).slice(0, 8).map((item) => <Button key={item.href} href={item.href} variant="ghost">{item.label}</Button>)}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
