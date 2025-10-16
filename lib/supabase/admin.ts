import { createClient } from "@supabase/supabase-js"

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error("[v0] Missing SUPABASE_URL environment variable")
    throw new Error("Missing Supabase URL")
  }

  if (!supabaseServiceKey) {
    console.error("[v0] Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
    throw new Error("Missing Supabase service role key")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
