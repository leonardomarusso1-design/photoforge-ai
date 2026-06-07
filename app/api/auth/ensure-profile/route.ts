import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { userId, email, name } = (await request.json()) as {
      userId?: string;
      email?: string;
      name?: string;
    };

    const normalizedEmail = email?.trim().toLowerCase();
    if (!userId || !normalizedEmail) {
      return NextResponse.json({ error: "Dados incompletos para criar o perfil." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || userData.user.email?.toLowerCase() !== normalizedEmail) {
      return NextResponse.json({ error: "Usuario nao encontrado no Supabase Auth." }, { status: 404 });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const role = normalizedEmail === adminEmail ? "admin" : "user";

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          name: name?.trim() || userData.user.user_metadata?.name || normalizedEmail.split("@")[0],
          email: normalizedEmail,
          role,
          plan_type: "free",
          status: "active"
        },
        { onConflict: "user_id" }
      );

    if (profileError) {
      return NextResponse.json({ error: "Nao foi possivel criar o perfil do usuario." }, { status: 500 });
    }

    await supabase
      .from("credits")
      .upsert(
        {
          user_id: userId,
          balance: 0,
          total_purchased: 0,
          total_used: 0
        },
        { onConflict: "user_id", ignoreDuplicates: true }
      );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel preparar a conta agora." }, { status: 500 });
  }
}
