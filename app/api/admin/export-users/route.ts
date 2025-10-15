import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: users, error } = await supabase.from("profiles").select(`
        *,
        payment_methods (*),
        bills (*),
        user_activity_log (*)
      `)

    if (error) throw error

    // Convert to CSV
    const csv = convertToCSV(users)

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString()}.csv"`,
      },
    })
  } catch (error: any) {
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
