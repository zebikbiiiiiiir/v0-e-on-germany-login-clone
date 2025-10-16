"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { usePaymentMethods } from "@/lib/hooks/use-payment-methods"

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  due_date: string
  amount: number
  status: string
  bill_type: string
}

interface Profile {
  full_name: string | null
  email: string
  account_number: string | null
}

interface DashboardContentProps {
  user: User
  profile: Profile | null
  bills: Bill[]
  guessedName?: string | null
}

export default function DashboardContent({ user, profile, bills, guessedName }: DashboardContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { hasPaymentMethod, isLoading: isLoadingPaymentMethods } = usePaymentMethods(user.id)
  const [showSepaNotice, setShowSepaNotice] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false)
  const [animatedBills, setAnimatedBills] = useState<Bill[]>([])

  const generateSampleBills = (): Bill[] => {
    const sampleBills: Bill[] = []
    const now = new Date()

    for (let i = 0; i < 5; i++) {
      const billDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const dueDate = new Date(billDate)
      dueDate.setDate(dueDate.getDate() + 14)

      const amount = (Math.random() * 50 + 95).toFixed(2)

      sampleBills.push({
        id: `temp-${i}`,
        bill_number: `RE${billDate.getFullYear()}${String(billDate.getMonth() + 1).padStart(2, "0")}${Math.floor(Math.random() * 9000 + 1000)}`,
        bill_date: billDate.toISOString(),
        due_date: dueDate.toISOString(),
        amount: Number.parseFloat(amount),
        status: i === 0 ? "pending" : "paid",
        bill_type: "electricity",
      })
    }

    return sampleBills
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push("/")
    }
    setIsSigningOut(false)
  }

  useEffect(() => {
    if (!isLoadingPaymentMethods && !hasPaymentMethod) {
      setShowSepaNotice(true)

      if (bills.length === 0) {
        setIsNewUser(true)
        setShowLoadingAnimation(true)
        setAnimatedBills(generateSampleBills())

        setTimeout(() => {
          setShowLoadingAnimation(false)
        }, 2500)
      }
    }
  }, [hasPaymentMethod, isLoadingPaymentMethods, bills.length])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "Bezahlt"
      case "pending":
        return "Ausstehend"
      case "overdue":
        return "Überfällig"
      case "cancelled":
        return "Storniert"
      default:
        return status
    }
  }

  const displayBills = isNewUser ? animatedBills : bills

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-200 px-6 py-6">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <img src="/eon-logo.svg" alt="E.ON Logo" className="h-10" />
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-[1.4rem] font-medium text-black hover:text-[#E20015]"
            >
              Übersicht
            </button>
            <button
              onClick={() => router.push("/dashboard/bills")}
              className="text-[1.4rem] font-medium text-black hover:text-[#E20015]"
            >
              Rechnungen
            </button>
            <button
              onClick={() => router.push("/dashboard/payments")}
              className="text-[1.4rem] font-medium text-black hover:text-[#E20015]"
            >
              Zahlungen
            </button>
            <button
              onClick={() => router.push("/dashboard/profile")}
              className="text-[1.4rem] font-medium text-black hover:text-[#E20015]"
            >
              Profil
            </button>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="text-[1.4rem] font-medium text-gray-600 hover:text-[#E20015] disabled:opacity-50"
            >
              {isSigningOut ? "Abmelden..." : "Abmelden"}
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
                  router.push("/dashboard/payments")
                  setMobileMenuOpen(false)
                }}
                className="text-sm font-medium text-black hover:text-[#E20015] text-left"
              >
                Zahlungen
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

      <main className="flex-1 px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-[1200px] mx-auto">
          {showSepaNotice && (
            <div
              className={`mb-12 bg-gradient-to-r from-[#FFF8E6] to-[#FFE8CC] border-l-4 border-[#FFB800] rounded-lg p-8 shadow-lg transition-all duration-700 ${
                !showLoadingAnimation ? "scale-105 shadow-2xl ring-4 ring-[#FFB800] ring-opacity-30" : ""
              }`}
              style={{
                position: !showLoadingAnimation ? "relative" : "relative",
                zIndex: !showLoadingAnimation ? 50 : 10,
              }}
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FFB800"
                    strokeWidth="2"
                    className={`mt-1 transition-transform duration-500 ${!showLoadingAnimation ? "scale-125" : ""}`}
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-[2.4rem] font-bold text-gray-900 mb-4">
                    Wichtige Mitteilung: SEPA-Lastschrift wird eingestellt
                  </h3>
                  <p className="text-[1.6rem] text-gray-700 mb-6 leading-relaxed">
                    Ab dem <strong>1. November 2025</strong> unterstützen wir keine SEPA-Lastschriftverfahren mehr.
                    Bitte hinterlegen Sie eine Kreditkarte als neue Zahlungsmethode, um Ihre Energierechnungen weiterhin
                    bequem und automatisch zu bezahlen.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => router.push("/dashboard/payment-methods")}
                      className="bg-[#E20015] hover:bg-[#C00012] text-white text-[1.6rem] font-bold py-5 px-8 rounded-lg transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      Kreditkarte jetzt hinzufügen
                    </button>
                    <button
                      onClick={() => setShowSepaNotice(false)}
                      className="bg-white hover:bg-gray-50 text-gray-700 text-[1.6rem] font-medium py-5 px-8 rounded-lg transition-all border border-gray-300"
                    >
                      Später erinnern
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div
            className={`transition-all duration-700 ${
              !showLoadingAnimation && showSepaNotice ? "blur-sm opacity-60 pointer-events-none" : ""
            }`}
          >
            <div className="mb-12 md:mb-16">
              <h1 className="text-[3.6rem] md:text-[4.8rem] font-bold text-black mb-3">
                Willkommen, {guessedName || profile?.full_name || "Kunde"}!
              </h1>
              <p className="text-[1.6rem] md:text-[1.8rem] text-gray-600">
                Kundennummer: {profile?.account_number || "Wird geladen..."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
              <div className="bg-[#F5F5F5] p-8 rounded-lg">
                <h3 className="text-[1.4rem] font-medium text-gray-600 mb-3">Offene Rechnungen</h3>
                <p className="text-[4.2rem] font-bold text-black">
                  {showLoadingAnimation ? (
                    <span className="animate-pulse">1</span>
                  ) : (
                    displayBills.filter((b) => b.status === "pending").length
                  )}
                </p>
              </div>
              <div className="bg-[#F5F5F5] p-8 rounded-lg">
                <h3 className="text-[1.4rem] font-medium text-gray-600 mb-3">Überfällige Rechnungen</h3>
                <p className="text-[4.2rem] font-bold text-[#E20015]">
                  {showLoadingAnimation ? (
                    <span className="animate-pulse">0</span>
                  ) : (
                    displayBills.filter((b) => b.status === "overdue").length
                  )}
                </p>
              </div>
              <div className="bg-[#F5F5F5] p-8 rounded-lg">
                <h3 className="text-[1.4rem] font-medium text-gray-600 mb-3">Gesamtbetrag offen</h3>
                <p className="text-[4.2rem] font-bold text-black">
                  {showLoadingAnimation ? (
                    <span className="animate-pulse">€127.45</span>
                  ) : (
                    `€${displayBills
                      .filter((b) => b.status === "pending" || b.status === "overdue")
                      .reduce((sum, b) => sum + Number(b.amount), 0)
                      .toFixed(2)}`
                  )}
                </p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 md:px-8 py-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-[2.4rem] md:text-[2.8rem] font-bold text-black">Aktuelle Rechnungen</h2>
                <button
                  onClick={() => router.push("/dashboard/bills")}
                  className="text-[1.4rem] md:text-[1.6rem] font-medium text-[#E20015] hover:underline"
                >
                  Alle anzeigen
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-[#F5F5F5]">
                    <tr>
                      <th className="px-8 py-5 text-left text-[1.2rem] font-medium text-gray-600 uppercase">
                        Rechnungsnummer
                      </th>
                      <th className="px-8 py-5 text-left text-[1.2rem] font-medium text-gray-600 uppercase">Datum</th>
                      <th className="px-8 py-5 text-left text-[1.2rem] font-medium text-gray-600 uppercase">
                        Fälligkeitsdatum
                      </th>
                      <th className="px-8 py-5 text-left text-[1.2rem] font-medium text-gray-600 uppercase">Betrag</th>
                      <th className="px-8 py-5 text-left text-[1.2rem] font-medium text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayBills.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-12 text-center text-[1.6rem] text-gray-500">
                          Keine Rechnungen vorhanden
                        </td>
                      </tr>
                    ) : (
                      displayBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-gray-50">
                          <td className="px-8 py-6 text-[1.4rem] font-medium text-black">{bill.bill_number}</td>
                          <td className="px-8 py-6 text-[1.4rem] text-gray-600">
                            {new Date(bill.bill_date).toLocaleDateString("de-DE")}
                          </td>
                          <td className="px-8 py-6 text-[1.4rem] text-gray-600">
                            {new Date(bill.due_date).toLocaleDateString("de-DE")}
                          </td>
                          <td className="px-8 py-6 text-[1.4rem] font-medium text-black">
                            €{Number(bill.amount).toFixed(2)}
                          </td>
                          <td className="px-8 py-6">
                            <span
                              className={`inline-flex px-3 py-2 text-[1.2rem] font-medium rounded-full ${getStatusColor(bill.status)}`}
                            >
                              {getStatusText(bill.status)}
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
        </div>
      </main>

      <footer className="border-t border-gray-200 px-6 py-10">
        <div className="max-w-[1200px] mx-auto text-center text-[1.4rem] text-gray-600">
          <p>© 2025 E.ON Energie Deutschland GmbH</p>
        </div>
      </footer>
    </div>
  )
}
