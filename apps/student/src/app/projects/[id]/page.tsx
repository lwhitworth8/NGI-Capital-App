import { spFetch, type PublicProjectDetail } from '@/lib/api'
import ApplyWidget from './ApplyWidget'

export const dynamic = 'force-dynamic'

async function getProject(id: string): Promise<PublicProjectDetail> {
  return spFetch<PublicProjectDetail>(`/api/public/projects/${id}`)
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const id = params.id
  const p = await getProject(id)
  return (
    <div className="p-6">
      {/* Hero */}
      <div className="rounded-2xl overflow-hidden border border-border bg-card">
        {p.hero_image_url ? (
          <img src={p.hero_image_url} alt="" className="w-full h-56 object-cover" />
        ) : (
          <div className="w-full h-20 bg-muted" />
        )}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="text-xs uppercase text-muted-foreground">{p.client_name}</div>
            <h1 className="text-2xl font-semibold">{p.project_name}</h1>
            <div className="text-sm text-muted-foreground">{p.summary}</div>
            <div className="flex flex-wrap gap-1">
              {(p.tags || []).map((t, i) => (
                <span key={i} className="text-[10px] bg-muted px-2 py-[2px] rounded">{t}</span>
              ))}
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-sm text-foreground/90">{p.description || ''}</p>
            </div>
          </div>
          <div>
            <ApplyWidget projectId={Number(id)} allowApply={!!p.allow_applications} coffeechat={p.coffeechat_calendly || ''} />
          </div>
        </div>
      </div>
    </div>
  )
}

