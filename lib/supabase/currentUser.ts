import type { SupabaseClient, User } from "@supabase/supabase-js";
import { demoUserId, isDemoMode } from "@/lib/demoMode";
import type { Profile } from "@/lib/types";

function toError(error: unknown, fallback: string) {
  if (error instanceof Error) return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return new Error(error.message);
  }
  return new Error(fallback);
}

export async function getCurrentAuthUser(supabase: SupabaseClient): Promise<User> {
  if (isDemoMode()) {
    return {
      id: demoUserId,
      email: "demo@photoforge.ai",
      user_metadata: { name: "Usuario Demo" },
      app_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString()
    } as User;
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw toError(error, "Sessao invalida. Entre novamente.");
  }

  return user;
}

export async function getCurrentUserId(supabase: SupabaseClient): Promise<string> {
  if (isDemoMode()) return demoUserId;
  const user = await getCurrentAuthUser(supabase);
  return user.id;
}

export async function getCurrentProfile(supabase: SupabaseClient, userId?: string): Promise<Profile | null> {
  const currentUserId = userId ?? (await getCurrentUserId(supabase));
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", currentUserId).maybeSingle();

  if (error) {
    throw toError(error, "Nao foi possivel carregar o perfil do usuario.");
  }

  return data as Profile | null;
}
