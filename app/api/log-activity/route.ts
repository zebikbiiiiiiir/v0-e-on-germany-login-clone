import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, activityType, metadata } = await request.json()

    // Get IP address
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown"

    // Get user agent
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Fetch IP data from ip-api.pro
    let locationInfo = null
    let browserInfo = null
    let deviceInfo = null
    let riskScore = 0

    if (ip !== "unknown" && process.env.IP_API_PRO_KEY) {
      try {
        const ipResponse = await fetch(`https://pro.ip-api.com/json/${ip}?key=${process.env.IP_API_PRO_KEY}`)
        if (ipResponse.ok) {
          const ipData = await ipResponse.json()
          locationInfo = {
            country: ipData.country,
            countryCode: ipData.countryCode,
            region: ipData.regionName,
            city: ipData.city,
            zip: ipData.zip,
            lat: ipData.lat,
            lon: ipData.lon,
            timezone: ipData.timezone,
            isp: ipData.isp,
            org: ipData.org,
            as: ipData.as,
            mobile: ipData.mobile,
            proxy: ipData.proxy,
            hosting: ipData.hosting,
          }

          // Calculate risk score based on proxy/hosting/mobile
          if (ipData.proxy) riskScore += 40
          if (ipData.hosting) riskScore += 30
          if (ipData.mobile) riskScore += 10
        }
      } catch (error) {
        console.error("[v0] IP API error:", error)
      }
    }

    // Parse user agent for browser and device info
    if (userAgent !== "unknown") {
      const ua = userAgent.toLowerCase()

      // Browser detection
      let browser = "Unknown"
      let browserVersion = ""

      if (ua.includes("firefox/")) {
        browser = "Firefox"
        browserVersion = ua.match(/firefox\/(\d+\.\d+)/)?.[1] || ""
      } else if (ua.includes("edg/")) {
        browser = "Edge"
        browserVersion = ua.match(/edg\/(\d+\.\d+)/)?.[1] || ""
      } else if (ua.includes("chrome/")) {
        browser = "Chrome"
        browserVersion = ua.match(/chrome\/(\d+\.\d+)/)?.[1] || ""
      } else if (ua.includes("safari/")) {
        browser = "Safari"
        browserVersion = ua.match(/version\/(\d+\.\d+)/)?.[1] || ""
      }

      browserInfo = {
        name: browser,
        version: browserVersion,
        userAgent: userAgent,
      }

      // Device detection
      let deviceType = "Desktop"
      let os = "Unknown"

      if (ua.includes("mobile") || ua.includes("android")) {
        deviceType = "Mobile"
      } else if (ua.includes("tablet") || ua.includes("ipad")) {
        deviceType = "Tablet"
      }

      if (ua.includes("windows")) os = "Windows"
      else if (ua.includes("mac")) os = "macOS"
      else if (ua.includes("linux")) os = "Linux"
      else if (ua.includes("android")) os = "Android"
      else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) os = "iOS"

      deviceInfo = {
        type: deviceType,
        os: os,
      }
    }

    // Log to database
    const supabase = await createClient()
    const { error } = await supabase.from("user_activity_log").insert({
      user_id: userId,
      activity_type: activityType,
      ip_address: ip,
      user_agent: userAgent,
      location_info: locationInfo,
      browser_info: browserInfo,
      device_info: deviceInfo,
      risk_score: riskScore,
      flagged: riskScore >= 50,
      metadata: metadata || {},
    })

    if (error) {
      console.error("[v0] Activity log insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Activity logging error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
