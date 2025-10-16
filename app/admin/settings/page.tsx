import { createAdminClient } from "@/lib/supabase/admin"
import AdminSettings from "@/components/admin-settings"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const supabase = createAdminClient()

  // Get all settings
  const { data: settings } = await supabase.from("admin_settings").select("*").order("setting_key")

  // Get banned users
  const { data: bannedUsers } = await supabase.from("banned_users").select("*").order("banned_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
          <p className="text-gray-600 mt-2">Configure app settings and control features</p>
        </div>

        <AdminSettings initialSettings={settings || []} initialBannedUsers={bannedUsers || []} />
      </div>
    </div>
  )
}
