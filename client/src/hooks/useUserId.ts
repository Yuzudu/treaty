'use client'
import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export function useUserId() {
  return useQuery({
    queryKey: ['auth', 'userId'],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user?.id ?? null
    },
    staleTime: 5 * 60 * 1000,
  })
}
