import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminDashboard from "@/components/admin-dashboard"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  try {
    const supabase = await createClient()

    const {
      data: existingAdmins,
      count,
      error,
    } = await supabase.from("admin_users").select("*", { count: "exact", head: true })

    if (error) {
      console.error("[v0] Error checking admin users:", error)
      // If table doesn't exist or error, redirect to setup
      redirect("/admin/setup")
    }

    if (count === 0) {
      redirect("/admin/setup")
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/admin/login")
    }

    // Check if user is admin
    const { data: adminUser } = await supabase.from("admin_users").select("*").eq("user_id", user.id).single()

    if (!adminUser) {
      redirect("/admin/login")
    }

    return <AdminDashboard userId={user.id} adminRole={adminUser.role} />
  } catch (error) {
    console.error("[v0] Admin page error:", error)
    redirect("/admin/setup")
  }
}
