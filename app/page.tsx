import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { LandingPage } from "@/components/home/LandingPage";

async function getUserData() {
  try {
    const cookieStore = await cookies();
    const supabase    = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const [profileRes, genCountRes] = await Promise.all([
      supabase.from("users").select("plan, username, persona, genres").eq("id", user.id).single(),
      supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", new Date().toISOString().split("T")[0]),
    ]);

    const plan   = profileRes.data?.plan ?? "free";
    const limits: Record<string, number> = { free: 5, creator: 99999, pro: 99999 };

    return {
      user,
      plan,
      username:   profileRes.data?.username,
      dailyUsed:  genCountRes.count ?? 0,
      dailyLimit: limits[plan] ?? 5,
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const userData = await getUserData();
  return <LandingPage userData={userData} />;
}
