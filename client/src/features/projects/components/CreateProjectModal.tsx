'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCreateProject } from '../hooks/useCreateProject'

export function CreateProjectModal() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const { mutate, isPending, error } = useCreateProject()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    mutate(title.trim(), {
      onSuccess: () => {
        setOpen(false)
        setTitle('')
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          {error && (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
