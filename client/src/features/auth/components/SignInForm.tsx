"use client"

import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { signIn, signInWithMagicLink } from "../api/auth.api"
import type { AuthResult } from "../types"

const initialState: AuthResult = { error: null }

export function SignInForm() {
  const [mode, setMode] = useState<"password" | "magic">("password")
  const [passwordState, passwordAction, passwordPending] = useActionState(signIn, initialState)
  const [magicState, magicAction, magicPending] = useActionState(signInWithMagicLink, initialState)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`text-sm ${mode === "password" ? "font-semibold" : "text-muted-foreground"}`}
        >
          Password
        </button>
        <span className="text-muted-foreground">·</span>
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`text-sm ${mode === "magic" ? "font-semibold" : "text-muted-foreground"}`}
        >
          Magic link
        </button>
      </div>

      {mode === "password" ? (
        <form action={passwordAction} className="space-y-3">
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
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {passwordState.error && (
            <p className="text-sm text-destructive">{passwordState.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={passwordPending}>
            {passwordPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : (
        <form action={magicAction} className="space-y-3">
          <div>
            <label htmlFor="magic-email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="magic-email"
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
          {!magicState.error && !magicPending && magicState !== initialState && (
            <p className="text-sm text-green-600">Check your email for a sign-in link.</p>
          )}
          <Button type="submit" className="w-full" disabled={magicPending}>
            {magicPending ? "Sending…" : "Send magic link"}
          </Button>
        </form>
      )}
    </div>
  )
}
