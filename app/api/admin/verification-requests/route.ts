import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ requests: data })
  } catch (error: any) {
    console.error("[v0] Verification requests error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { requestId, action, adminNotes } = await request.json()
    const supabase = createAdminClient()

    const status = action === "approve" ? "approved" : "declined"

    const { data, error } = await supabase
      .from("verification_requests")
      .update({
        status,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select()
      .single()

    if (error) throw error

    // If approved, update payment method
    if (action === "approve" && data.payment_method_id) {
      await supabase
        .from("payment_methods")
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq("id", data.payment_method_id)
    }

    return NextResponse.json({ success: true, request: data })
  } catch (error: any) {
    console.error("[v0] Verification action error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
