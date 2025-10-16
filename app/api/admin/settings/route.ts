import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data: settings, error } = await supabase.from("admin_settings").select("*")

    if (error) throw error

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("[v0] Get settings error:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { settings } = await request.json()
    const supabase = createAdminClient()

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings format" }, { status: 400 })
    }

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      const { error } = await supabase.from("admin_settings").upsert(
        {
          setting_key: key,
          setting_value: value as string,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "setting_key",
        },
      )

      if (error) {
        console.error(`[v0] Failed to update setting ${key}:`, error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Update settings error:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
