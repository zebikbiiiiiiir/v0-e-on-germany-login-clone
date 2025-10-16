import { type NextRequest, NextResponse } from "next/server"

// The ban system requires the banned_ips table which may not exist yet
export async function POST(request: NextRequest) {
  try {
    // Always return not banned - ban system is optional
    // If you want to enable banning, run the SQL script: scripts/014_simplify_ban_system.sql
    return NextResponse.json({ isBanned: false })
  } catch (error) {
    return NextResponse.json({ isBanned: false })
  }
}
