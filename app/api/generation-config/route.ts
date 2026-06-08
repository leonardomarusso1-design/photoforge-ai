import { NextResponse } from "next/server";
import { creditsPerImageForProvider, isRealProvider, normalizeProviderName, quantityOptionsForProvider } from "@/lib/ai/providerRules";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("user_id", user.id)
    .maybeSingle();

  const provider = normalizeProviderName(process.env.AI_PROVIDER ?? "mock");
  const realProvider = isRealProvider(provider);
  const realAiEnabledForAdmin = realProvider && profile?.role === "admin" && profile?.status === "active" && process.env.ALLOW_REAL_AI_FOR_ADMIN === "true";
  const effectiveProvider = realAiEnabledForAdmin ? provider : "mock";

  return NextResponse.json({
    provider,
    effectiveProvider,
    isRealProvider: realProvider,
    realAiEnabledForAdmin,
    quantityOptions: quantityOptionsForProvider(effectiveProvider),
    creditsPerImage: creditsPerImageForProvider(effectiveProvider)
  });
}
