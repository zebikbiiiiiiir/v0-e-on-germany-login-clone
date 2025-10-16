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

interface BannedUser {
  id: string
  user_id: string
  email: string
  reason: string | null
  banned_at: string
}

interface AdminSettingsProps {
  initialSettings: Setting[]
  initialBannedUsers: BannedUser[]
}

export default function AdminSettings({ initialSettings, initialBannedUsers }: AdminSettingsProps) {
  const router = useRouter()
  const [settings, setSettings] = useState<Record<string, string>>(
    initialSettings.reduce(
      (acc, s) => ({
        ...acc,
        [s.setting_key]: s.setting_value || "",
      }),
      {},
    ),
  )
  const [bannedUsers, setBannedUsers] = useState(initialBannedUsers)
  const [isSaving, setIsSaving] = useState(false)
  const [banEmail, setBanEmail] = useState("")
  const [banReason, setBanReason] = useState("")
  const [isBanning, setIsBanning] = useState(false)

  const handleSaveSettings = async () => {
    setIsSaving(true)

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })

      if (response.ok) {
        alert("Settings saved successfully!")
        router.refresh()
      } else {
        alert("Failed to save settings")
      }
    } catch (error) {
      console.error("[v0] Save settings error:", error)
      alert("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleBanUser = async () => {
    if (!banEmail) {
      alert("Please enter an email address")
      return
    }

    setIsBanning(true)

    try {
      const response = await fetch("/api/admin/ban-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: banEmail, reason: banReason }),
      })

      if (response.ok) {
        alert("User banned successfully!")
        setBanEmail("")
        setBanReason("")
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to ban user")
      }
    } catch (error) {
      console.error("[v0] Ban user error:", error)
      alert("Failed to ban user")
    } finally {
      setIsBanning(false)
    }
  }

  const handleUnbanUser = async (userId: string) => {
    if (!confirm("Are you sure you want to unban this user?")) return

    try {
      const response = await fetch("/api/admin/unban-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        alert("User unbanned successfully!")
        router.refresh()
      } else {
        alert("Failed to unban user")
      }
    } catch (error) {
      console.error("[v0] Unban user error:", error)
      alert("Failed to unban user")
    }
  }

  return (
    <div className="space-y-8">
      {/* Telegram Settings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Telegram Integration</h2>
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
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Feature Controls</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">3D Secure / SMS Validation</h3>
              <p className="text-sm text-gray-600">Enable or disable SMS verification for card payments</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sms_validation_enabled === "true"}
                onChange={(e) =>
                  setSettings({ ...settings, sms_validation_enabled: e.target.checked ? "true" : "false" })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
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

          <div>
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

      {/* User Ban Management */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">User Ban Management</h2>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Ban User</h3>
          <div className="space-y-3">
            <input
              type="email"
              value={banEmail}
              onChange={(e) => setBanEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Reason for ban (optional)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleBanUser}
              disabled={isBanning || !banEmail}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {isBanning ? "Banning..." : "Ban User"}
            </button>
          </div>
        </div>

        {bannedUsers.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Banned Users ({bannedUsers.length})</h3>
            <div className="space-y-2">
              {bannedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{user.email}</p>
                    {user.reason && <p className="text-sm text-gray-600">{user.reason}</p>}
                    <p className="text-xs text-gray-500">Banned: {new Date(user.banned_at).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleUnbanUser(user.user_id)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Unban
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
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
