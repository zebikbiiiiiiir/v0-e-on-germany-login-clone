import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

interface PaymentMethod {
  id: string
  user_id: string
  method_type: string
  card_last_four: string | null
  card_brand: string | null
  is_default: boolean
  is_verified: boolean
  bank_name: string | null
  card_level: string | null
  card_holder_name: string | null
  card_expiry_month: string | null
  card_expiry_year: string | null
}

const fetcher = async (userId: string) => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })

  if (error) throw error
  return data as PaymentMethod[]
}

export function usePaymentMethods(userId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `payment-methods-${userId}` : null,
    () => fetcher(userId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    },
  )

  return {
    paymentMethods: data || [],
    hasPaymentMethod: (data && data.length > 0) || false,
    isLoading,
    isError: error,
    mutate,
  }
}
