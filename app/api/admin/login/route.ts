import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const supabase = await createClient()

    // Sign in the user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    // Check if user is admin
    const { data: adminUser } = await supabase.from("admin_users").select("*").eq("user_id", data.user.id).single()

    if (!adminUser) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: "Not authorized as admin" }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Admin login error:", error)
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 })
  }
}
