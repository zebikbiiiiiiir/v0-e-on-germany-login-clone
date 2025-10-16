import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    console.log("[v0] GET /api/admin/settings - Fetching settings...")
    const supabase = createAdminClient()
    const { data: settings, error } = await supabase.from("admin_settings").select("*")

    if (error) {
      console.error("[v0] Get settings error:", error)
      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error: "admin_settings table does not exist",
            message: "Please run the SQL script: scripts/012_create_admin_settings.sql",
          },
          { status: 500 },
        )
      }
      throw error
    }

    console.log("[v0] Settings fetched successfully:", settings?.length || 0, "settings")
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("[v0] Get settings error:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("[v0] PUT /api/admin/settings - Updating settings...")
    const { settings } = await request.json()
    const supabase = createAdminClient()

    if (!settings || typeof settings !== "object") {
      console.error("[v0] Invalid settings format:", settings)
      return NextResponse.json({ error: "Invalid settings format" }, { status: 400 })
    }

    console.log("[v0] Settings to update:", Object.keys(settings))

    const results = []
    for (const [key, value] of Object.entries(settings)) {
      console.log(`[v0] Updating setting: ${key} = ${value}`)

      const { data, error } = await supabase
        .from("admin_settings")
        .upsert(
          {
            setting_key: key,
            setting_value: value as string,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "setting_key",
          },
        )
        .select()

      if (error) {
        console.error(`[v0] Failed to update setting ${key}:`, error)
        if (error.code === "42P01") {
          return NextResponse.json(
            {
              error: "admin_settings table does not exist",
              message: "Please run the SQL script: scripts/012_create_admin_settings.sql",
            },
            { status: 500 },
          )
        }
        results.push({ key, success: false, error: error.message })
      } else {
        console.log(`[v0] Successfully updated setting ${key}:`, data)
        results.push({ key, success: true })
      }
    }

    const failedUpdates = results.filter((r) => !r.success)
    if (failedUpdates.length > 0) {
      console.error("[v0] Some settings failed to update:", failedUpdates)
      return NextResponse.json(
        {
          success: false,
          message: `Failed to update ${failedUpdates.length} settings`,
          results,
        },
        { status: 500 },
      )
    }

    console.log("[v0] All settings updated successfully")
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("[v0] Update settings error:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
