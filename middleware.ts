import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/app", "/admin"];
const authPages = ["/login", "/register", "/forgot-password"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  type CookieToSet = {
    name: string;
    value: string;
    options?: Parameters<typeof response.cookies.set>[2];
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  if (!user && isProtected && !(demoMode && (pathname === "/app" || pathname.startsWith("/app/")))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && authPages.includes(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/app/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role,status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin" || profile?.status !== "active") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/app/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/login", "/register", "/forgot-password"]
};
