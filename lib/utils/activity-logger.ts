export async function logUserActivity(userId: string, activityType: string, metadata?: Record<string, any>) {
  try {
    const response = await fetch("/api/log-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, activityType, metadata }),
    })

    if (!response.ok) {
      console.error("[v0] Activity logging failed:", await response.text())
    }
  } catch (error) {
    console.error("[v0] Activity logging error:", error)
  }
}
