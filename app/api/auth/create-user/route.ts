import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Create admin client
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[SERVER][v0] Creating user with admin API...")

    // Create user with email already confirmed (bypasses email sending)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Mark email as confirmed immediately
      user_metadata: {
        email_confirmed: true,
      },
    })

    if (error) {
      console.error("[SERVER][v0] User creation error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log("[SERVER][v0] User created successfully:", data.user.id)

    return NextResponse.json({ user: data.user })
  } catch (error: any) {
    console.error("[SERVER][v0] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
