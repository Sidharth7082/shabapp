// Supabase Edge Function: verify-otp
// Verifies the customer code server-side, then marks the job authorised.
// Deploy: supabase functions deploy verify-otp

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'unauthorized' }, 401)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401)

  const body = await request.json().catch(() => ({}))
  const { jobId, code } = body as { jobId?: string; code?: string }
  if (!jobId || !code) return json({ error: 'job_and_code_required' }, 400)

  const { data: employee } = await admin
    .from('employees')
    .select('id, role')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()
  if (!employee) return json({ error: 'not_an_employee' }, 403)

  const { data: job } = await admin
    .from('jobs')
    .select('id, assigned_to, status')
    .eq('id', jobId)
    .maybeSingle()
  if (!job) return json({ error: 'job_not_found' }, 404)
  if (job.assigned_to !== employee.id && employee.role !== 'manager') {
    return json({ error: 'not_assigned' }, 403)
  }

  const { data: challenge } = await admin
    .from('otp_challenges')
    .select('id, code_hash, salt, attempts, max_attempts, expires_at, verified_at, consumed_at')
    .eq('job_id', jobId)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!challenge) return json({ ok: false, reason: 'missing' }, 200)
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return json({ ok: false, reason: 'expired' }, 200)
  }
  if (challenge.attempts >= challenge.max_attempts) {
    return json({ ok: false, reason: 'exhausted' }, 200)
  }

  const candidate = await sha256(`${challenge.salt}:${String(code).trim()}`)

  if (candidate !== challenge.code_hash) {
    const attempts = challenge.attempts + 1
    await admin.from('otp_challenges').update({ attempts }).eq('id', challenge.id)
    return json(
      {
        ok: false,
        reason: attempts >= challenge.max_attempts ? 'exhausted' : 'wrong',
        attemptsLeft: Math.max(0, challenge.max_attempts - attempts)
      },
      200
    )
  }

  const now = new Date().toISOString()
  await admin
    .from('otp_challenges')
    .update({ verified_at: now, consumed_at: now })
    .eq('id', challenge.id)

  await admin.from('jobs').update({ otp_verified_at: now }).eq('id', jobId)
  await admin.from('job_events').insert({
    job_id: jobId,
    employee_id: employee.id,
    event: 'otp_verified',
    payload: {}
  })

  return json({ ok: true, verifiedAt: now })
})
