"use client"

import type React from "react"

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

interface BillsContentProps {
  bills: Bill[]
  userId: string
}

export default function BillsContent({ bills: initialBills, userId }: BillsContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [bills, setBills] = useState(initialBills)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const resetForm = () => {
    setFormData({
      bill_number: "",
      bill_date: "",
      due_date: "",
      amount: "",
      status: "pending",
      bill_type: "electricity",
      consumption_kwh: "",
      period_start: "",
      period_end: "",
    })
    setEditingBill(null)
  }

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const { data, error } = await supabase
      .from("bills")
      .insert({
        user_id: userId,
        bill_number: formData.bill_number,
        bill_date: formData.bill_date,
        due_date: formData.due_date,
        amount: Number.parseFloat(formData.amount),
        status: formData.status,
        bill_type: formData.bill_type,
        consumption_kwh: formData.consumption_kwh ? Number.parseFloat(formData.consumption_kwh) : null,
        period_start: formData.period_start || null,
        period_end: formData.period_end || null,
      })
      .select()
      .single()

    if (!error && data) {
      setBills([data, ...bills])
      setShowAddModal(false)
      resetForm()
    }

    setIsSubmitting(false)
  }

  const handleUpdateBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBill) return

    setIsSubmitting(true)

    const { data, error } = await supabase
      .from("bills")
      .update({
        bill_number: formData.bill_number,
        bill_date: formData.bill_date,
        due_date: formData.due_date,
        amount: Number.parseFloat(formData.amount),
        status: formData.status,
        bill_type: formData.bill_type,
        consumption_kwh: formData.consumption_kwh ? Number.parseFloat(formData.consumption_kwh) : null,
        period_start: formData.period_start || null,
        period_end: formData.period_end || null,
      })
      .eq("id", editingBill.id)
      .select()
      .single()

    if (!error && data) {
      setBills(bills.map((b) => (b.id === data.id ? data : b)))
      setEditingBill(null)
      resetForm()
    }

    setIsSubmitting(false)
  }

  const handleDeleteBill = async (billId: string) => {
    if (!confirm("Möchten Sie diese Rechnung wirklich löschen?")) return

    setDeletingId(billId)
    const { error } = await supabase.from("bills").delete().eq("id", billId)

    if (!error) {
      setBills(bills.filter((b) => b.id !== billId))
    }
    setDeletingId(null)
  }

  const handleEditClick = (bill: Bill) => {
    setEditingBill(bill)
    setFormData({
      bill_number: bill.bill_number,
      bill_date: bill.bill_date,
      due_date: bill.due_date,
      amount: bill.amount.toString(),
      status: bill.status,
      bill_type: bill.bill_type,
      consumption_kwh: bill.consumption_kwh?.toString() || "",
      period_start: bill.period_start || "",
      period_end: bill.period_end || "",
    })
  }

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

  const filteredBills = filterStatus === "all" ? bills : bills.filter((b) => b.status === filterStatus)

  const [formData, setFormData] = useState({
    bill_number: "",
    bill_date: "",
    due_date: "",
    amount: "",
    status: "pending",
    bill_type: "electricity",
    consumption_kwh: "",
    period_start: "",
    period_end: "",
  })

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
            <button className="text-[1.4rem] font-medium text-[#E20015] border-b-2 border-[#E20015] pb-1">
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
              <button className="text-sm font-medium text-[#E20015] text-left">Rechnungen</button>
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
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-12">
            <h1 className="text-[3.6rem] md:text-[4.8rem] font-bold text-black">Rechnungen</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#E20015] hover:bg-[#C00012] text-white text-[1.6rem] font-bold py-5 px-8 rounded-full transition-colors w-full md:w-auto"
            >
              Neue Rechnung
            </button>
          </div>

          <div className="mb-8 flex gap-4 overflow-x-auto pb-2">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-6 py-3 rounded-full text-[1.4rem] font-medium transition-colors ${
                filterStatus === "all" ? "bg-[#E20015] text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`px-6 py-3 rounded-full text-[1.4rem] font-medium transition-colors ${
                filterStatus === "pending" ? "bg-[#E20015] text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Ausstehend
            </button>
            <button
              onClick={() => setFilterStatus("paid")}
              className={`px-6 py-3 rounded-full text-[1.4rem] font-medium transition-colors ${
                filterStatus === "paid" ? "bg-[#E20015] text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Bezahlt
            </button>
            <button
              onClick={() => setFilterStatus("overdue")}
              className={`px-6 py-3 rounded-full text-[1.4rem] font-medium transition-colors ${
                filterStatus === "overdue" ? "bg-[#E20015] text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Überfällig
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-[#F5F5F5]">
                  <tr>
                    <th className="px-8 py-5 text-left text-[1.2rem] font-medium text-gray-600 uppercase">
                      Rechnungsnummer
                    </th>
                    <th className="px-8 py-5 text-left text-[1.2rem] font-medium text-gray-600 uppercase">Typ</th>
                    <th className="px-8 py-5 text-left text-[1.2rem] font-medium text-gray-600 uppercase">Datum</th>
                    <th className="px-8 py-5 text-left text-[1.2rem] font-medium text-gray-600 uppercase">
                      Fälligkeitsdatum
                    </th>
                    <th className="px-8 py-5 text-left text-[1.2rem] font-medium text-gray-600 uppercase">Betrag</th>
                    <th className="px-8 py-5 text-left text-[1.2rem] font-medium text-gray-600 uppercase">Status</th>
                    <th className="px-8 py-5 text-left text-[1.2rem] font-medium text-gray-600 uppercase">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-12 text-center text-[1.6rem] text-gray-500">
                        Keine Rechnungen vorhanden
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-gray-50">
                        <td className="px-8 py-6 text-[1.4rem] font-medium text-black">{bill.bill_number}</td>
                        <td className="px-8 py-6 text-[1.4rem] text-gray-600">{getBillTypeText(bill.bill_type)}</td>
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
                        <td className="px-8 py-6">
                          <div className="flex gap-3">
                            <button
                              onClick={() => router.push(`/dashboard/bills/${bill.id}`)}
                              className="text-[1.4rem] text-[#E20015] hover:underline font-medium"
                            >
                              {bill.status === "paid" ? "Ansehen" : "Bezahlen"}
                            </button>
                            <button
                              onClick={() => handleEditClick(bill)}
                              disabled={deletingId === bill.id}
                              className="text-[1.4rem] text-gray-600 hover:underline disabled:opacity-50"
                            >
                              Bearbeiten
                            </button>
                            <button
                              onClick={() => handleDeleteBill(bill.id)}
                              disabled={deletingId === bill.id}
                              className="text-[1.4rem] text-red-600 hover:underline disabled:opacity-50"
                            >
                              {deletingId === bill.id ? "Löschen..." : "Löschen"}
                            </button>
                          </div>
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

      {(showAddModal || editingBill) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 md:p-6 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-gray-200">
              <h2 className="text-[2.8rem] font-bold text-black">
                {editingBill ? "Rechnung bearbeiten" : "Neue Rechnung"}
              </h2>
            </div>
            <form onSubmit={editingBill ? handleUpdateBill : handleAddBill} className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[1.4rem] font-medium text-gray-700 mb-3">Rechnungsnummer</label>
                  <input
                    type="text"
                    value={formData.bill_number}
                    onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                    className="w-full px-5 py-5 text-[1.6rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[1.4rem] font-medium text-gray-700 mb-3">Typ</label>
                  <select
                    value={formData.bill_type}
                    onChange={(e) => setFormData({ ...formData, bill_type: e.target.value })}
                    className="w-full px-5 py-5 text-[1.6rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]"
                  >
                    <option value="electricity">Strom</option>
                    <option value="gas">Gas</option>
                    <option value="water">Wasser</option>
                    <option value="other">Sonstiges</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[1.4rem] font-medium text-gray-700 mb-3">Rechnungsdatum</label>
                  <input
                    type="date"
                    value={formData.bill_date}
                    onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                    className="w-full px-5 py-5 text-[1.6rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[1.4rem] font-medium text-gray-700 mb-3">Fälligkeitsdatum</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-5 py-5 text-[1.6rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[1.4rem] font-medium text-gray-700 mb-3">Betrag (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-5 py-5 text-[1.6rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[1.4rem] font-medium text-gray-700 mb-3">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-5 py-5 text-[1.6rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]"
                  >
                    <option value="pending">Ausstehend</option>
                    <option value="paid">Bezahlt</option>
                    <option value="overdue">Überfällig</option>
                    <option value="cancelled">Storniert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[1.4rem] font-medium text-gray-700 mb-3">Verbrauch (kWh)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.consumption_kwh}
                  onChange={(e) => setFormData({ ...formData, consumption_kwh: e.target.value })}
                  className="w-full px-5 py-5 text-[1.6rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[1.4rem] font-medium text-gray-700 mb-3">Zeitraum von</label>
                  <input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    className="w-full px-5 py-5 text-[1.6rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]"
                  />
                </div>
                <div>
                  <label className="block text-[1.4rem] font-medium text-gray-700 mb-3">Zeitraum bis</label>
                  <input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    className="w-full px-5 py-5 text-[1.6rem] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#E20015] hover:bg-[#C00012] text-white text-[1.6rem] font-bold py-5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? editingBill
                      ? "Aktualisieren..."
                      : "Hinzufügen..."
                    : editingBill
                      ? "Aktualisieren"
                      : "Hinzufügen"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingBill(null)
                    resetForm()
                  }}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[1.6rem] font-bold py-5 rounded-full transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="border-t border-gray-200 px-6 py-10">
        <div className="max-w-[1200px] mx-auto text-center text-[1.4rem] text-gray-600">
          <p>© 2025 E.ON Energie Deutschland GmbH</p>
        </div>
      </footer>
    </div>
  )
}
