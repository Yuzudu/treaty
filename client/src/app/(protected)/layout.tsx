import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { UserMenu } from "@/features/auth"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const headersList = await headers()
    const path = headersList.get("x-invoke-path") ?? "/studio"
    redirect(`/sign-in?redirectTo=${encodeURIComponent(path)}`)
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/studio" className="text-sm font-semibold">
              Treaty
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/studio"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Studio
              </Link>
              <Link
                href="/projects"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Projects
              </Link>
              <Link
                href="/settings"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
          <UserMenu />
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
