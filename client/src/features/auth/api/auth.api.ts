'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AuthResult } from '../types'

export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error || !data.url) return { error: error?.message ?? 'Google sign-in failed' }
  redirect(data.url)
}

export async function signInWithMagicLink(
  _prevState: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
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
