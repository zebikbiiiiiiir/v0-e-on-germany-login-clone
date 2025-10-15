import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    console.log("[v0] Admin setup started for:", email)

    const supabase = await createClient()

    // Check if any admin users already exist
    const { count, error: countError } = await supabase.from("admin_users").select("*", { count: "exact", head: true })

    if (countError) {
      console.error("[v0] Error checking admin count:", countError)
      throw new Error(`Failed to check admin users: ${countError.message}`)
    }

    if (count && count > 0) {
      console.log("[v0] Admin already exists, count:", count)
      return NextResponse.json({ error: "Admin account already exists" }, { status: 400 })
    }

    console.log("[v0] No admins exist, creating first admin...")

    const createUserResponse = await fetch(`${request.nextUrl.origin}/api/auth/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!createUserResponse.ok) {
      const errorData = await createUserResponse.json()
      console.error("[v0] Failed to create user:", errorData)
      throw new Error(errorData.error || "Failed to create user account")
    }

    const { userId } = await createUserResponse.json()
    console.log("[v0] User created with ID:", userId)

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName,
    })

    if (profileError) {
      console.error("[v0] Profile creation error:", profileError)
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    console.log("[v0] Profile created/updated")

    // Create admin user entry
    const { error: adminError } = await supabase.from("admin_users").insert({
      user_id: userId,
      role: "super_admin",
      permissions: {
        manage_users: true,
        manage_bills: true,
        manage_payments: true,
        view_analytics: true,
        export_data: true,
        manage_admins: true,
      },
    })

    if (adminError) {
      console.error("[v0] Admin user creation error:", adminError)
      throw new Error(`Failed to create admin entry: ${adminError.message}`)
    }

    console.log("[v0] Admin user entry created")

    // Sign in the user
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      console.error("[v0] Sign in error:", signInError)
      throw new Error(`Failed to sign in: ${signInError.message}`)
    }

    console.log("[v0] Admin setup completed successfully")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Admin setup error:", error)
    return NextResponse.json({ error: error.message || "Setup failed. Please try again." }, { status: 500 })
  }
}
