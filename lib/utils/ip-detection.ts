// IP detection utility using IP-API Pro
export interface IPData {
  ip: string
  country: string
  countryCode: string
  region: string
  regionName: string
  city: string
  zip: string
  lat: number
  lon: number
  timezone: string
  isp: string
  org: string
  as: string
  query: string
}

export async function detectIPInfo(ip?: string): Promise<IPData | null> {
  try {
    const apiKey = process.env.IP_API_PRO_KEY || "OAquhK3HcHWHEND"
    const targetIP = ip || ""

    if (
      !targetIP ||
      targetIP.toLowerCase() === "unknown" ||
      targetIP.startsWith("127.") ||
      targetIP.startsWith("192.168.") ||
      targetIP.startsWith("10.") ||
      targetIP.startsWith("172.")
    ) {
      console.log("[v0] Skipping IP detection for local/private IP:", targetIP)
      return null
    }

    const url = `https://pro.ip-api.com/json/${targetIP}?key=${apiKey}&fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("[v0] IP-API Pro error:", response.status)
      return null
    }

    const data = await response.json()

    if (data.status === "fail") {
      // Don't log error for reserved ranges (expected in development)
      if (data.message !== "reserved range") {
        console.error("[v0] IP-API Pro failed:", data.message)
      }
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] IP detection error:", error)
    return null
  }
}

export function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase()

  // Detect browser
  let browser = "Unknown"
  let browserVersion = ""

  if (ua.includes("edg/")) {
    browser = "Edge"
    browserVersion = ua.match(/edg\/([\d.]+)/)?.[1] || ""
  } else if (ua.includes("chrome/")) {
    browser = "Chrome"
    browserVersion = ua.match(/chrome\/([\d.]+)/)?.[1] || ""
  } else if (ua.includes("firefox/")) {
    browser = "Firefox"
    browserVersion = ua.match(/firefox\/([\d.]+)/)?.[1] || ""
  } else if (ua.includes("safari/") && !ua.includes("chrome")) {
    browser = "Safari"
    browserVersion = ua.match(/version\/([\d.]+)/)?.[1] || ""
  }

  // Detect OS
  let os = "Unknown"
  if (ua.includes("windows")) os = "Windows"
  else if (ua.includes("mac os")) os = "macOS"
  else if (ua.includes("linux")) os = "Linux"
  else if (ua.includes("android")) os = "Android"
  else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) os = "iOS"

  // Detect device type
  let deviceType = "Desktop"
  if (ua.includes("mobile")) deviceType = "Mobile"
  else if (ua.includes("tablet") || ua.includes("ipad")) deviceType = "Tablet"

  return {
    browser,
    browserVersion,
    os,
    deviceType,
  }
}

export async function getIpData(ip: string) {
  const ipInfo = await detectIPInfo(ip)

  if (!ipInfo) {
    return {
      location: null,
      device: null,
      browser: null,
    }
  }

  // Parse user agent is handled separately, so we just return location info here
  return {
    location: {
      country: ipInfo.country,
      countryCode: ipInfo.countryCode,
      city: ipInfo.city,
      region: ipInfo.regionName,
      lat: ipInfo.lat,
      lon: ipInfo.lon,
      timezone: ipInfo.timezone,
      isp: ipInfo.isp,
    },
    device: null, // Will be populated from user agent
    browser: null, // Will be populated from user agent
  }
}
