import AdminLoginForm from "@/components/admin-login-form"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminLoginPage() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: adminUser } = await supabase.from("admin_users").select("*").eq("user_id", user.id).single()

      if (adminUser) {
        redirect("/admin")
      }
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <img src="/eon-logo.svg" alt="E.ON Logo" className="h-16 mx-auto mb-6" />
            <h1 className="text-[3.2rem] font-bold text-[#E20015] mb-3">Admin Login</h1>
            <p className="text-[1.6rem] text-gray-600">Sign in to access the admin dashboard</p>
          </div>

          <AdminLoginForm />
        </div>
      </div>
    )
  } catch (error) {
    console.error("[v0] Admin login page error:", error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <img src="/eon-logo.svg" alt="E.ON Logo" className="h-16 mx-auto mb-6" />
            <h1 className="text-[3.2rem] font-bold text-[#E20015] mb-3">Admin Login</h1>
            <p className="text-[1.6rem] text-gray-600">Sign in to access the admin dashboard</p>
          </div>

          <AdminLoginForm />
        </div>
      </div>
    )
  }
}
