import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function PostAuthRedirect() {
  const user = await currentUser()
  const role = (user?.publicMetadata?.role as string) || 'STUDENT'
  redirect(role === 'PARTNER_ADMIN' ? '/admin/dashboard' : '/projects')
}
