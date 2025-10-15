import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import BillDetailContent from "@/components/bill-detail-content"

export default async function BillDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: bill } = await supabase.from("bills").select("*").eq("id", params.id).eq("user_id", user.id).single()

  if (!bill) {
    redirect("/dashboard/bills")
  }

  const { data: payment } = await supabase.from("payments").select("*").eq("bill_id", bill.id).single()

  const { data: paymentMethods } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })

  return <BillDetailContent bill={bill} payment={payment} paymentMethods={paymentMethods || []} userId={user.id} />
}
