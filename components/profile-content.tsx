"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { User } from "@supabase/supabase-js"

interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  address: string | null
  city: string | null
  postal_code: string | null
}

interface ProfileContentProps {
  user: User
  profile: Profile | null
}

export default function ProfileContent({ user, profile: initialProfile }: ProfileContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [formData, setFormData] = useState({
    full_name: initialProfile?.full_name || "",
    phone: initialProfile?.phone || "",
    address: initialProfile?.address || "",
    city: initialProfile?.city || "",
    postal_code: initialProfile?.postal_code || "",
  })

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postal_code,
        })
        .eq("id", user.id)

      if (error) throw error

      setMessage({ type: "success", text: "Profil erfolgreich aktualisiert" })
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      setMessage({ type: "error", text: "Fehler beim Aktualisieren des Profils" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      full_name: initialProfile?.full_name || "",
      phone: initialProfile?.phone || "",
      address: initialProfile?.address || "",
      city: initialProfile?.city || "",
      postal_code: initialProfile?.postal_code || "",
    })
    setIsEditing(false)
    setMessage(null)
  }

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
            <button className="text-sm font-medium text-[#E20015] border-b-2 border-[#E20015] pb-1">Profil</button>
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
              <button className="text-sm font-medium text-[#E20015] text-left">Profil</button>
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
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-black">Mein Profil</h1>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-[#E20015] hover:bg-[#C00012] text-white font-bold py-3 px-6 rounded-full transition-colors w-full md:w-auto"
              >
                Bearbeiten
              </button>
            )}
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg border-l-4 ${
                message.type === "success"
                  ? "bg-green-50 border-green-500 text-green-800"
                  : "bg-red-50 border-red-500 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-6 bg-[#F5F5F5] border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">Persönliche Informationen</h2>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail-Adresse</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Die E-Mail-Adresse kann nicht geändert werden</p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vollständiger Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015] ${
                    !isEditing ? "bg-gray-50 text-gray-600" : ""
                  }`}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefonnummer</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015] ${
                    !isEditing ? "bg-gray-50 text-gray-600" : ""
                  }`}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015] ${
                    !isEditing ? "bg-gray-50 text-gray-600" : ""
                  }`}
                />
              </div>

              {/* City and Postal Code */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stadt</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015] ${
                      !isEditing ? "bg-gray-50 text-gray-600" : ""
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postleitzahl</label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015] ${
                      !isEditing ? "bg-gray-50 text-gray-600" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-[#E20015] hover:bg-[#C00012] text-white font-bold py-3 rounded-full transition-colors disabled:opacity-50"
                  >
                    {isSaving ? "Speichern..." : "Speichern"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-full transition-colors disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Account Information */}
          <div className="mt-8 bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-6 bg-[#F5F5F5] border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">Kontoinformationen</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-700">Konto erstellt</p>
                  <p className="text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString("de-DE")}</p>
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-700">Letzte Anmeldung</p>
                  <p className="text-sm text-gray-600">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("de-DE") : "Nie"}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">E-Mail bestätigt</p>
                  <p className="text-sm text-gray-600">{user.email_confirmed_at ? "Ja" : "Nein"}</p>
                </div>
              </div>
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
