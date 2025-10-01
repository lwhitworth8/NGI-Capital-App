import { clerkClient } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

function pickEmail(data: any): string {
  try {
    const p = data?.primary_email_address?.email_address || data?.primaryEmailAddress?.emailAddress
    if (p) return String(p).toLowerCase()
    const arr = data?.email_addresses || data?.emailAddresses || []
    for (const e of arr) {
      const v = e?.email_address || e?.emailAddress
      if (v) return String(v).toLowerCase()
    }
  } catch {}
  return ''
}

// Simple webhook signature verification if svix is not available
function verifyWebhookSignature(payload: string, headers: Headers): boolean {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.warn('CLERK_WEBHOOK_SECRET not set, skipping signature verification')
    return true // Allow in development, but log warning
  }
  
  // Check for Clerk webhook headers
  const svixId = headers.get('svix-id')
  const svixTimestamp = headers.get('svix-timestamp')
  const svixSignature = headers.get('svix-signature')
  
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn('Missing svix headers')
    return false
  }
  
  // In production, you should use the svix library for proper verification
  // For now, we'll accept the webhook if headers are present
  return true
}

export async function POST(req: Request) {
  try {
    const payload = await req.text()
    const headersList = await headers()
    
    // Verify webhook signature
    if (!verifyWebhookSignature(payload, headersList)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    const body = JSON.parse(payload)
    const type = body?.type as string
    const data = body?.data
    
    if (!data?.id) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    
    const userId = data.id as string
    const email = pickEmail(data)
    
    // Check both PARTNER_EMAILS and ADMIN_EMAILS
    const partners = (process.env.PARTNER_EMAILS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
    const admins = (process.env.ADMIN_EMAILS || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
    
    const isPartner = email && partners.includes(email)
    const isAdmin = email && (admins.includes(email) || isPartner)
    
    const role = isAdmin ? 'PARTNER_ADMIN' : 'STUDENT'
    
    // Update user metadata in Clerk (support function or object forms)
    if (type === 'user.created' || type === 'user.updated') {
      const cc: any = typeof (clerkClient as any) === 'function' ? await (clerkClient as any)() : (clerkClient as any)
      await cc?.users?.updateUserMetadata?.(userId, { 
        publicMetadata: { 
          role, 
          email,
          isAdmin,
          updatedAt: new Date().toISOString()
        } 
      })
      
      console.log(`Updated user ${userId} (${email}) with role: ${role}`)
    }
    
    return NextResponse.json({ ok: true, type, role, userId })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 400 })
  }
}
