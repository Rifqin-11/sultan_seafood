import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env vars are configured, check session
  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("placeholder")) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protected dashboard routes
    const isDashboardRoute =
      request.nextUrl.pathname === "/" ||
      request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/invoices") ||
      request.nextUrl.pathname.startsWith("/products") ||
      request.nextUrl.pathname.startsWith("/pricing") ||
      request.nextUrl.pathname.startsWith("/customers") ||
      request.nextUrl.pathname.startsWith("/suppliers") ||
      request.nextUrl.pathname.startsWith("/expenses") ||
      request.nextUrl.pathname.startsWith("/reports") ||
      request.nextUrl.pathname.startsWith("/settings");

    if (isDashboardRoute && !user) {
      // Allow demo viewing if not configured, or redirect to login
      // return NextResponse.redirect(new URL("/login", request.url));
    }

    if (request.nextUrl.pathname === "/login" && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
