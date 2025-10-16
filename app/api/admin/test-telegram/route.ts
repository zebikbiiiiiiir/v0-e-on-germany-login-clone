import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()

    // Check if user is authenticated and is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get Telegram settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("*")
      .in("key", ["telegram_bot_token", "telegram_chat_id"])

    const botToken = settings?.find((s) => s.key === "telegram_bot_token")?.value
    const chatId = settings?.find((s) => s.key === "telegram_chat_id")?.value

    if (!botToken || !chatId) {
      return NextResponse.json({ error: "Telegram credentials not configured" }, { status: 400 })
    }

    // Send test message
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ Test message from E.ON Admin Panel\n\nYour Telegram bot is configured correctly!",
        parse_mode: "HTML",
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to send Telegram message")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error testing Telegram:", error)
    return NextResponse.json({ error: "Failed to send test message" }, { status: 500 })
  }
}
