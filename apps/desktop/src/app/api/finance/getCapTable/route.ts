import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 0

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get('entity_id')
  try {
    const url = entityId ? `/api/investor-relations/cap-table?entity_id=${encodeURIComponent(entityId)}` : '/api/investor-relations/cap-table'
    const r = await fetch(url, {
      cache: 'no-store',
      // Forward auth context (Authorization header or cookies) to backend
      headers: {
        ...(req.headers.get('authorization') ? { authorization: req.headers.get('authorization') as string } : {}),
        ...(req.headers.get('cookie') ? { cookie: req.headers.get('cookie') as string } : {}),
      },
    })
    const j = await r.json()
    return NextResponse.json(j)
  } catch {
    return NextResponse.json({ summary: null, classes: [], rounds: [] })
  }
}
