"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { signUp } from "../api/auth.api"
import type { AuthResult } from "../types"

const initialState: AuthResult = { error: null }

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initialState)

  return (
    <form action={action} className="space-y-3">
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
          autoComplete="new-password"
          minLength={8}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {!state.error && !pending && state !== initialState && (
        <p className="text-sm text-green-600">
          Account created! Check your email to confirm.
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  )
}
