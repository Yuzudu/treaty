import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from './StatusBadge'
import type { Project } from '../types'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <Card className="transition-shadow group-hover:shadow-md overflow-hidden">
        <div className="aspect-video w-full bg-muted relative">
          {project.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No preview</span>
            </div>
          )}
        </div>
        <CardContent className="p-3 space-y-1">
          <p className="text-sm font-medium truncate">{project.title}</p>
          <StatusBadge status={project.status} />
        </CardContent>
      </Card>
    </Link>
  )
}
