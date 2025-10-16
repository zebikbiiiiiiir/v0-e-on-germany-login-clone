import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { ip, userAgent, userId } = await request.json()

    if (!ip && !userAgent && !userId) {
      return NextResponse.json({ isBanned: false, bans: [] })
    }

    const supabase = createAdminClient()

    const { data: bans, error } = await supabase
      .from("banned_entities")
      .select("*")
      .eq("is_active", true)
      .or(`ban_value.eq.${ip},ban_value.eq.${userAgent},ban_value.eq.${userId}`)

    if (error) {
      console.error("[v0] Check ban error:", error)
      return NextResponse.json({ isBanned: false, bans: [] })
    }

    const activeBans =
      bans?.filter((ban) => {
        if (!ban.expires_at) return true // Permanent ban
        return new Date(ban.expires_at) > new Date()
      }) || []

    const isBanned = activeBans.length > 0

    return NextResponse.json({ isBanned, bans: activeBans })
  } catch (error: any) {
    console.error("[v0] Check ban error:", error)
    return NextResponse.json({ isBanned: false, bans: [] })
  }
}
