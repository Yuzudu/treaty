import { useQuery } from "@tanstack/react-query"
import { shareApi } from "../api/share.api"

export function useShareLink(token: string) {
  return useQuery({
    queryKey: ["share", token],
    queryFn: () => shareApi.getByToken(token),
    enabled: Boolean(token),
    retry: false,
  })
}
