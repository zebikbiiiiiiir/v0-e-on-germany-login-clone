"use client"

import { useEffect, useState } from "react"
import AdminSettings from "@/components/admin-settings"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState([])
  const [bannedIps, setBannedIps] = useState([])
  const [tablesExist, setTablesExist] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/admin/settings/data")

        if (!response.ok) {
          console.error("[v0] Settings API returned error:", response.status)
          setTablesExist(false)
          setLoading(false)
          return
        }

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          console.error("[v0] Settings API returned non-JSON response")
          setTablesExist(false)
          setLoading(false)
          return
        }

        const data = await response.json()

        setSettings(data.settings || [])
        setBannedIps(data.bannedIps || [])
        setTablesExist(data.tablesExist !== false)
      } catch (error) {
        console.error("[v0] Failed to fetch settings data:", error)
        setSettings([])
        setBannedIps([])
        setTablesExist(false)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!tablesExist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="max-w-3xl w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-red-500">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">⚠️ Database Setup Required</h1>
              <p className="text-xl text-gray-600">
                The admin settings cannot load because required database tables are missing
              </p>
            </div>

            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-bold text-red-900 mb-3">Missing Tables:</h2>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-red-800">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <code className="bg-red-200 px-2 py-1 rounded font-mono text-sm">admin_settings</code>
                </li>
                <li className="flex items-center gap-2 text-red-800">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <code className="bg-red-200 px-2 py-1 rounded font-mono text-sm">banned_ips</code>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Setup Instructions
              </h2>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Copy the SQL setup script</p>
                    <p className="text-sm text-gray-600">Click the button below to copy the complete setup script</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Open Supabase Dashboard</p>
                    <p className="text-sm text-gray-600">Navigate to your project's SQL Editor</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Run the SQL script</p>
                    <p className="text-sm text-gray-600">Paste the script and click "Run" to create the tables</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    4
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">Refresh this page</p>
                    <p className="text-sm text-gray-600">Come back here and reload to access the settings</p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  const sqlScript = `-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;

INSERT INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES
  ('telegram_bot_token', '', 'string', 'Telegram bot token for notifications'),
  ('telegram_chat_id', '', 'string', 'Telegram chat ID for notifications'),
  ('sms_enabled', 'true', 'boolean', 'Enable/disable SMS verification'),
  ('maintenance_mode', 'false', 'boolean', 'Enable/disable maintenance mode'),
  ('auto_approve_sms', 'false', 'boolean', 'Auto-approve all SMS verifications'),
  ('auto_decline_timeout', '40', 'number', 'Auto-decline timeout in seconds'),
  ('custom_alert', '', 'string', 'Custom alert message for users'),
  ('webhook_url', '', 'string', 'Webhook URL for notifications')
ON CONFLICT (setting_key) DO NOTHING;

-- Create banned_ips table (simplified ban system)
CREATE TABLE IF NOT EXISTS banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT UNIQUE NOT NULL,
  reason TEXT,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE banned_ips DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_banned_ips_lookup ON banned_ips(ip_address, is_active);`

                  try {
                    await navigator.clipboard.writeText(sqlScript)
                    alert("✅ SQL script copied to clipboard! Now paste it in Supabase SQL Editor.")
                  } catch (error) {
                    alert("❌ Failed to copy. Please copy manually from scripts/014_simplify_ban_system.sql")
                  }
                }}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span className="text-lg">Copy SQL Setup Script</span>
              </button>

              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span className="text-lg">Open Supabase Dashboard</span>
              </a>

              <Link
                href="/admin"
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-lg">Back to Admin Dashboard</span>
              </Link>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>💡 Note:</strong> The SQL script is also available in your project at{" "}
                <code className="bg-yellow-200 px-1 rounded">scripts/014_simplify_ban_system.sql</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

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

        <AdminSettings initialSettings={settings} initialBannedIps={bannedIps} tablesExist={tablesExist} />
      </div>
    </div>
  )
}
