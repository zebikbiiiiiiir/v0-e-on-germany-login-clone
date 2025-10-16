import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminSettingsContent from "@/components/admin-settings-content"

export const metadata: Metadata = {
  title: "Admin Settings - E.ON",
  description: "Configure application settings",
}

export default async function AdminSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Check if user is admin
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (!adminUser) {
    redirect("/dashboard")
  }

  // Fetch current settings
  const { data: settings } = await supabase.from("app_settings").select("*").order("key")

  return <AdminSettingsContent initialSettings={settings || []} />
}
