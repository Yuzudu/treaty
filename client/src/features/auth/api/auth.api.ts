"use server"

import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { AuthResult } from "../types"

export async function signUp(_prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient()
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const { error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }
  return { error: null }
}

export async function signIn(_prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient()
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }
  redirect("/dashboard")
}

export async function signInWithMagicLink(_prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient()
  const email = formData.get("email") as string

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  })

  if (error) return { error: error.message }
  return { error: null }
}

export async function forgotPassword(_prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient()
  const email = formData.get("email") as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/reset-password`,
  })

  if (error) return { error: error.message }
  return { error: null }
}

export async function resetPassword(_prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient()
  const password = formData.get("password") as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }
  redirect("/dashboard")
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/")
}
