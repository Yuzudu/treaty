import { createSupabaseServerClient } from "@/lib/supabase/server"
import { SignOutButton } from "./SignOutButton"

export async function UserMenu() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email

  return (
    <div className="flex items-center gap-3">
      {email && (
        <span className="text-sm text-muted-foreground truncate max-w-40">{email}</span>
      )}
      <SignOutButton />
    </div>
  )
}
