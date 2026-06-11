import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api-client"

// Replace with real Supabase session hook
export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<{ id: string; email: string }>("/auth/me"),
    enabled: false, // stub: disabled until auth is wired
    retry: false,
  })
}
