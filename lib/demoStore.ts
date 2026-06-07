"use client";

import { defaultDemoState } from "@/lib/demoData";
import type { Client, CreditTransaction, DemoState, GeneratedImage, GenerationLog, ReferencePhoto, Shoot, ShootStatus } from "@/lib/types";

const key = "photoforge-ai-demo-state";

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function loadState(): DemoState {
  if (typeof window === "undefined") return defaultDemoState;
  const raw = window.localStorage.getItem(key);
  if (!raw) return defaultDemoState;
  try {
    return JSON.parse(raw) as DemoState;
  } catch {
    return defaultDemoState;
  }
}

export function saveState(state: DemoState) {
  window.localStorage.setItem(key, JSON.stringify(state));
}

export function resetState() {
  saveState(defaultDemoState);
}

export function upsertClient(state: DemoState, client: Client) {
  const exists = state.clients.some((item) => item.id === client.id);
  return { ...state, clients: exists ? state.clients.map((item) => (item.id === client.id ? client : item)) : [client, ...state.clients] };
}

export function upsertShoot(state: DemoState, shoot: Shoot) {
  const exists = state.shoots.some((item) => item.id === shoot.id);
  return { ...state, shoots: exists ? state.shoots.map((item) => (item.id === shoot.id ? shoot : item)) : [shoot, ...state.shoots] };
}

export function addReferencePhotos(state: DemoState, photos: ReferencePhoto[]) {
  return { ...state, referencePhotos: [...photos, ...state.referencePhotos] };
}

export function addGenerationResult(state: DemoState, shoot: Shoot, images: GeneratedImage[], log: GenerationLog) {
  const completed: ShootStatus = "completed";
  const transaction: CreditTransaction = {
    id: uid("tx"),
    user_id: state.profile.user_id,
    type: "usage",
    amount: -shoot.quantity,
    description: `Geracao do ensaio ${shoot.title}`,
    related_shoot_id: shoot.id,
    created_at: new Date().toISOString()
  };
  const nextCredits = {
    ...state.credits,
    balance: state.credits.balance - shoot.quantity,
    total_used: state.credits.total_used + shoot.quantity,
    updated_at: new Date().toISOString()
  };
  return {
    ...state,
    shoots: state.shoots.map((item) => (item.id === shoot.id ? { ...shoot, status: completed, credits_used: shoot.quantity, updated_at: new Date().toISOString() } : item)),
    generatedImages: [...images, ...state.generatedImages],
    generationLogs: [log, ...state.generationLogs],
    credits: nextCredits,
    creditTransactions: [
      transaction,
      ...state.creditTransactions
    ]
  };
}
