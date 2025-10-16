import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { banType, banValue } = await request.json()

    const supabase = createAdminClient()

    const { error } = await supabase
      .from("banned_entities")
      .update({ is_active: false })
      .eq("ban_type", banType)
      .eq("ban_value", banValue)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Unban error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
