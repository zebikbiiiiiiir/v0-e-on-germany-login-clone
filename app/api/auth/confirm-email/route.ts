import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

async function confirmUserWithRetry(supabaseAdmin: any, userId: string, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[SERVER][v0] Attempting to confirm user (attempt ${attempt}/${maxRetries})...`)

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      })

      if (error) {
        if (error.message.includes("User not found") && attempt < maxRetries) {
          // User not found yet, wait and retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Max 5 seconds
          console.log(`[SERVER][v0] User not found, retrying in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
        throw error
      }

      console.log(`[SERVER][v0] User confirmed successfully on attempt ${attempt}`)
      return { data, error: null }
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
    }
  }

  throw new Error("Failed to confirm user after maximum retries")
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`[SERVER][v0] Confirming email for user: ${userId}`)

    // Create Supabase admin client with service role
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await confirmUserWithRetry(supabaseAdmin, userId)

    if (error) {
      console.error("[SERVER][v0] Email confirmation error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[SERVER][v0] Email confirmed successfully")
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[SERVER][v0] Confirm email API error:", error.message)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
