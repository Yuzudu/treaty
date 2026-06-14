import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectStatus } from '@treaty/shared'
import { StatusBadge } from './StatusBadge'
import type { Project } from '../types'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <Card className="transition-shadow group-hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{project.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusBadge status={project.status as ProjectStatus} />
        </CardContent>
      </Card>
    </Link>
  )
}
