import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profileRes, tokenRes, subsRes, countRes] = await Promise.all([
    supabase
      .from("users")
      .select("plan, platform, content_type, goal")
      .eq("id", user.id)
      .single(),

    supabase
      .from("tokens")
      .select("balance")
      .eq("user_id", user.id)
      .single(),

    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),

    supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", new Date().toISOString().split("T")[0]),
  ]);

  const plan = profileRes.data?.plan ?? "free";
  const dailyLimits: Record<string, number> = {
    free:    5,
    creator: 99999,
    pro:     99999,
  };

  return NextResponse.json({
    id: user.id,
    email: user.email,
    plan,
    platform: profileRes.data?.platform,
    contentType: profileRes.data?.content_type,
    goal: profileRes.data?.goal,
    tokenBalance: tokenRes.data?.balance ?? 0,
    dailyGenerationsUsed: countRes.count ?? 0,
    dailyLimit: dailyLimits[plan] ?? 5,
    subscription: subsRes.data ?? null,
  });
}
