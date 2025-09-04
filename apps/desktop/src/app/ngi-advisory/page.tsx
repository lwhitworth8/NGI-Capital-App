import { redirect } from 'next/navigation'

export default function Page() {
  // Manager dashboard defaults to Projects
  redirect('/ngi-advisory/projects')
}

