import { AppShell } from "@/components/AppShell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" || profile?.status !== "active") {
    redirect("/app/dashboard");
  }

  return <AppShell>{children}</AppShell>;
}
