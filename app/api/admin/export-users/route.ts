import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Fetch related data for each user
    const usersWithData = await Promise.all(
      profiles.map(async (profile) => {
        const { data: paymentMethods } = await supabase.from("payment_methods").select("*").eq("user_id", profile.id)

        const { data: bills } = await supabase.from("bills").select("*").eq("user_id", profile.id)

        const { data: activityLog } = await supabase
          .from("user_activity_log")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1)

        return {
          ...profile,
          payment_methods: paymentMethods || [],
          bills: bills || [],
          user_activity_log: activityLog || [],
        }
      }),
    )

    // Convert to CSV
    const csv = convertToCSV(usersWithData)

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString()}.csv"`,
      },
    })
  } catch (error: any) {
    console.error("[v0] Export users error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return ""

  const headers = [
    "ID",
    "Email",
    "Full Name",
    "Account Number",
    "Created At",
    "Payment Methods",
    "Bills",
    "Last Activity",
  ]
  const rows = data.map((user) => [
    user.id,
    user.email,
    user.full_name,
    user.account_number,
    user.created_at,
    user.payment_methods?.length || 0,
    user.bills?.length || 0,
    user.user_activity_log?.[0]?.created_at || "N/A",
  ])

  return [headers, ...rows].map((row) => row.join(",")).join("\n")
}
