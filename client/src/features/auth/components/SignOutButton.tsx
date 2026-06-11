"use client"

import { Button } from "@/components/ui/button"
import { signOut } from "../api/auth.api"

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        Sign out
      </Button>
    </form>
  )
}
