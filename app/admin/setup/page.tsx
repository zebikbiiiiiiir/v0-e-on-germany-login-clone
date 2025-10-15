import AdminSetupForm from "@/components/admin-setup-form"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminSetupPage() {
  try {
    const supabase = await createClient()

    const { count, error } = await supabase.from("admin_users").select("*", { count: "exact", head: true })

    // If table doesn't exist, that's fine - show setup
    if (!error && count && count > 0) {
      redirect("/admin/login")
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <img src="/eon-logo.svg" alt="E.ON Logo" className="h-16 mx-auto mb-6" />
            <h1 className="text-[3.2rem] font-bold text-[#E20015] mb-3">Admin Setup</h1>
            <p className="text-[1.6rem] text-gray-600">Create the first admin account</p>
          </div>

          <AdminSetupForm />

          <p className="text-center text-[1.4rem] text-gray-500 mt-6">
            This page is only shown on first visit. Subsequent visits will require login.
          </p>
        </div>
      </div>
    )
  } catch (error) {
    console.error("[v0] Admin setup page error:", error)
    // Show setup form anyway if there's an error
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <img src="/eon-logo.svg" alt="E.ON Logo" className="h-16 mx-auto mb-6" />
            <h1 className="text-[3.2rem] font-bold text-[#E20015] mb-3">Admin Setup</h1>
            <p className="text-[1.6rem] text-gray-600">Create the first admin account</p>
          </div>

          <AdminSetupForm />

          <p className="text-center text-[1.4rem] text-gray-500 mt-6">
            This page is only shown on first visit. Subsequent visits will require login.
          </p>
        </div>
      </div>
    )
  }
}
