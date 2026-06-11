export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-xl font-bold tracking-tight">Treaty</span>
        </div>
        {children}
      </div>
    </div>
  )
}
