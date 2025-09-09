import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Marketing from '@/components/marketing/MarketingHome'

export default async function Home() {
  const user = await currentUser()
  if (user) {
    const role = (user.publicMetadata?.role as string) || 'STUDENT'
    redirect(role === 'PARTNER_ADMIN' ? '/admin/dashboard' : '/projects')
  }
  return <Marketing />
}
