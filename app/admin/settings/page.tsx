import { createAdminClient } from "@/lib/supabase/admin"
import AdminSettings from "@/components/admin-settings"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  const supabase = createAdminClient()

  // Get all settings
  const { data: settings } = await supabase.from("admin_settings").select("*").order("setting_key")

  const { data: bannedEntities } = await supabase
    .from("banned_entities")
    .select("*")
    .eq("is_active", true)
    .order("banned_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Zurück zum Dashboard</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
          <p className="text-gray-600 mt-2">Configure app settings and control features</p>
        </div>

        <AdminSettings initialSettings={settings || []} initialBannedEntities={bannedEntities || []} />
      </div>
    </div>
  )
}
