import Link from "next/link";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { withDemoParam } from "@/lib/demoMode";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-champagne/30 bg-gradient-to-br from-champagne via-gold to-[#c9a227] text-sm font-black text-ink shadow-glow transition group-hover:scale-[1.02]">PF</div>
      <div>
        <div className="text-base font-semibold text-white">PhotoForge AI</div>
        <div className="text-xs text-steel">Estudio digital com IA</div>
      </div>
    </Link>
  );
}

export function Button({ href, children, variant = "primary", className, disabled, target, rel, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: string; variant?: "primary" | "secondary" | "ghost" | "danger"; target?: string; rel?: string }) {
  const cn = clsx(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-champagne/60 disabled:cursor-not-allowed disabled:opacity-45",
    variant === "primary" && "border border-champagne/70 bg-champagne text-ink shadow-glow hover:-translate-y-px hover:bg-gold",
    variant === "secondary" && "border border-line bg-panel2/90 text-white shadow-soft hover:-translate-y-px hover:border-cyan/60 hover:bg-white/[.07]",
    variant === "ghost" && "border border-transparent text-steel hover:border-white/10 hover:bg-white/[.05] hover:text-white",
    variant === "danger" && "border border-red-400/25 bg-red-500/[.12] text-red-100 hover:border-red-300/45 hover:bg-red-500/20",
    className
  );
  const isExternal = typeof href === "string" && (href.startsWith("http://") || href.startsWith("https://"));
  if (href) return <Link href={isExternal ? href : withDemoParam(href)} className={cn} target={target} rel={rel ?? (isExternal ? "noopener noreferrer" : undefined)}>{children}</Link>;
  return <button className={cn} disabled={disabled} {...props}>{children}</button>;
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("rounded-lg border border-white/[.09] bg-[linear-gradient(180deg,rgba(23,27,37,.92),rgba(12,15,22,.96))] p-5 shadow-soft transition duration-200", className)}>{children}</section>;
}

export function MetricCard({ label, value, tone = "cyan", Icon, featured = false }: { label: string; value: string | number; tone?: "cyan" | "violet" | "lime" | "gold"; Icon?: LucideIcon; featured?: boolean }) {
  const tones = { cyan: "text-cyan", violet: "text-violet", lime: "text-lime", gold: "text-champagne" };
  const borders = { cyan: "hover:border-cyan/45", violet: "hover:border-violet/45", lime: "hover:border-lime/45", gold: "hover:border-champagne/45" };
  return (
    <Card className={clsx("min-h-32 overflow-hidden hover:-translate-y-0.5", borders[tone], featured && "border-champagne/35 bg-[linear-gradient(135deg,rgba(244,213,141,.16),rgba(16,19,27,.95)_46%,rgba(45,212,191,.08))] shadow-glow md:col-span-2")}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase text-steel">{label}</p>
        {Icon ? <span className="rounded-lg border border-white/10 bg-white/[.04] p-2"><Icon className={clsx("h-4 w-4", tones[tone])} /></span> : null}
      </div>
      <div className={clsx("mt-4 font-semibold text-white", featured ? "text-5xl" : "text-3xl")}>{value}</div>
    </Card>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const inputClass = "min-h-11 w-full rounded-lg border border-line bg-ink/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan focus:bg-ink";

export function StatusBadge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "good" | "warn" | "bad" }) {
  return (
    <span className={clsx(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
      tone === "default" && "border-white/10 bg-white/[.04] text-steel",
      tone === "good" && "border-cyan/25 bg-cyan/10 text-cyan",
      tone === "warn" && "border-champagne/30 bg-champagne/10 text-champagne",
      tone === "bad" && "border-red-400/30 bg-red-400/10 text-red-100"
    )}>{children}</span>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/[.025] p-8 text-center">
      <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-champagne/70" />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-steel">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function UploadBox({ title, subtitle, complete, children }: { title: string; subtitle: string; complete?: boolean; children?: React.ReactNode }) {
  return (
    <div className={clsx("rounded-lg border p-4 transition hover:-translate-y-0.5 hover:border-cyan/40", complete ? "border-cyan/35 bg-cyan/10" : "border-white/10 bg-ink/55")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-steel">{subtitle}</p>
        </div>
        <StatusBadge tone={complete ? "good" : "warn"}>{complete ? "Enviada" : "Pendente"}</StatusBadge>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className="text-xs font-semibold uppercase text-champagne">{eyebrow}</p> : null}
      <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">{title}</h2>
      {text ? <p className="mt-3 text-sm leading-6 text-steel">{text}</p> : null}
    </div>
  );
}
