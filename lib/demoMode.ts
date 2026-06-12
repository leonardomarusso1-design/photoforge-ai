export const demoUserId = "demo-user";
export const demoEmail = "demo@photoforge.ai";
export const demoPassword = "photoforge123";

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function activateDemoMode() {
  if (typeof document === "undefined" || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return;
  document.cookie = "photoforge-demo=1; path=/; max-age=604800; samesite=lax";
  window.localStorage.setItem("photoforge-demo", "1");
}
