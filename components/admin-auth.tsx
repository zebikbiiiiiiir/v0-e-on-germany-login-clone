"use client"

import type React from "react"

import { useState, useEffect } from "react"
import AdminDashboard from "@/components/admin-dashboard"

const ADMIN_AUTH_KEY = "eon_admin_authenticated"
const ADMIN_SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export default function AdminAuth() {
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authData = localStorage.getItem(ADMIN_AUTH_KEY)
        if (authData) {
          const { timestamp } = JSON.parse(authData)
          const now = Date.now()

          // Check if session is still valid (within 24 hours)
          if (now - timestamp < ADMIN_SESSION_DURATION) {
            setIsAuthenticated(true)
          } else {
            // Session expired, clear it
            localStorage.removeItem(ADMIN_AUTH_KEY)
          }
        }
      } catch (error) {
        console.error("[v0] Failed to check auth:", error)
        localStorage.removeItem(ADMIN_AUTH_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (password === "admin123") {
      const authData = {
        authenticated: true,
        timestamp: Date.now(),
      }
      localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(authData))

      setIsAuthenticated(true)
      setError("")
    } else {
      setError("Falsches Passwort")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_AUTH_KEY)
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00893e] mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <AdminDashboard userId="admin" adminRole="Super Admin" onLogout={handleLogout} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <img src="/eon-logo.svg" alt="E.ON Logo" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Bitte geben Sie das Admin-Passwort ein</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00893e] focus:border-transparent"
              placeholder="Admin-Passwort eingeben"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>
          )}

          <button
            type="submit"
            className="w-full bg-[#00893e] text-white py-3 rounded-md font-semibold hover:bg-[#007033] transition-colors"
          >
            Anmelden
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          Standard-Passwort: admin123
          <br />
          Session-Dauer: 24 Stunden
        </p>
      </div>
    </div>
  )
}
