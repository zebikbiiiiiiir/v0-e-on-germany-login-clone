import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { ipAddress } = await request.json()

    if (!ipAddress) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from("banned_ips").update({ is_active: false }).eq("ip_address", ipAddress)

    if (error) {
      console.error("[v0] Unban error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Unban error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
