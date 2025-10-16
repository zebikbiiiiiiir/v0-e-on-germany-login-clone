import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (profilesError) throw profilesError

    // Fetch related data separately for each user
    const usersWithData = await Promise.all(
      profiles.map(async (profile) => {
        // Get payment methods count
        const { count: paymentMethodsCount } = await supabase
          .from("payment_methods")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id)

        // Get bills count
        const { count: billsCount } = await supabase
          .from("bills")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id)

        // Get recent activity
        const { data: activityLog } = await supabase
          .from("user_activity_log")
          .select(
            "activity_type, created_at, ip_address, location_info, browser_info, device_info, risk_score, flagged",
          )
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(10)

        return {
          ...profile,
          payment_methods_count: paymentMethodsCount || 0,
          bills_count: billsCount || 0,
          user_activity_log: activityLog || [],
        }
      }),
    )

    return NextResponse.json({ users: usersWithData })
  } catch (error: any) {
    console.error("[v0] Users API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
