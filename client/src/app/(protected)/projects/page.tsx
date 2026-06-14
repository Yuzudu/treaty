import { CreateProjectModal, ProjectList } from "@/features/projects";

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <CreateProjectModal />
      </div>
      <ProjectList />
    </div>
  )
}
