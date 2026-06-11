import { useQuery } from "@tanstack/react-query"
import { annotationsApi } from "../api/annotations.api"

export function useAnnotations(assetId: string) {
  return useQuery({
    queryKey: ["annotations", assetId],
    queryFn: () => annotationsApi.list(assetId),
    enabled: Boolean(assetId),
  })
}
