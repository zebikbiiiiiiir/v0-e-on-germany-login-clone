import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { answerCallbackQuery, editTelegramMessage } from "@/lib/utils/telegram"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle callback query (button click)
    if (body.callback_query) {
      const { id: callbackQueryId, data: callbackData, message } = body.callback_query
      const chatId = message.chat.id
      const messageId = message.message_id

      // Parse callback data: "approve:uuid" or "decline:uuid"
      const [action, verificationRequestId] = callbackData.split(":")

      if (!action || !verificationRequestId) {
        await answerCallbackQuery(callbackQueryId, "Invalid request")
        return NextResponse.json({ ok: true })
      }

      const supabase = await createClient()

      // Update verification request status
      const newStatus = action === "approve" ? "approved" : "declined"

      const { data: verificationRequest, error } = await supabase
        .from("verification_requests")
        .update({
          status: newStatus,
          responded_at: new Date().toISOString(),
        })
        .eq("id", verificationRequestId)
        .select()
        .single()

      if (error) {
        console.error("[v0] Database update error:", error)
        await answerCallbackQuery(callbackQueryId, "Database error")
        return NextResponse.json({ ok: true })
      }

      // If approved, mark payment method as verified
      if (newStatus === "approved") {
        await supabase
          .from("payment_methods")
          .update({
            is_verified: true,
            verified_at: new Date().toISOString(),
          })
          .eq("id", verificationRequest.payment_method_id)
      }

      const statusEmoji = newStatus === "approved" ? "✅" : "❌"
      const statusText = newStatus === "approved" ? "APPROVED" : "DECLINED"

      const updatedMessage = `${message.text}\n\n${statusEmoji} <b>Status: ${statusText}</b>\n⏰ <b>Responded:</b> ${new Date().toLocaleString("de-DE")}`

      await editTelegramMessage(chatId, messageId, updatedMessage)

      // Answer callback query
      const responseText = newStatus === "approved" ? "✅ Verification approved!" : "❌ Verification declined"
      await answerCallbackQuery(callbackQueryId, responseText)

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ ok: true })
  }
}
