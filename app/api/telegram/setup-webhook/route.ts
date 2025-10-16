import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 })
    }

    // Get the webhook URL from the request or construct it
    const { webhookUrl } = await request.json()

    if (!webhookUrl) {
      return NextResponse.json({ error: "webhookUrl is required in request body" }, { status: 400 })
    }

    // Set the webhook with Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`

    const response = await fetch(telegramApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["callback_query"],
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      console.error("[v0] Failed to set webhook:", data)
      return NextResponse.json({ error: "Failed to set webhook", details: data }, { status: 500 })
    }

    console.log("[v0] Webhook configured successfully:", webhookUrl)

    return NextResponse.json({
      success: true,
      message: "Webhook configured successfully",
      webhookUrl,
      telegramResponse: data,
    })
  } catch (error) {
    console.error("[v0] Error setting up webhook:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

// GET endpoint to check current webhook status
export async function GET() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 })
    }

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/getWebhookInfo`

    const response = await fetch(telegramApiUrl)
    const data = await response.json()

    return NextResponse.json({
      success: true,
      webhookInfo: data.result,
    })
  } catch (error) {
    console.error("[v0] Error getting webhook info:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
