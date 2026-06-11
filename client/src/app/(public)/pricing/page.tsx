export const metadata = {
  title: "Pricing — Treaty",
}

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h1>
        <p className="mt-4 text-muted-foreground">
          Start free. Upgrade when you need more.
        </p>
      </div>
      <div className="mt-16 flex justify-center">
        <div className="rounded-xl border p-8 text-center max-w-sm w-full">
          <p className="text-sm font-medium text-muted-foreground">Free</p>
          <p className="mt-2 text-4xl font-bold">$0</p>
          <p className="mt-1 text-sm text-muted-foreground">per month</p>
          <ul className="mt-6 space-y-2 text-sm text-left">
            <li className="flex gap-2"><span>✓</span> 3 active projects</li>
            <li className="flex gap-2"><span>✓</span> Secure share links</li>
            <li className="flex gap-2"><span>✓</span> Payment collection</li>
          </ul>
          {/* Add paid tier */}
        </div>
      </div>
    </div>
  )
}
