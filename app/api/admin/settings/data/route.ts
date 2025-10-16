import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    let settings = []
    let bannedIps = []
    let tablesExist = true

    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from("admin_settings")
        .select("*")
        .order("setting_key")

      if (settingsError) {
        if (settingsError.code === "PGRST205" || settingsError.code === "42P01") {
          console.log("[v0] admin_settings table does not exist")
          tablesExist = false
        } else {
          console.error("[v0] Settings error:", settingsError.message)
        }
      } else {
        settings = settingsData || []
      }
    } catch (err) {
      console.error("[v0] Settings query failed:", err)
      tablesExist = false
    }

    try {
      const { data: bannedData, error: bannedError } = await supabase
        .from("banned_ips")
        .select("*")
        .eq("is_active", true)
        .order("banned_at", { ascending: false })

      if (bannedError) {
        if (bannedError.code === "PGRST205" || bannedError.code === "42P01") {
          console.log("[v0] banned_ips table does not exist")
        } else {
          console.error("[v0] Banned IPs error:", bannedError.message)
        }
      } else {
        bannedIps = bannedData || []
      }
    } catch (err) {
      console.error("[v0] Banned IPs query failed:", err)
    }

    return NextResponse.json({
      settings,
      bannedIps,
      tablesExist,
    })
  } catch (error) {
    console.error("[v0] Error fetching settings data:", error)
    return NextResponse.json(
      {
        settings: [],
        bannedIps: [],
        tablesExist: false,
      },
      { status: 200 },
    )
  }
}
