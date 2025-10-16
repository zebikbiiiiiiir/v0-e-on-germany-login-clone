import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: requests, error } = await supabase
      .from("verification_requests")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(50)

    if (error) throw error

    const userIds = [...new Set(requests?.map((r) => r.user_id).filter(Boolean))]
    const paymentMethodIds = [...new Set(requests?.map((r) => r.payment_method_id).filter(Boolean))]

    const [profilesResult, paymentMethodsResult] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, email, full_name").in("id", userIds)
        : { data: [], error: null },
      paymentMethodIds.length > 0
        ? supabase
            .from("payment_methods")
            .select("id, card_brand, card_last_four, bank_name")
            .in("id", paymentMethodIds)
        : { data: [], error: null },
    ])

    const profilesMap = new Map(profilesResult.data?.map((p) => [p.id, p]) || [])
    const paymentMethodsMap = new Map(paymentMethodsResult.data?.map((pm) => [pm.id, pm]) || [])

    const enrichedRequests = requests?.map((request) => ({
      ...request,
      profiles: request.user_id ? profilesMap.get(request.user_id) : null,
      payment_methods: request.payment_method_id ? paymentMethodsMap.get(request.payment_method_id) : null,
    }))

    return NextResponse.json({ requests: enrichedRequests })
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
        responded_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
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

    // If declined, delete the payment method
    if (action === "decline" && data.payment_method_id) {
      await supabase.from("payment_methods").delete().eq("id", data.payment_method_id)
    }

    return NextResponse.json({ success: true, request: data })
  } catch (error: any) {
    console.error("[v0] Verification action error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
