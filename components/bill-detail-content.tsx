"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  due_date: string
  amount: number
  status: string
  bill_type: string
  consumption_kwh: number | null
  period_start: string | null
  period_end: string | null
}

interface Payment {
  id: string
  payment_date: string
  payment_method: string
  transaction_id: string
}

interface PaymentMethod {
  id: string
  method_type: string
  card_last_four: string | null
  card_brand: string | null
  iban_last_four: string | null
  is_default: boolean
}

interface BillDetailContentProps {
  bill: Bill
  payment: Payment | null
  paymentMethods: PaymentMethod[]
  userId: string
}

export default function BillDetailContent({ bill, payment, paymentMethods, userId }: BillDetailContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(
    paymentMethods.find((pm) => pm.is_default)?.id || "",
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleDownloadInvoice = () => {
    window.open(`/api/generate-invoice?billId=${bill.id}`, "_blank")
  }

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      alert("Bitte wählen Sie eine Zahlungsmethode")
      return
    }

    setIsProcessing(true)

    try {
      const { error: paymentError } = await supabase.from("payments").insert({
        user_id: userId,
        bill_id: bill.id,
        amount: bill.amount,
        payment_method: selectedPaymentMethod,
        transaction_id: `TXN-${Date.now()}`,
        status: "completed",
      })

      if (paymentError) throw paymentError

      const { error: billError } = await supabase.from("bills").update({ status: "paid" }).eq("id", bill.id)

      if (billError) throw billError

      setShowSuccess(true)
      setTimeout(() => {
        router.push("/dashboard/bills")
      }, 2000)
    } catch (error) {
      console.error("[v0] Payment error:", error)
      alert("Zahlung fehlgeschlagen. Bitte versuchen Sie es erneut.")
    } finally {
      setIsProcessing(false)
    }
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

  const getPaymentMethodDisplay = (pm: PaymentMethod) => {
    if (pm.method_type === "credit_card") {
      return `${pm.card_brand} •••• ${pm.card_last_four}`
    }
    if (pm.method_type === "bank_transfer") {
      return `Banküberweisung •••• ${pm.iban_last_four}`
    }
    return pm.method_type
  }

  const isPaid = bill.status === "paid" || payment !== null

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
              className="text-[1.4rem] font-medium text-[#E20015] border-b-2 border-[#E20015] pb-1"
            >
              Rechnungen
            </button>
            <button
              onClick={() => router.push("/dashboard/profile")}
              className="text-[1.4rem] font-medium text-black hover:text-[#E20015]"
            >
              Profil
            </button>
            <button onClick={handleSignOut} className="text-[1.4rem] font-medium text-gray-600 hover:text-[#E20015]">
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
                className="text-sm font-medium text-[#E20015] text-left"
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

      <main className="flex-1 px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-[1000px] mx-auto">
          <button
            onClick={() => router.push("/dashboard/bills")}
            className="flex items-center gap-2 text-[1.4rem] text-gray-600 hover:text-[#E20015] mb-8"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Zurück zu Rechnungen
          </button>

          {showSuccess && (
            <div className="mb-6 bg-green-100 border-l-4 border-green-500 p-4 rounded">
              <p className="text-sm text-green-800 font-medium">Zahlung erfolgreich! Sie werden weitergeleitet...</p>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-8 md:p-10 mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-8">
              <div>
                <h1 className="text-[3.6rem] md:text-[4.2rem] font-bold text-black mb-3">
                  Rechnung {bill.bill_number}
                </h1>
                <p className="text-[1.6rem] text-gray-600">{getBillTypeText(bill.bill_type)}</p>
              </div>
              <div className="text-right">
                <p className="text-[4.8rem] md:text-[5.6rem] font-bold text-black">€{Number(bill.amount).toFixed(2)}</p>
                {isPaid ? (
                  <span className="inline-flex px-4 py-2 text-[1.4rem] font-medium rounded-full bg-green-100 text-green-800 mt-3">
                    Bezahlt
                  </span>
                ) : (
                  <span className="inline-flex px-4 py-2 text-[1.4rem] font-medium rounded-full bg-yellow-100 text-yellow-800 mt-3">
                    Ausstehend
                  </span>
                )}
              </div>
            </div>

            <div className="mb-8">
              <button
                onClick={handleDownloadInvoice}
                className="flex items-center gap-3 text-[1.6rem] text-[#E20015] hover:underline font-medium"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Rechnung als PDF herunterladen
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-[1.4rem] font-medium text-gray-600 mb-2">Rechnungsdatum</h3>
                <p className="text-[1.8rem] text-black">{new Date(bill.bill_date).toLocaleDateString("de-DE")}</p>
              </div>
              <div>
                <h3 className="text-[1.4rem] font-medium text-gray-600 mb-2">Fälligkeitsdatum</h3>
                <p className="text-[1.8rem] text-black">{new Date(bill.due_date).toLocaleDateString("de-DE")}</p>
              </div>
            </div>

            {bill.consumption_kwh && (
              <div className="mb-8">
                <h3 className="text-[1.4rem] font-medium text-gray-600 mb-2">Verbrauch</h3>
                <p className="text-[1.8rem] text-black">{bill.consumption_kwh} kWh</p>
              </div>
            )}

            {bill.period_start && bill.period_end && (
              <div className="mb-8">
                <h3 className="text-[1.4rem] font-medium text-gray-600 mb-2">Abrechnungszeitraum</h3>
                <p className="text-[1.8rem] text-black">
                  {new Date(bill.period_start).toLocaleDateString("de-DE")} -{" "}
                  {new Date(bill.period_end).toLocaleDateString("de-DE")}
                </p>
              </div>
            )}

            {payment && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-black mb-4">Zahlungsinformationen</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Zahlungsdatum</h4>
                    <p className="text-base text-black">{new Date(payment.payment_date).toLocaleDateString("de-DE")}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Transaktions-ID</h4>
                    <p className="text-base text-black font-mono text-sm">{payment.transaction_id}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isPaid && (
            <div className="bg-[#F5F5F5] border border-gray-200 rounded-lg p-8 md:p-10">
              <h2 className="text-[2.8rem] md:text-[3.2rem] font-bold text-black mb-8">Zahlung durchführen</h2>

              {paymentMethods.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[1.6rem] text-gray-600 mb-6">Sie haben noch keine Zahlungsmethode hinzugefügt.</p>
                  <button
                    onClick={() => router.push("/dashboard/payment-methods")}
                    className="bg-[#E20015] hover:bg-[#C00012] text-white text-[1.6rem] font-bold py-5 px-8 rounded-full transition-colors"
                  >
                    Zahlungsmethode hinzufügen
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <label className="block text-[1.6rem] font-medium text-gray-700 mb-4">Zahlungsmethode wählen</label>
                    <div className="space-y-4">
                      {paymentMethods.map((pm) => (
                        <label
                          key={pm.id}
                          className="flex items-center gap-4 p-6 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-[#E20015] transition-colors"
                        >
                          <input
                            type="radio"
                            name="payment-method"
                            value={pm.id}
                            checked={selectedPaymentMethod === pm.id}
                            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                            className="w-5 h-5 text-[#E20015] focus:ring-[#E20015]"
                          />
                          <div className="flex-1">
                            <p className="text-[1.6rem] font-medium text-black">{getPaymentMethodDisplay(pm)}</p>
                            {pm.is_default && (
                              <span className="text-[1.2rem] text-gray-600 bg-gray-200 px-3 py-1 rounded-full mt-2 inline-block">
                                Standard
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <button
                      onClick={handlePayment}
                      disabled={isProcessing || !selectedPaymentMethod}
                      className="flex-1 bg-[#E20015] hover:bg-[#C00012] text-white text-[1.8rem] font-bold py-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? "Wird verarbeitet..." : `€${Number(bill.amount).toFixed(2)} bezahlen`}
                    </button>
                    <button
                      onClick={() => router.push("/dashboard/payment-methods")}
                      className="md:w-auto bg-gray-200 hover:bg-gray-300 text-gray-700 text-[1.6rem] font-bold py-6 px-8 rounded-full transition-colors"
                    >
                      Zahlungsmethoden verwalten
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
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
