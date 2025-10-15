import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        *,
        payment_methods (count),
        bills (count),
        user_activity_log (
          activity_type,
          created_at,
          ip_address,
          location_info,
          browser_info,
          device_info,
          risk_score,
          flagged
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ users: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
