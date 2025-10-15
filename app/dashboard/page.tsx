import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardContent from "@/components/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: bills } = await supabase
    .from("bills")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: false })
    .limit(5)

  return <DashboardContent user={user} profile={profile} bills={bills || []} />
}
