import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getVerificationStatus, updateVerificationStatus } from "../send-verification/route"

export async function GET() {
  return NextResponse.json({
    status: "Webhook is accessible",
    message: "This endpoint accepts POST requests from Telegram",
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Webhook received:", JSON.stringify(body, null, 2))

    if (!body.callback_query) {
      return NextResponse.json({ ok: true })
    }

    const callbackQuery = body.callback_query
    const callbackData = callbackQuery.data
    const messageId = callbackQuery.message.message_id
    const chatId = callbackQuery.message.chat.id

    // Parse callback data: "approve_v1" or "decline_v1"
    const [action, verificationId] = callbackData.split("_")

    if (!action || !verificationId) {
      console.error("[v0] Invalid callback data format:", callbackData)
      return NextResponse.json({ ok: true })
    }

    console.log("[v0] Processing action:", action, "for verification:", verificationId)

    // Get verification from memory
    const verification = getVerificationStatus(verificationId)

    if (!verification) {
      console.error("[v0] Verification not found:", verificationId)
      return NextResponse.json({ error: "Verification not found" }, { status: 404 })
    }

    // Update status in memory
    const status = action === "approve" ? "approved" : "declined"
    updateVerificationStatus(verificationId, status)

    console.log("[v0] Updated verification status to:", status)

    // If approved, save the payment method to database
    if (action === "approve") {
      const supabase = createAdminClient()

      const { error: updateError } = await supabase
        .from("payment_methods")
        .update({ is_verified: true })
        .eq("id", verification.paymentMethodId)

      if (updateError) {
        console.error("[v0] Error updating payment method:", updateError)
      } else {
        console.log("[v0] Payment method verified in database")
      }
    }

    // Update Telegram message
    const TELEGRAM_BOT_TOKEN = "8410913287:AAF6QD3E-BX62n_3DdPIfaHv7652y0nKHIk"
    const statusEmoji = action === "approve" ? "✅" : "❌"
    const statusText = action === "approve" ? "APPROVED" : "DECLINED"

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `${statusEmoji} ${statusText}`,
                callback_data: "done",
              },
            ],
          ],
        },
      }),
    })

    console.log("[v0] Telegram message updated")

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
