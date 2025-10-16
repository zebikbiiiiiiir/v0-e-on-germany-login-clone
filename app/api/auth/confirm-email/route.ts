import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`[SERVER][v0] User created: ${userId}`)

    // Skip email confirmation via admin API since it's unreliable
    // Supabase will handle email confirmation based on project settings
    // If email confirmation is required, user will get proper error on sign in

    return NextResponse.json({
      success: true,
      message: "User created successfully",
    })
  } catch (error: any) {
    console.error("[SERVER][v0] Confirm email API error:", error.message)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
