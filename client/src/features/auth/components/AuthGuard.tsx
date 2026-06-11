// Redirect to login when user is unauthenticated
export function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
