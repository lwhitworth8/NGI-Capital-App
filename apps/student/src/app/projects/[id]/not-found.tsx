import Link from 'next/link'

export default function NotFoundProject() {
  return (
    <div className="p-6">
      <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-8 text-center">
        <div className="text-2xl font-semibold text-foreground">This project isn’t available.</div>
        <div className="text-sm text-muted-foreground mt-2">It may be hidden or not active at the moment.</div>
        <div className="mt-6">
          <Link href="/projects" className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            Back to Projects
          </Link>
        </div>
      </div>
    </div>
  )
}

