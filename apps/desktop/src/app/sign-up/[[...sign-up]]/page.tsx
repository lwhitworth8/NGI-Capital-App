import { redirect } from 'next/navigation'

export default function AdminSignUpRedirect() {
  // Admins don't self-register. Redirect to sign-in.
  // Admin accounts must be created by existing admins.
  redirect('/sign-in')
}

