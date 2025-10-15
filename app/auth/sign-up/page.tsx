"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      router.push("/auth/check-email")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <img src="/eon-logo.svg" alt="E.ON Logo" className="h-8" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold mb-2 text-black">Registrierung</h1>
          <p className="text-gray-600 mb-8">Erstellen Sie Ihr Mein E.ON Konto</p>

          {error && (
            <div className="mb-6 bg-[#F8D7DA] border-l-4 border-[#E20015] p-4 rounded">
              <p className="text-sm text-[#721C24]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-6">
            <div>
              <input
                type="text"
                placeholder="Vollständiger Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-4 border border-gray-400 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#E20015] focus:border-[#E20015]"
                required
              />
            </div>

            <div>
              <input
                type="email"
                placeholder="E-Mail-Adresse"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 border border-gray-400 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#E20015] focus:border-[#E20015]"
                required
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Passwort (mindestens 6 Zeichen)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 pr-12 border border-gray-400 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#E20015] focus:border-[#E20015]"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#E20015] hover:bg-[#C00012] text-white font-bold py-4 rounded-full text-base transition-colors disabled:opacity-50"
            >
              {isLoading ? "Registrierung läuft..." : "Registrieren"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-sm text-gray-600 hover:text-[#E20015]"
              >
                Bereits registriert? Jetzt anmelden
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
