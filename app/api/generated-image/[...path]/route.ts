import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
  }

  const { path } = await params;
  const storagePath = path.join("/");
  if (!storagePath || !storagePath.startsWith(`${user.id}/`)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role,status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin" || profile?.status !== "active") {
      return NextResponse.json({ error: "Imagem nao encontrada." }, { status: 404 });
    }
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from("generated-images")
    .createSignedUrl(storagePath, 60 * 5);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Imagem nao encontrada." }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
