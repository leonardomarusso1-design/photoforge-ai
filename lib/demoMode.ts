export const demoUserId = "demo-user";
export const demoEmail = "demo@photoforge.ai";
export const demoPassword = "photoforge123";

export function isDemoFeatureEnabled() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function isDemoMode() {
  if (!isDemoFeatureEnabled()) return false;
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "true") return true;
  if (params.get("demo") === "false") return false;

  return document.cookie.includes("photoforge-demo=1") || window.localStorage.getItem("photoforge-demo") === "1";
}

export function isDemoRequestUrl(url: URL) {
  return isDemoFeatureEnabled() && url.searchParams.get("demo") === "true";
}

export function withDemoParam(href: string) {
  if (!isDemoMode()) return href;
  if (!href.startsWith("/app")) return href;
  const [path, hash = ""] = href.split("#");
  const separator = path.includes("?") ? "&" : "?";
  const nextPath = path.includes("demo=true") ? path : `${path}${separator}demo=true`;
  return hash ? `${nextPath}#${hash}` : nextPath;
}

export function activateDemoMode() {
  if (typeof document === "undefined" || !isDemoFeatureEnabled()) return;
  document.cookie = "photoforge-demo=1; path=/; max-age=604800; samesite=lax";
  window.localStorage.setItem("photoforge-demo", "1");
}
