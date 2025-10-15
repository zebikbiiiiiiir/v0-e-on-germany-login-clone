import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import BillsContent from "@/components/bills-content"

export default async function BillsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: bills } = await supabase
    .from("bills")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: false })

  return <BillsContent bills={bills || []} userId={user.id} />
}
