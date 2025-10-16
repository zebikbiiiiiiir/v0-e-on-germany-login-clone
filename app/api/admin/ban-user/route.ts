import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { email, reason } = await request.json()
    const supabase = createAdminClient()

    // Find user by email
    const { data: user } = await supabase.from("profiles").select("id, email").eq("email", email).single()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Ban user
    const { error } = await supabase.from("banned_users").insert({
      user_id: user.id,
      email: user.email,
      reason: reason || null,
    })

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return NextResponse.json({ error: "User is already banned" }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Ban user error:", error)
    return NextResponse.json({ error: "Failed to ban user" }, { status: 500 })
  }
}
