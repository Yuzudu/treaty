import Link from 'next/link'
import { FolderOpen, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function StudioPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your client work</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/projects" className="group">
          <Card className="h-full transition-shadow group-hover:shadow-md cursor-pointer">
            <CardHeader className="pb-2">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
              <CardTitle className="text-base mt-2">Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage your client projects and deliverables
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings" className="group">
          <Card className="h-full transition-shadow group-hover:shadow-md cursor-pointer">
            <CardHeader className="pb-2">
              <Settings className="h-6 w-6 text-muted-foreground" />
              <CardTitle className="text-base mt-2">Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure your account and preferences
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
