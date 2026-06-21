'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { createProjectsApi } from '../api/projects.api'
import { useCreateProject } from '../hooks/useCreateProject'

export function CreateProjectModal() {
  const router = useRouter()
  const { data: auth } = useAuth()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const { mutateAsync, isPending, error } = useCreateProject()

  function reset() {
    setTitle('')
    setStagedFile(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    let project
    try {
      project = await mutateAsync(title.trim())
    } catch {
      return
    }
    if (stagedFile && auth) {
      setUploading(true)
      try {
        await createProjectsApi(auth.token).uploadAsset(project.id, stagedFile)
      } catch {
        toast.error('Upload failed — retry on the project page')
      } finally {
        setUploading(false)
      }
    }
    setOpen(false)
    reset()
    router.push(`/projects/${project.id}`)
  }

  const busy = isPending || uploading

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!busy) {
        setOpen(val)
        if (!val) reset()
      }
    }}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer shadow-sm hover:shadow transition-all font-medium">
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-110 p-6 gap-6 rounded-xl border border-border bg-card shadow-lg">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
            Create New Project
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Give your project a title. Files can be added now or from the project page.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium text-foreground">
              Project Title
            </label>
            <Input
              id="title"
              placeholder="e.g. Summer Campaign Graphic Layout"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Files{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            {stagedFile ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30 text-sm">
                <span className="truncate flex-1 text-foreground">{stagedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setStagedFile(null)}
                  disabled={busy}
                  className="text-muted-foreground hover:text-destructive shrink-0 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary/50 bg-muted/10 hover:bg-primary/5 cursor-pointer transition-all"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
                    setStagedFile(file)
                  }
                }}
              >
                <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Drop a file, or{' '}
                  <span className="text-foreground underline underline-offset-2">browse</span>
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setStagedFile(file)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>

          {error && (
            <p className="text-xs font-medium text-destructive">
              {(error as Error).message}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => { setOpen(false); reset() }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || !title.trim()}
              className="cursor-pointer font-medium min-w-30 flex items-center justify-center gap-1.5"
            >
              {isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              ) : uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
              ) : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
