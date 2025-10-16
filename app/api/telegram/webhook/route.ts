import { type NextRequest, NextResponse } from "next/server"
import { updateVerificationStatus } from "../send-verification/route.tsx"

const TELEGRAM_BOT_TOKEN = "8410913287:AAF6QD3E-BX62n_3DdPIfaHv7652y0nKHIk"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] Telegram webhook received:", JSON.stringify(body, null, 2))

    if (body.callback_query) {
      const callbackData = body.callback_query.data
      const [action, verificationId] = callbackData.split("_")

      console.log("[v0] Callback data:", { action, verificationId })

      if (!verificationId) {
        return NextResponse.json({ ok: true })
      }

      const updated = updateVerificationStatus(verificationId, action === "approve" ? "approved" : "declined")

      if (updated) {
        console.log("[v0] Updated verification status:", action === "approve" ? "approved" : "declined")
      } else {
        console.log("[v0] Verification not found:", verificationId)
      }

      const chatId = body.callback_query.message.chat.id
      const messageId = body.callback_query.message.message_id

      // Remove buttons
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          reply_markup: { inline_keyboard: [] },
        }),
      })

      // Answer callback query
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: body.callback_query.id,
          text: action === "approve" ? "✅ Verification approved!" : "❌ Verification declined",
        }),
      })

      console.log("[v0] Telegram callback handled successfully")
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[v0] Telegram webhook error:", error)
    return NextResponse.json({ ok: true })
  }
}
