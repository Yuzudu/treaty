'use client'
import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export interface AuthSession {
  userId: string
  token: string
}

// getSession() reads from local storage — no network call.
// This hook retrieves the token to send to the API; it does NOT authorize anything.
// The NestJS SupabaseAuthGuard is the actual security boundary.
export function useAuth() {
  return useQuery<AuthSession | null>({
    queryKey: ['auth'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null
      return { userId: session.user.id, token: session.access_token }
    },
    staleTime: 5 * 60 * 1000,
  })
}
