"use server"

import { createClient } from "@supabase/supabase-js"

export async function confirmUserEmail(userId: string) {
  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Update user to mark email as confirmed
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (error) {
      console.error("[v0] Error confirming email:", error)
      return { success: false, error: error.message }
    }

    console.log("[v0] Email confirmed successfully for user:", userId)
    return { success: true }
  } catch (error) {
    console.error("[v0] Exception confirming email:", error)
    return { success: false, error: "Failed to confirm email" }
  }
}
