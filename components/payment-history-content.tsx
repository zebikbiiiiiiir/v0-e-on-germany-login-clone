"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  transaction_id: string
  status: string
  bills: {
    bill_number: string
    bill_type: string
    bill_date: string
  }
}

interface PaymentHistoryContentProps {
  payments: Payment[]
}

export default function PaymentHistoryContent({ payments }: PaymentHistoryContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [filterYear, setFilterYear] = useState<string>("all")

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const getBillTypeText = (type: string) => {
    switch (type) {
      case "electricity":
        return "Strom"
      case "gas":
        return "Gas"
      case "water":
        return "Wasser"
      default:
        return "Sonstiges"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Abgeschlossen"
      case "pending":
        return "Ausstehend"
      case "failed":
        return "Fehlgeschlagen"
      default:
        return status
    }
  }

  // Get unique years from payments
  const years = Array.from(new Set(payments.map((p) => new Date(p.payment_date).getFullYear().toString())))

  const filteredPayments =
    filterYear === "all"
      ? payments
      : payments.filter((p) => new Date(p.payment_date).getFullYear().toString() === filterYear)

  const totalPaid = filteredPayments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <img src="/eon-logo.svg" alt="E.ON Logo" className="h-8" />
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm font-medium text-black hover:text-[#E20015]"
            >
              Übersicht
            </button>
            <button
              onClick={() => router.push("/dashboard/bills")}
              className="text-sm font-medium text-black hover:text-[#E20015]"
            >
              Rechnungen
            </button>
            <button
              onClick={() => router.push("/dashboard/profile")}
              className="text-sm font-medium text-black hover:text-[#E20015]"
            >
              Profil
            </button>
            <button onClick={handleSignOut} className="text-sm font-medium text-gray-600 hover:text-[#E20015]">
              Abmelden
            </button>
          </nav>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-black">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            <nav className="flex flex-col gap-4">
              <button
                onClick={() => {
                  router.push("/dashboard")
                  setMobileMenuOpen(false)
                }}
                className="text-sm font-medium text-black hover:text-[#E20015] text-left"
              >
                Übersicht
              </button>
              <button
                onClick={() => {
                  router.push("/dashboard/bills")
                  setMobileMenuOpen(false)
                }}
                className="text-sm font-medium text-black hover:text-[#E20015] text-left"
              >
                Rechnungen
              </button>
              <button
                onClick={() => {
                  router.push("/dashboard/profile")
                  setMobileMenuOpen(false)
                }}
                className="text-sm font-medium text-black hover:text-[#E20015] text-left"
              >
                Profil
              </button>
              <button
                onClick={() => {
                  handleSignOut()
                  setMobileMenuOpen(false)
                }}
                className="text-sm font-medium text-gray-600 hover:text-[#E20015] text-left"
              >
                Abmelden
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-4xl font-bold text-black mb-8">Zahlungshistorie</h1>

          {/* Stats Card */}
          <div className="bg-[#F5F5F5] rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Gesamtzahlungen</h3>
                <p className="text-3xl font-bold text-black">{filteredPayments.length}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Erfolgreich</h3>
                <p className="text-3xl font-bold text-green-600">
                  {filteredPayments.filter((p) => p.status === "completed").length}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Gesamtbetrag</h3>
                <p className="text-3xl font-bold text-black">€{totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Jahr filtern</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]"
            >
              <option value="all">Alle Jahre</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Payments Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-[#F5F5F5]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Datum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Rechnung</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Typ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Betrag</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Transaktions-ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Keine Zahlungen vorhanden
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(payment.payment_date).toLocaleDateString("de-DE", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-black">{payment.bills.bill_number}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{getBillTypeText(payment.bills.bill_type)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-black">
                          €{Number(payment.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">{payment.transaction_id}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}
                          >
                            {getStatusText(payment.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-600">
          <p>© 2025 E.ON Energie Deutschland GmbH</p>
        </div>
      </footer>
    </div>
  )
}
