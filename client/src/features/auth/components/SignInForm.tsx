'use client'

import { use, useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { signInWithMagicLink } from '../api/auth.api'
import type { AuthResult } from '../types'

const initialState: AuthResult = { error: null }

export function SignInForm({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error: callbackError, next } = use(searchParams)
  const [magicState, magicAction, magicPending] = useActionState(signInWithMagicLink, initialState)
  const [cooldown, setCooldown] = useState(0)
  const sent = !magicState.error && !magicPending && magicState !== initialState

  useEffect(() => {
    if (!sent) return
    setCooldown(30)
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [sent])

  return (
    <div className="space-y-6">
      {callbackError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Sign-in failed. Please try again.
        </p>
      )}
      <form action={magicAction} className="space-y-3">
        <input type="hidden" name="next" value={next ?? '/studio'} />
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {magicState.error && (
          <p className="text-sm text-destructive">{magicState.error}</p>
        )}
        {sent && (
          <p className="text-sm text-green-600">Check your email for a sign-in link.</p>
        )}
        <Button type="submit" className="w-full" disabled={magicPending || cooldown > 0}>
          {magicPending
            ? 'Sending…'
            : cooldown > 0
            ? `Resend in ${cooldown}s`
            : sent
            ? 'Resend magic link'
            : 'Send magic link'}
        </Button>
      </form>
    </div>
  )
}
