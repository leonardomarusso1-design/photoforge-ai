export const demoUserId = "demo-user";

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
