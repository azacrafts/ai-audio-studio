import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Standard server client — used in API routes and Server Components
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Safe to ignore from Server Components
          }
        },
      },
    }
  );
}

// Service-role client — used in webhook handlers (bypasses RLS)
export async function createServiceClient() {
  const cookieStore = await cookies();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return createServerClient(
    supabaseUrl!,
    (serviceKey ?? supabaseKey)!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
