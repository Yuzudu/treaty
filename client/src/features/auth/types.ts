import type { User, Session } from "@supabase/supabase-js"

export type { User, Session }

export interface AuthResult {
  error: string | null
}
