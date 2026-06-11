export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/20">
      <header className="border-b bg-background py-3">
        <div className="container mx-auto px-4 text-center">
          <span className="text-sm font-semibold">Treaty</span>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">{children}</main>
    </div>
  )
}
