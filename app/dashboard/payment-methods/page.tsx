"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import PaymentMethodsContent from "@/components/payment-methods-content"

export default function PaymentMethodsPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string>("")
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem("userEmail")

    if (!storedEmail) {
      // No email means user hasn't "logged in", redirect to login
      router.push("/")
      return
    }

    setEmail(storedEmail)

    // Load payment methods from sessionStorage
    const storedMethods = sessionStorage.getItem("paymentMethods")
    if (storedMethods) {
      try {
        setPaymentMethods(JSON.parse(storedMethods))
      } catch (e) {
        console.error("Failed to parse payment methods:", e)
        setPaymentMethods([])
      }
    }

    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <PaymentMethodsContent paymentMethods={paymentMethods} userId={email} />
}
