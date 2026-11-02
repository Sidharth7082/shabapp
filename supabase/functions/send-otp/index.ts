// Supabase Edge Function: send-otp
// Deploy: supabase functions deploy send-otp --no-verify-jwt=false
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MSG91_AUTH_KEY,
//          MSG91_TEMPLATE_ID, MSG91_SENDER_ID (or WHATSAPP_TOKEN + WHATSAPP_PHONE_ID)
//
// The 6-digit code is generated and hashed here. It is never returned to the
// client: the customer receives it on their phone.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TTL_SECONDS = 300
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
}

function sixDigits(): string {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return String(bytes[0] % 1_000_000).padStart(6, '0')
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function deliver(phone: string, code: string): Promise<void> {
  const msg91Key = Deno.env.get('MSG91_AUTH_KEY')
  if (msg91Key) {
    const response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: { authkey: msg91Key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: Deno.env.get('MSG91_TEMPLATE_ID'),
        mobile: `91${phone.replace(/\D/g, '').slice(-10)}`,
        otp: code,
        sender: Deno.env.get('MSG91_SENDER_ID')
      })
    })
    if (!response.ok) throw new Error(`MSG91 failed: ${response.status}`)
    return
  }

  const waToken = Deno.env.get('WHATSAPP_TOKEN')
  const waPhone = Deno.env.get('WHATSAPP_PHONE_ID')
  if (waToken && waPhone) {
    const response = await fetch(`https://graph.facebook.com/v21.0/${waPhone}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${waToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `91${phone.replace(/\D/g, '').slice(-10)}`,
        type: 'template',
        template: {
          name: 'service_otp',
          language: { code: 'en' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: code }] }]
        }
      })
    })
    if (!response.ok) throw new Error(`WhatsApp failed: ${response.status}`)
    return
  }

  throw new Error('No OTP provider configured')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'unauthorized' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(url, serviceKey)

  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401)

  const { jobId } = await request.json().catch(() => ({}))
  if (!jobId) return json({ error: 'job_required' }, 400)

  const { data: employee } = await admin
    .from('employees')
    .select('id, role')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()

  if (!employee) return json({ error: 'not_an_employee' }, 403)

  const { data: job } = await admin
    .from('jobs')
    .select('id, phone: customers(phone), assigned_to, status')
    .eq('id', jobId)
    .maybeSingle()

  if (!job) return json({ error: 'job_not_found' }, 404)
  if (job.assigned_to !== employee.id && employee.role !== 'manager') {
    return json({ error: 'not_assigned' }, 403)
  }
  if (job.status === 'completed' || job.status === 'cancelled') {
    return json({ error: 'job_closed' }, 409)
  }

  const { data: allowed } = await admin.rpc('otp_request_allowed', { target_job: jobId })
  if (!allowed) return json({ error: 'rate_limited' }, 429)

  const phone: string = (job as unknown as { phone?: { phone?: string } }).phone?.phone ?? ''
  if (phone.replace(/\D/g, '').length < 10) return json({ error: 'customer_phone_missing' }, 409)

  const code = sixDigits()
  const salt = crypto.randomUUID()
  const codeHash = await sha256(`${salt}:${code}`)
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString()

  const { error: insertError } = await admin.from('otp_challenges').insert({
    job_id: jobId,
    phone,
    code_hash: codeHash,
    salt,
    expires_at: expiresAt,
    requested_ip: request.headers.get('x-forwarded-for')
  })
  if (insertError) return json({ error: 'otp_store_failed' }, 500)

  try {
    await deliver(phone, code)
  } catch (cause) {
    return json({ error: 'delivery_failed', detail: String(cause) }, 502)
  }

  await admin.from('job_events').insert({
    job_id: jobId,
    employee_id: employee.id,
    event: 'otp_sent',
    payload: { expiresAt }
  })

  const masked = `+91 ******${phone.replace(/\D/g, '').slice(-4)}`
  return json({ sentTo: masked, expiresAt })
})
