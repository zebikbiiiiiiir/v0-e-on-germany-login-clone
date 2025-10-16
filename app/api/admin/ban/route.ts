import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { banType, banValue, reason, expiresIn } = await request.json()

    const supabase = createAdminClient()

    // Calculate expiry date if provided (in hours)
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString() : null

    const { data, error } = await supabase
      .from("banned_entities")
      .upsert(
        {
          ban_type: banType,
          ban_value: banValue,
          reason,
          expires_at: expiresAt,
          is_active: true,
        },
        {
          onConflict: "ban_type,ban_value",
        },
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[v0] Ban error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
