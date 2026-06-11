// Import and re-export annotation types from @treaty/shared once defined
export interface Annotation {
  id: string
  assetId: string
  x: number
  y: number
  comment: string
  createdAt: string
}
