import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { ipAddress, reason } = await request.json()

    if (!ipAddress) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("banned_ips")
      .upsert(
        {
          ip_address: ipAddress,
          reason: reason || "No reason provided",
          is_active: true,
        },
        {
          onConflict: "ip_address",
        },
      )
      .select()
      .single()

    if (error) {
      console.error("[v0] Ban error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[v0] Ban error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
