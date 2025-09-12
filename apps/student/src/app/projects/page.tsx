import { spFetch, type PublicProject } from '@/lib/api'
import ProjectsClient from './ProjectsClient'
export const dynamic = 'force-dynamic'

export default async function ProjectsPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const qp = (k: string) => {
    const v = searchParams?.[k]
    return Array.isArray(v) ? v[0] : (v || '')
  }
  const q = qp('q')
  const tags = qp('tags')
  const mode = qp('mode')
  const location = qp('location')
  const sort = qp('sort')
  const limit = 20
  const params = new URLSearchParams()
  if (q) params.set('q', String(q))
  if (tags) params.set('tags', String(tags))
  if (mode) params.set('mode', String(mode))
  if (location) params.set('location', String(location))
  if (sort) params.set('sort', String(sort))
  params.set('limit', String(limit))
  params.set('offset', '0')
  const url = '/api/public/projects' + (params.toString() ? `?${params.toString()}` : '')
  const items: PublicProject[] = await spFetch<PublicProject[]>(url).catch(()=>[] as PublicProject[])
  return (
    <div className="p-6">
      <ProjectsClient
        initialItems={items}
        initialQ={String(q || '')}
        initialTags={(String(tags || '').split(',').filter(Boolean))}
        initialMode={String(mode || '')}
        initialLocation={String(location || '')}
        initialSort={(String(sort || 'newest') as any)}
        pageSize={limit}
      />
    </div>
  )
}
