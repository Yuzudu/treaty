export const dynamic = "force-dynamic"

export const metadata = {
  title: "Dashboard — Treaty",
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your client deliverables.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">
          {/* Replace with real ProjectList from features/projects */}
          No projects yet. Create your first project to get started.
        </p>
      </div>
    </div>
  )
}
