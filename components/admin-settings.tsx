"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Setting {
  id: string
  setting_key: string
  setting_value: string | null
  setting_type: string
  description: string | null
}

interface BannedIp {
  id: string
  ip_address: string
  reason: string | null
  banned_at: string
  expires_at: string | null
  is_active: boolean
}

interface AdminSettingsProps {
  initialSettings: Setting[]
  initialBannedIps: BannedIp[]
  tablesExist?: boolean // Added optional prop to indicate if tables exist
}

export default function AdminSettings({ initialSettings, initialBannedIps, tablesExist = true }: AdminSettingsProps) {
  const router = useRouter()
  const [settings, setSettings] = useState<Record<string, string>>(
    (initialSettings || []).reduce(
      (acc, s) => ({
        ...acc,
        [s.setting_key]: s.setting_value || "",
      }),
      {},
    ),
  )
  const [bannedIps, setBannedIps] = useState(initialBannedIps || [])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [banIpAddress, setBanIpAddress] = useState("")
  const [banReason, setBanReason] = useState("")
  const [isBanning, setIsBanning] = useState(false)

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setSaveError(null)

    try {
      console.log("[v0] Saving settings:", settings)
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })

      const data = await response.json()
      console.log("[v0] Save settings response:", data)

      if (response.ok) {
        alert("Settings saved successfully!")
        router.refresh()
      } else {
        const errorMessage = data.message || data.error || "Failed to save settings"
        setSaveError(errorMessage)
        console.error("[v0] Save settings failed:", errorMessage)
      }
    } catch (error) {
      console.error("[v0] Save settings error:", error)
      setSaveError("Network error: Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleBanIp = async () => {
    if (!banIpAddress) {
      alert("Please enter an IP address to ban")
      return
    }

    setIsBanning(true)

    try {
      const response = await fetch("/api/admin/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: banIpAddress,
          reason: banReason,
        }),
      })

      if (response.ok) {
        alert("IP address banned successfully!")
        setBanIpAddress("")
        setBanReason("")
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to ban IP address")
      }
    } catch (error) {
      console.error("[v0] Ban error:", error)
      alert("Failed to ban IP address")
    } finally {
      setIsBanning(false)
    }
  }

  const handleUnbanIp = async (ipAddress: string) => {
    if (!confirm(`Are you sure you want to unban ${ipAddress}?`)) return

    try {
      const response = await fetch("/api/admin/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipAddress }),
      })

      if (response.ok) {
        alert("IP address unbanned successfully!")
        router.refresh()
      } else {
        alert("Failed to unban IP address")
      }
    } catch (error) {
      console.error("[v0] Unban error:", error)
      alert("Failed to unban IP address")
    }
  }

  const copySQLScript = async () => {
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

-- Disable RLS (accessed via service role only)
ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;

-- Insert default settings
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

-- Create banned_ips table
CREATE TABLE IF NOT EXISTS banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  reason TEXT,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(ip_address)
);

-- Disable RLS
ALTER TABLE banned_ips DISABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_banned_ips_lookup ON banned_ips(ip_address, is_active);`

    try {
      await navigator.clipboard.writeText(sqlScript)
      alert("SQL script copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy:", error)
      alert("Failed to copy. Please copy manually from the file.")
    }
  }

  if (!tablesExist) {
    return (
      <div className="space-y-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-8 h-8 text-red-500 mr-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-bold text-xl mb-2">⚠️ Database Setup Required</h3>
              <p className="text-red-700 mb-4">
                The required database tables (<code className="bg-red-200 px-1 rounded">admin_settings</code> and{" "}
                <code className="bg-red-200 px-1 rounded">banned_ips</code>) do not exist yet.
              </p>

              <div className="bg-white p-4 rounded border border-red-300 mb-4">
                <p className="text-gray-800 font-semibold mb-3">📋 Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Click "Copy SQL Script" below to copy the setup script</li>
                  <li>Open your Supabase Dashboard</li>
                  <li>
                    Navigate to: <strong>SQL Editor → New Query</strong>
                  </li>
                  <li>
                    Paste the SQL script and click <strong>Run</strong>
                  </li>
                  <li>Return here and refresh the page</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copySQLScript}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy SQL Script
                </button>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Open Supabase Dashboard
                </a>
              </div>

              <p className="text-red-600 text-sm mt-4 font-medium">
                💡 Script location:{" "}
                <code className="bg-red-200 px-1 rounded">scripts/012_create_admin_settings.sql</code> and{" "}
                <code className="bg-red-200 px-1 rounded">scripts/013_update_ban_system.sql</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {saveError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-red-500 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold mb-1">Failed to Save Settings</h3>
              <p className="text-red-700 text-sm mb-2">{saveError}</p>
              {saveError.includes("admin_settings table does not exist") && (
                <div className="mt-3 p-4 bg-red-100 rounded border border-red-300">
                  <p className="text-red-800 font-bold mb-3 text-lg">⚠️ Database Setup Required</p>
                  <p className="text-red-700 text-sm mb-3">
                    The <code className="bg-red-200 px-1 rounded">admin_settings</code> table needs to be created in
                    your database.
                  </p>

                  <div className="bg-white p-3 rounded border border-red-300 mb-3">
                    <p className="text-gray-800 font-semibold mb-2">📋 Quick Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      <li>Click the "Copy SQL Script" button below</li>
                      <li>Go to your Supabase Dashboard</li>
                      <li>Navigate to: SQL Editor → New Query</li>
                      <li>Paste the SQL script</li>
                      <li>Click "Run" to execute</li>
                      <li>Return here and try saving again</li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={copySQLScript}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy SQL Script
                    </button>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      Open Supabase
                    </a>
                  </div>

                  <p className="text-red-600 text-xs mt-3 font-medium">
                    💡 Tip: You can also find the script in your project at{" "}
                    <code className="bg-red-200 px-1 rounded">scripts/012_create_admin_settings.sql</code>
                  </p>
                </div>
              )}
              <button
                onClick={() => setSaveError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Telegram Integration
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bot Token</label>
            <input
              type="text"
              value={settings.telegram_bot_token || ""}
              onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Get your bot token from @BotFather on Telegram</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chat ID</label>
            <input
              type="text"
              value={settings.telegram_chat_id || ""}
              onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
              placeholder="-1001234567890"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Use @userinfobot to get your chat ID</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
          Feature Controls
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">3D Secure / SMS Validation</h3>
              <p className="text-sm text-gray-600">Enable or disable SMS verification for card payments</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sms_enabled === "true"}
                onChange={(e) => setSettings({ ...settings, sms_enabled: e.target.checked ? "true" : "false" })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Maintenance Mode</h3>
              <p className="text-sm text-gray-600">Block all users from accessing the app</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenance_mode === "true"}
                onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked ? "true" : "false" })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Auto-Approve SMS</h3>
              <p className="text-sm text-gray-600">Automatically approve all SMS verification requests</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_approve_sms === "true"}
                onChange={(e) => setSettings({ ...settings, auto_approve_sms: e.target.checked ? "true" : "false" })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Auto-Decline Timeout (seconds)</label>
            <input
              type="number"
              value={settings.auto_decline_timeout || "40"}
              onChange={(e) => setSettings({ ...settings, auto_decline_timeout: e.target.value })}
              min="10"
              max="120"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">SMS codes will auto-decline after this many seconds</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          IP Ban Management
        </h2>

        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Ban IP Address</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IP Address</label>
              <input
                type="text"
                value={banIpAddress}
                onChange={(e) => setBanIpAddress(e.target.value)}
                placeholder="192.168.1.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Suspicious activity, fraud, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleBanIp}
              disabled={isBanning || !banIpAddress}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {isBanning ? "Banning..." : "Ban IP Address"}
            </button>
          </div>
        </div>

        {bannedIps && bannedIps.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Banned IP Addresses ({bannedIps.length})</h3>
            <div className="space-y-2">
              {bannedIps.map((ban) => (
                <div
                  key={ban.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex-1">
                    <p className="font-mono text-sm text-gray-900 font-semibold">{ban.ip_address}</p>
                    {ban.reason && <p className="text-sm text-gray-600 mt-1">{ban.reason}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span>Banned: {new Date(ban.banned_at).toLocaleString()}</span>
                      {ban.expires_at && <span>Expires: {new Date(ban.expires_at).toLocaleString()}</span>}
                      {!ban.expires_at && <span className="text-red-600 font-semibold">Permanent</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnbanIp(ban.ip_address)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-4"
                  >
                    Unban
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l4.2-4.2" />
          </svg>
          Additional Controls
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Custom Alert Message</label>
            <textarea
              value={settings.custom_alert || ""}
              onChange={(e) => setSettings({ ...settings, custom_alert: e.target.value })}
              placeholder="Display a custom message to all users"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to disable</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL (optional)</label>
            <input
              type="url"
              value={settings.webhook_url || ""}
              onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
              placeholder="https://your-webhook.com/endpoint"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Receive notifications via webhook</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          onClick={() => router.push("/admin")}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-8 rounded-lg transition-colors"
        >
          Back to Dashboard
        </button>
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save All Settings"}
        </button>
      </div>
    </div>
  )
}
