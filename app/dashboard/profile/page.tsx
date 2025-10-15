import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ProfileContent from "@/components/profile-content"

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return <ProfileContent user={user} profile={profile} />
}
