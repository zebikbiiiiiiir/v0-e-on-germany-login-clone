"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import DashboardContent from "@/components/dashboard-content"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [guessedName, setGuessedName] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    const loadData = async () => {
      const userEmail = sessionStorage.getItem("userEmail")

      if (!userEmail) {
        router.push("/")
        return
      }

      const cachedName = sessionStorage.getItem("guessed_name")
      if (cachedName) {
        setGuessedName(cachedName)
      } else {
        // Fetch from AI if not cached
        try {
          const response = await fetch("/api/ai/guess-name", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail }),
          })
          if (response.ok) {
            const data = await response.json()
            setGuessedName(data.guessedName)
            sessionStorage.setItem("guessed_name", data.guessedName)
          }
        } catch (error) {
          console.error("[v0] Failed to fetch guessed name:", error)
        }
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        setUser(authUser)

        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()
        setProfile(profileData)

        const { data: billsData } = await supabase
          .from("bills")
          .select("*")
          .eq("user_id", authUser.id)
          .order("due_date", { ascending: false })
          .limit(5)
        setBills(billsData || [])
      } else {
        setUser({ email: userEmail })
        setProfile(null)
        setBills([])
      }

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E20015] mx-auto mb-4"></div>
          <p className="text-gray-600">Wird geladen...</p>
        </div>
      </div>
    )
  }

  return <DashboardContent user={user} profile={profile} bills={bills} guessedName={guessedName} />
}
