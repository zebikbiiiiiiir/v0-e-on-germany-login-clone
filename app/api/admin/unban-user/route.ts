import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    const supabase = createAdminClient()

    const { error } = await supabase.from("banned_users").delete().eq("user_id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Unban user error:", error)
    return NextResponse.json({ error: "Failed to unban user" }, { status: 500 })
  }
}
