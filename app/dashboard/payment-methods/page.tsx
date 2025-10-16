import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PaymentMethodsContent from "@/components/payment-methods-content"

export default async function PaymentMethodsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: paymentMethods } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })

  return <PaymentMethodsContent paymentMethods={paymentMethods || []} userId={user.id} />
}
