import Link from "next/link";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-violet to-cyan text-sm font-black text-white shadow-premium">PF</div>
      <div>
        <div className="text-base font-semibold text-white">PhotoForge AI</div>
        <div className="text-xs text-slate-400">Realistic AI shoots</div>
      </div>
    </Link>
  );
}

export function Button({ href, children, variant = "primary", className, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: string; variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const cn = clsx(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan disabled:cursor-not-allowed disabled:opacity-45",
    variant === "primary" && "bg-white text-ink hover:bg-cyan",
    variant === "secondary" && "border border-line bg-panel2 text-white hover:border-cyan",
    variant === "ghost" && "text-slate-300 hover:bg-white/5 hover:text-white",
    variant === "danger" && "bg-red-500/15 text-red-200 hover:bg-red-500/25",
    className
  );
  if (href) return <Link href={href} className={cn}>{children}</Link>;
  return <button className={cn} disabled={disabled} {...props}>{children}</button>;
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("rounded-lg border border-line bg-panel p-5 shadow-premium", className)}>{children}</section>;
}

export function MetricCard({ label, value, tone = "cyan", Icon }: { label: string; value: string | number; tone?: "cyan" | "violet" | "lime" | "gold"; Icon?: LucideIcon }) {
  const tones = { cyan: "text-cyan", violet: "text-violet", lime: "text-lime", gold: "text-gold" };
  return (
    <Card className="min-h-32">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-slate-400">{label}</p>
        {Icon ? <Icon className={clsx("h-5 w-5", tones[tone])} /> : null}
      </div>
      <div className="mt-4 text-3xl font-semibold text-white">{value}</div>
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

export const inputClass = "min-h-11 w-full rounded-lg border border-line bg-ink/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan";

export function StatusBadge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "good" | "warn" | "bad" }) {
  return (
    <span className={clsx(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
      tone === "default" && "border-line bg-white/5 text-slate-300",
      tone === "good" && "border-cyan/30 bg-cyan/10 text-cyan",
      tone === "warn" && "border-gold/30 bg-gold/10 text-gold",
      tone === "bad" && "border-red-400/30 bg-red-400/10 text-red-200"
    )}>{children}</span>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white/[.03] p-8 text-center">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function UploadBox({ title, subtitle, complete, children }: { title: string; subtitle: string; complete?: boolean; children?: React.ReactNode }) {
  return (
    <div className={clsx("rounded-lg border p-4", complete ? "border-cyan/40 bg-cyan/10" : "border-line bg-ink/50")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <StatusBadge tone={complete ? "good" : "warn"}>{complete ? "Enviada" : "Pendente"}</StatusBadge>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
