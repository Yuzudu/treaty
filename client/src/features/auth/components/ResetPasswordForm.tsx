"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { resetPassword } from "../api/auth.api"
import type { AuthResult } from "../types"

const initialState: AuthResult = { error: null }

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, initialState)

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          New password
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
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  )
}
