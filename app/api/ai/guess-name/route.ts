import { generateText } from "ai"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  let email = ""
  let username = ""

  try {
    const body = await request.json()
    email = body.email
    username = body.username

    if (!email && !username) {
      return NextResponse.json({ error: "Email or username required" }, { status: 400 })
    }

    const usernameToAnalyze = username || email.split("@")[0]

    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `Based on this email username: "${usernameToAnalyze}", guess the person's real full name. 
      
Rules:
- If the username contains clear name parts (like "john.doe" or "sarasmith"), extract and format them properly
- If it's random characters or numbers, generate a realistic name that could match the pattern
- Return ONLY the full name in proper case (First Last), nothing else
- Make it sound natural and realistic
- If the username suggests a specific culture/region, use appropriate names

Username: ${usernameToAnalyze}
Full Name:`,
      maxTokens: 50,
    })

    const guessedName = text.trim()

    return NextResponse.json({
      username: usernameToAnalyze,
      guessedName,
      confidence: calculateConfidence(usernameToAnalyze, guessedName),
    })
  } catch (error) {
    console.error("[v0] AI name guessing error:", error)
    const usernameToAnalyze = username || (email ? email.split("@")[0] : "user")
    const fallbackName = extractNameFromUsername(usernameToAnalyze)

    return NextResponse.json({
      username: usernameToAnalyze,
      guessedName: fallbackName,
      confidence: "low",
    })
  }
}

function calculateConfidence(username: string, guessedName: string): "high" | "medium" | "low" {
  const lowerUsername = username.toLowerCase()
  const lowerName = guessedName.toLowerCase()

  // High confidence if username clearly contains name parts
  if (
    lowerUsername.includes(".") ||
    lowerUsername.includes("_") ||
    lowerName.split(" ").some((part) => lowerUsername.includes(part.toLowerCase()))
  ) {
    return "high"
  }

  // Medium confidence if username has letters (not just numbers)
  if (/[a-z]/i.test(username) && username.length > 4) {
    return "medium"
  }

  return "low"
}

function extractNameFromUsername(username: string): string {
  // Simple fallback: capitalize first letter and format
  const cleaned = username.replace(/[0-9_.-]/g, " ").trim()
  const parts = cleaned.split(" ").filter(Boolean)

  if (parts.length >= 2) {
    return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ")
  }

  // Single word username
  const capitalized = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase()
  return `${capitalized} User`
}
