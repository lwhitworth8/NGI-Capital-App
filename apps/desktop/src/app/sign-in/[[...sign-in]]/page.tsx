import { redirect } from 'next/navigation'

export default function AdminSignInRedirect() {
  // All users sign in through the main portal
  redirect(process.env.NEXT_PUBLIC_STUDENT_BASE_URL || 'http://localhost:3001/sign-in')
}