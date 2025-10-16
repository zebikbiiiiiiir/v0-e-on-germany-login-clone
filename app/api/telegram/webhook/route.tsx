import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { answerCallbackQuery, editTelegramMessage } from "@/lib/utils/telegram"
import { getVerificationStatus, updateVerificationStatus } from "../send-verification/route.tsx"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] Webhook received:", JSON.stringify(body, null, 2))

    // Handle callback query (button click)
    if (body.callback_query) {
      const { id: callbackQueryId, data: callbackData, message } = body.callback_query
      const chatId = message.chat.id
      const messageId = message.message_id

      console.log("[v0] Callback data:", callbackData)

      const [action, verificationId] = callbackData.split("_")

      if (!action || !verificationId) {
        console.error("[v0] Invalid callback data format:", callbackData)
        await answerCallbackQuery(callbackQueryId, "Invalid request")
        return NextResponse.json({ ok: true })
      }

      console.log("[v0] Action:", action, "Verification ID:", verificationId)

      const verification = getVerificationStatus(verificationId)

      if (!verification) {
        console.error("[v0] Verification not found:", verificationId)
        await answerCallbackQuery(callbackQueryId, "Verification not found")
        return NextResponse.json({ ok: true })
      }

      const newStatus = action === "approve" ? "approved" : "declined"
      const updated = updateVerificationStatus(verificationId, newStatus)

      if (!updated) {
        console.error("[v0] Failed to update verification status")
        await answerCallbackQuery(callbackQueryId, "Update failed")
        return NextResponse.json({ ok: true })
      }

      console.log("[v0] Verification status updated to:", newStatus)

      if (newStatus === "approved") {
        try {
          const supabase = await createClient()
          const { error } = await supabase
            .from("payment_methods")
            .update({
              is_verified: true,
              verified_at: new Date().toISOString(),
            })
            .eq("id", verification.paymentMethodId)

          if (error) {
            console.error("[v0] Database update error:", error)
          } else {
            console.log("[v0] Payment method marked as verified in database")
          }
        } catch (dbError) {
          console.error("[v0] Database error:", dbError)
        }
      }

      // Update Telegram message
      const statusEmoji = newStatus === "approved" ? "✅" : "❌"
      const statusText = newStatus === "approved" ? "APPROVED" : "DECLINED"

      const updatedMessage = `${message.text}\n\n${statusEmoji} <b>Status: ${statusText}</b>\n⏰ <b>Responded:</b> ${new Date().toLocaleString("de-DE")}`

      await editTelegramMessage(chatId, messageId, updatedMessage)

      // Answer callback query
      const responseText = newStatus === "approved" ? "✅ Verification approved!" : "❌ Verification declined"
      await answerCallbackQuery(callbackQueryId, responseText)

      console.log("[v0] Webhook processed successfully")

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ ok: true })
  }
}
