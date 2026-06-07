import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

  if (profile?.role !== "admin" || profile?.status !== "active") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const [
    usersRes,
    creditsRes,
    imagesRes,
    shootsRes,
    failedLogsRes,
    blockedUsersRes,
    logsRes,
    txRes
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("credits").select("balance"),
    admin.from("generated_images").select("id", { count: "exact", head: true }),
    admin.from("shoots").select("id", { count: "exact", head: true }),
    admin.from("generation_logs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "blocked"),
    admin.from("generation_logs").select("*").order("created_at", { ascending: false }).limit(20),
    admin.from("credit_transactions").select("*").order("created_at", { ascending: false }).limit(30)
  ]);

  const creditsInCirculation = (creditsRes.data ?? []).reduce((sum, row) => sum + Number(row.balance ?? 0), 0);

  return NextResponse.json({
    totalUsers: usersRes.count ?? 0,
    creditsInCirculation,
    generatedImages: imagesRes.count ?? 0,
    totalShoots: shootsRes.count ?? 0,
    failedLogs: failedLogsRes.count ?? 0,
    blockedUsers: blockedUsersRes.count ?? 0,
    activeProvider: process.env.AI_PROVIDER ?? "mock",
    logs: logsRes.data ?? [],
    transactions: txRes.data ?? []
  });
}
