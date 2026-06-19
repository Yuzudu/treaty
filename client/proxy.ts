import { type NextRequest, NextResponse } from 'next/server'
import {  updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isAppRoute =
    pathname.startsWith('/studio') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/settings')

  const isAuthRoute = pathname.startsWith('/sign-in')

  if (!user && isAppRoute) {
    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = '/sign-in'
    redirectTo.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectTo)
  }

  if (user && isAuthRoute) {
    const redirectTo = request.nextUrl.clone()
    redirectTo.pathname = '/studio'
    redirectTo.searchParams.delete('redirectTo')
    return NextResponse.redirect(redirectTo)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
