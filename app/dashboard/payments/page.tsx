import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PaymentHistoryContent from "@/components/payment-history-content"

export default async function PaymentHistoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: payments } = await supabase
    .from("payments")
    .select(
      `
      *,
      bills (
        bill_number,
        bill_type,
        bill_date
      )
    `,
    )
    .eq("user_id", user.id)
    .order("payment_date", { ascending: false })

  return <PaymentHistoryContent payments={payments || []} />
}
