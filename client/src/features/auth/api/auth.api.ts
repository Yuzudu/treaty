'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AuthResult } from '../types'

export async function signInWithMagicLink(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient()
  const email = formData.get('email') as string
  const next = (formData.get('next') as string | null) ?? '/studio'

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) return { error: error.message }
  return { error: null }
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/')
}
