import { spFetch, type PublicProjectDetail } from '@/lib/api'
import { notFound } from 'next/navigation'
import ApplyWidget from './ApplyWidget'
import CoffeeChatPicker from './CoffeeChatPicker'
import TelemetryOnMount from './TelemetryOnMount'

export const dynamic = 'force-dynamic'

async function getProject(id: string): Promise<PublicProjectDetail> {
  return spFetch<PublicProjectDetail>(`/api/public/projects/${id}`)
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const id = params.id
  let p: PublicProjectDetail
  try {
    p = await getProject(id)
  } catch (e) {
    // Friendly 404 for hidden/draft/paused projects per PRD
    notFound()
  }
  return (
    <div className="p-6">
      <TelemetryOnMount event="project_view" payload={{ id: Number(id) }} />
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
            <div className="grid grid-cols-2 gap-3 text-sm text-foreground/80">
              {p.mode && <div><span className="text-muted-foreground">Mode:</span> {p.mode}</div>}
              {p.location_text && <div><span className="text-muted-foreground">Location:</span> {p.location_text}</div>}
              {p.duration_weeks && <div><span className="text-muted-foreground">Duration:</span> {p.duration_weeks} weeks</div>}
              {p.commitment_hours_per_week && <div><span className="text-muted-foreground">Hours/week:</span> {p.commitment_hours_per_week}</div>}
              {p.team_size && <div><span className="text-muted-foreground">Open roles:</span> Analyst (team size {p.team_size})</div>}
            </div>
            {p.team_requirements && (
              <div className="text-sm"><span className="text-muted-foreground">Requirements:</span> {p.team_requirements}</div>
            )}
            {(p.status||'active').toLowerCase()==='closed' && p.showcase_pdf_url ? (
              <div className="mt-4">
                <div className="text-sm text-muted-foreground mb-1">Showcase (PDF)</div>
                <iframe src={`/${p.showcase_pdf_url}`} className="w-full h-96 rounded border border-border" title="Project Showcase" />
              </div>
            ) : null}
          </div>
          <div className="space-y-4">
            <div id="apply">
            <ApplyWidget
              projectId={Number(id)}
              allowApply={!!p.allow_applications && (!p.applications_close_date || (new Date(p.applications_close_date) >= new Date()))}
              questions={p.questions || []}
            />
            </div>
            {p.allow_applications ? (
              <div id="coffeechat">
                <CoffeeChatPicker />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
