import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const ALLOWED_PREFIXES = ['/studio', '/projects', '/settings']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/studio'

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in`)
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/sign-in?error=auth-callback-failed`)
  }

  const isAllowed = ALLOWED_PREFIXES.some((p) => next.startsWith(p))
  const destination = isAllowed ? next : '/studio'

  return NextResponse.redirect(`${origin}${destination}`)
}
