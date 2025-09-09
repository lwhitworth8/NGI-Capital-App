import { spFetch, type PublicProject } from '@/lib/api'
import ProjectsClient from './ProjectsClient'
export const dynamic = 'force-dynamic'

async function getProjects(): Promise<PublicProject[]> {
  return spFetch<PublicProject[]>('/api/public/projects')
}

export default async function ProjectsPage() {
  const items: PublicProject[] = await getProjects()
  return (
    <div className="p-6">
      <ProjectsClient initialItems={items} />
    </div>
  )
}
