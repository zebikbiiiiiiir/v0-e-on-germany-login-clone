import { createClient } from "@/lib/supabase/server"
import { detectIPInfo, parseUserAgent } from "./ip-detection"

export async function trackVisitor(request: Request, userId?: string) {
  try {
    const supabase = await createClient()

    // Get IP address
    const forwarded = request.headers.get("x-forwarded-for")
    const realIP = request.headers.get("x-real-ip")
    const ip = forwarded?.split(",")[0] || realIP || "unknown"

    // Get user agent
    const userAgent = request.headers.get("user-agent") || "unknown"
    const { browser, browserVersion, os, deviceType } = parseUserAgent(userAgent)

    // Get IP info (will be null for local/reserved IPs in development)
    let ipData = null
    try {
      ipData = await detectIPInfo(ip !== "unknown" ? ip : undefined)
    } catch (error) {
      // Silently skip IP detection for local/reserved IPs
    }

    // Get page URL and referrer
    const url = new URL(request.url)
    const pageUrl = url.pathname + url.search
    const referrer = request.headers.get("referer") || null

    // Generate session ID
    const sessionId = crypto.randomUUID()

    try {
      const { error } = await supabase.from("visitor_tracking").insert({
        ip_address: ip,
        country: ipData?.country || null,
        country_code: ipData?.countryCode || null,
        region: ipData?.regionName || null,
        city: ipData?.city || null,
        latitude: ipData?.lat || null,
        longitude: ipData?.lon || null,
        timezone: ipData?.timezone || null,
        isp: ipData?.isp || null,
        browser,
        browser_version: browserVersion,
        os,
        device_type: deviceType,
        user_agent: userAgent,
        page_url: pageUrl,
        referrer,
        session_id: sessionId,
        user_id: userId || null,
      })

      if (error) {
        // Check if it's a "table not found" error
        if (
          error.message?.includes("not found") ||
          error.message?.includes("does not exist") ||
          error.message?.includes("schema cache")
        ) {
          // Table doesn't exist yet - silently skip tracking
          return null
        }
        // Log other errors
        console.error("[v0] Visitor tracking error:", error.message)
      }
    } catch (insertError) {
      // Silently fail if table doesn't exist
      return null
    }

    return sessionId
  } catch (error) {
    // Silently fail for any tracking errors
    return null
  }
}
