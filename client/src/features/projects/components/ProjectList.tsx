import type { Project } from "../types"

interface ProjectListProps {
  projects: Project[]
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return <p className="text-muted-foreground text-sm">No projects yet.</p>
  }

  return (
    <ul className="divide-y">
      {projects.map((p) => (
        <li key={p.id} className="py-3 text-sm">
          <span className="font-medium">{p.title}</span>
          <span className="text-muted-foreground ml-2 font-mono text-xs">{p.status}</span>
        </li>
      ))}
    </ul>
  )
}
