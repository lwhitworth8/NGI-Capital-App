import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { clerkClient } from '@clerk/nextjs/server'

export async function POST(req: Request){
  try {
    const { theme } = await req.json() as { theme?: 'light'|'dark'|'system' }
    const t = (theme || 'system') as 'light'|'dark'|'system'
    const user = await currentUser()
    if (!user) return new Response('Unauthorized', { status: 401 })
    await clerkClient.users.updateUserMetadata(user.id, { publicMetadata: { theme: t } })
    return new Response('ok')
  } catch (e: any) {
    return new Response('bad request', { status: 400 })
  }
}

