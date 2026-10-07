import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/editor"];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function proxy(request: NextRequest) {
  // If Supabase is not configured, just pass through
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const { createServerClient } = await import("@supabase/ssr");

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    // Redirect unauthenticated users away from protected routes
    const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
    if (isProtected && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from the auth page
    if (pathname === "/auth" && user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch {
    // Never crash the proxy — just pass through on any error
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4)$).*)",
  ],
};
