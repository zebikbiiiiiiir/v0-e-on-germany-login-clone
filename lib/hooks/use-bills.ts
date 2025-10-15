import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  due_date: string
  amount: number
  status: string
  bill_type: string
  consumption_kwh: number | null
  period_start: string | null
  period_end: string | null
}

const fetcher = async (userId: string) => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("user_id", userId)
    .order("bill_date", { ascending: false })

  if (error) throw error
  return data as Bill[]
}

export function useBills(userId: string, initialData?: Bill[]) {
  const { data, error, isLoading, mutate } = useSWR(userId ? `bills-${userId}` : null, () => fetcher(userId), {
    fallbackData: initialData,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000, // Prevent duplicate requests within 5 seconds
  })

  return {
    bills: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}
