import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Informe um e-mail valido." }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (error) {
      return NextResponse.json({ error: "Nao foi possivel verificar o e-mail agora." }, { status: 500 });
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    return NextResponse.json({
      exists: Boolean(user),
      confirmed: Boolean(user?.email_confirmed_at)
    });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel verificar o e-mail agora." }, { status: 500 });
  }
}
