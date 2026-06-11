import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isAppRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/settings")
  const isAuthRoute =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")

  if (!user && isAppRoute) {
    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = "/sign-in"
    redirectTo.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(redirectTo)
  }

  if (user && isAuthRoute) {
    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = "/dashboard"
    redirectTo.searchParams.delete("redirectTo")
    return NextResponse.redirect(redirectTo)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
