"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AdminSetupForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    console.log("[v0] Admin setup form submitted")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      console.log("[v0] Password mismatch error")
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      console.log("[v0] Password too short error")
      return
    }

    setIsLoading(true)
    console.log("[v0] Calling admin setup API...")

    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
        }),
      })

      const data = await response.json()
      console.log("[v0] Admin setup API response:", data)

      if (!response.ok) {
        console.error("[v0] Admin setup failed:", data.error)
        throw new Error(data.error || "Setup failed")
      }

      console.log("[v0] Admin setup successful, redirecting...")
      router.push("/admin")
      router.refresh()
    } catch (err: any) {
      console.error("[v0] Admin setup error:", err)
      setError(err.message || "Failed to create admin account. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-[1.4rem]">{error}</AlertDescription>
          </Alert>
        )}

        <div>
          <Label htmlFor="fullName" className="text-[1.4rem] font-medium">
            Full Name
          </Label>
          <Input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
            className="mt-2 text-[1.6rem] py-5"
            placeholder="John Doe"
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-[1.4rem] font-medium">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="mt-2 text-[1.6rem] py-5"
            placeholder="admin@example.com"
          />
        </div>

        <div>
          <Label htmlFor="password" className="text-[1.4rem] font-medium">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            className="mt-2 text-[1.6rem] py-5"
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="text-[1.4rem] font-medium">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            className="mt-2 text-[1.6rem] py-5"
            placeholder="Re-enter password"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#E20015] hover:bg-[#C00012] text-white text-[1.6rem] py-6"
        >
          {isLoading ? "Creating Admin Account..." : "Create Admin Account"}
        </Button>
      </form>
    </div>
  )
}
