import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const protectedPrefixes = [
  "/dashboard", "/invoices", "/products", "/pricing", "/customers",
  "/suppliers", "/expenses", "/payments", "/reports", "/settings",
];

function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

function redirectWithCookies(url: URL, response: NextResponse) {
  const redirect = NextResponse.redirect(url);

  // Session refreshes and removals are written to `response` by Supabase.
  // Keep those Set-Cookie headers when returning a redirect response.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));

  return redirect;
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  let user = null;
  let invalidSession = false;

  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    invalidSession = Boolean(error);
  } catch {
    // A malformed or expired auth cookie must not make the middleware fail.
    invalidSession = true;
  }

  if (invalidSession) {
    request.cookies.getAll()
      .filter(({ name }) => isSupabaseAuthCookie(name))
      .forEach(({ name }) => {
        request.cookies.set(name, "");
        response.cookies.set(name, "", { path: "/", maxAge: 0 });
      });
  }

  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return redirectWithCookies(loginUrl, response);
  }
  if ((request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register") && user) {
    return redirectWithCookies(new URL("/dashboard", request.url), response);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
