import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("[v0] Telegram callback received:", body)

    // Extract callback data from Telegram update
    const callbackQuery = body.callback_query
    if (!callbackQuery) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const callbackData = callbackQuery.data
    const [action, verificationRequestId] = callbackData.split("_")

    if (!action || !verificationRequestId) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const supabase = await createClient()

    // Update verification request status
    const newStatus = action === "approve" ? "approved" : "declined"
    const { error } = await supabase
      .from("verification_requests")
      .update({ status: newStatus })
      .eq("id", verificationRequestId)

    if (error) {
      console.error("[v0] Failed to update verification request:", error)
      return NextResponse.json({ success: false }, { status: 500 })
    }

    console.log(`[v0] Verification request ${verificationRequestId} ${newStatus}`)

    // Answer the callback query to remove loading state in Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (botToken) {
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
          text: action === "approve" ? "✅ Approved" : "❌ Declined",
        }),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Telegram callback error:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
