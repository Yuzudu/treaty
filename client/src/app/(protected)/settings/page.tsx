export const dynamic = "force-dynamic"

export const metadata = {
  title: "Settings — Treaty",
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account preferences.
        </p>
      </div>
      <div className="rounded-lg border p-6">
        {/* Account settings form */}
        <p className="text-sm text-muted-foreground">Account settings coming soon.</p>
      </div>
    </div>
  )
}
