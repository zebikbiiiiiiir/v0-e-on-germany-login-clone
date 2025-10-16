import { type NextRequest, NextResponse } from "next/server"
import { getVerificationStatus } from "../send-verification/route.tsx"

export async function GET(request: NextRequest) {
  try {
    const verificationRequestId = request.nextUrl.searchParams.get("id")

    console.log("[v0] Checking status for:", verificationRequestId)

    if (!verificationRequestId) {
      return NextResponse.json({ error: "Missing verification request ID" }, { status: 400 })
    }

    const verification = getVerificationStatus(verificationRequestId)

    if (!verification) {
      console.log("[v0] Verification not found in store")
      return NextResponse.json({ error: "Verification request not found" }, { status: 404 })
    }

    console.log("[v0] Verification status:", verification.status)

    return NextResponse.json({
      status: verification.status,
      responded_at: verification.status !== "pending" ? new Date().toISOString() : null,
    })
  } catch (error) {
    console.error("[v0] Check status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
