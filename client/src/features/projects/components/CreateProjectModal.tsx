'use client'

import { useState, useEffect } from 'react'
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
import { useCreateProject } from '../hooks/useCreateProject'
import { useAuth } from '@/hooks/useAuth'
import { createProjectsApi } from '../api/projects.api'
import { Upload, X, FileImage, FileVideo, Loader2 } from 'lucide-react'

function truncateFileName(name: string, maxLength = 30): string {
  if (name.length <= maxLength) return name
  const extension = name.split('.').pop() || ''
  const baseName = name.substring(0, name.lastIndexOf('.'))
  const charsToShow = maxLength - extension.length - 4 // 4 for "..." and dot
  if (charsToShow <= 0) return name.substring(0, maxLength)
  return `${baseName.substring(0, charsToShow)}...${extension}`
}

export function CreateProjectModal() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { mutateAsync, isPending: creatingProject, error: createError } = useCreateProject()
  const { data: auth } = useAuth()

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
      setUploadError('Only image or video files are allowed')
      return
    }

    setFile(selectedFile)
    setUploadError(null)

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile))
    } else {
      setPreviewUrl(null)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (!file) {
      setUploadError('Please select a preview file (image or video)')
      return
    }
    if (!auth?.token) {
      setUploadError('Authentication required')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      // 1. Create the project in database
      const project = await mutateAsync(title.trim())

      // 2. Upload asset file to Supabase storage via NestJS backend
      await createProjectsApi(auth.token).uploadAsset(project.id, file)

      // 3. Reset states and close modal
      setOpen(false)
      setTitle('')
      handleRemoveFile()
    } catch (err) {
      console.error('Project creation or upload failed:', err)
      setUploadError((err as Error).message || 'Failed to complete project setup')
    } finally {
      setUploading(false)
    }
  }

  // Combined loading states
  const isPending = creatingProject || uploading

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isPending) {
        setOpen(val)
        if (!val) {
          setTitle('')
          handleRemoveFile()
          setUploadError(null)
        }
      }
    }}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer shadow-sm hover:shadow transition-all font-medium">
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] p-6 gap-6 rounded-xl border border-border bg-card shadow-lg">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
            Create New Project
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Set up your escrow project by specifying a title and uploading your work-in-progress preview.
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
              disabled={isPending}
              autoFocus
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Upload Work-in-Progress
            </label>
            
            {!file ? (
              <label className="group relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 bg-muted/10 hover:bg-primary/5 rounded-xl cursor-pointer transition-all duration-200">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary mb-3 transition-colors duration-200" />
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                    Click to upload work
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Images or Videos (PNG, JPG, MP4, etc.)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isPending}
                />
              </label>
            ) : (
              <div className="relative flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/20 w-full min-w-0">
                {previewUrl ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-black/5 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-border bg-black/5 flex items-center justify-center flex-shrink-0">
                    {file.type.startsWith('video/') ? (
                      <FileVideo className="w-7 h-7 text-muted-foreground" />
                    ) : (
                      <FileImage className="w-7 h-7 text-muted-foreground" />
                    )}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                    {truncateFileName(file.name)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type.split('/')[0]}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  disabled={isPending}
                  className="rounded-full w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {(uploadError || createError) && (
            <p className="text-xs font-medium text-destructive mt-1">
              {uploadError || (createError as Error).message}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setOpen(false)
                setTitle('')
                handleRemoveFile()
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !title.trim() || !file}
              className="cursor-pointer font-medium min-w-[100px] flex items-center justify-center gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploading ? 'Uploading…' : 'Creating…'}
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
