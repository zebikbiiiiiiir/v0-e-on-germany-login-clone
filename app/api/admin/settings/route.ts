import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PUT(request: NextRequest) {
  try {
    const { settings } = await request.json()
    const supabase = createAdminClient()

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await supabase
        .from("admin_settings")
        .update({
          setting_value: value as string,
          updated_at: new Date().toISOString(),
        })
        .eq("setting_key", key)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Update settings error:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
