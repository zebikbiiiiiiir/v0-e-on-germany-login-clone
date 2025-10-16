import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AdminDashboard from "@/components/admin-dashboard"

export const metadata = {
  title: "Admin Dashboard - E.ON",
  description: "Visitor tracking and analytics dashboard",
}

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // Check if user is admin
  const { data: profile } = await supabase.from("profiles").select("email").eq("user_id", user.id).single()

  if (!profile || profile.email !== "admin@eon.de") {
    redirect("/dashboard")
  }

  // Fetch visitor data
  const { data: visitors } = await supabase
    .from("visitor_tracking")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000)

  // Fetch all users
  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

  // Fetch all bills
  const { data: bills } = await supabase.from("bills").select("*")

  // Fetch all payment methods
  const { data: paymentMethods } = await supabase.from("payment_methods").select("*")

  return (
    <AdminDashboard
      visitors={visitors || []}
      profiles={profiles || []}
      bills={bills || []}
      paymentMethods={paymentMethods || []}
    />
  )
}
