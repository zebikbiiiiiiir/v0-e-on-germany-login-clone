import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const bin = searchParams.get("bin")

  if (!bin || bin.length < 6) {
    return NextResponse.json({ error: "Invalid BIN" }, { status: 400 })
  }

  const apiKey = "HAS-0YYRXxQgdvMzHL9u9184D"
  const url = `https://data.handyapi.com/bin/${bin}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    })

    if (!response.ok) {
      console.log("[v0] HandyAPI error:", response.status, response.statusText)
      return NextResponse.json({ error: "BIN lookup failed" }, { status: response.status })
    }

    const data = await response.json()
    console.log("[v0] HandyAPI response:", JSON.stringify(data))

    const transformedData = {
      bank: data.Issuer
        ? {
            name: data.Issuer,
            city: data.Country?.Name || null,
            country: data.Country?.Name || null,
          }
        : null,
      brand: data.Scheme || "Unknown",
      type: data.Type || "Unknown",
      level: data.CardTier || null,
      country: data.Country
        ? {
            name: data.Country.Name,
            code: data.Country.A2,
          }
        : null,
    }

    console.log("[v0] Transformed data:", JSON.stringify(transformedData))
    return NextResponse.json(transformedData)
  } catch (error) {
    console.error("[v0] BIN lookup error:", error)
    return NextResponse.json({ error: "BIN lookup failed" }, { status: 500 })
  }
}
