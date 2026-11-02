# OTP and live-camera security

## OTP lifecycle

1. Technician opens a job and taps **Send OTP**. The request carries the job id and the
   technician's bearer token.
2. `send-otp` confirms the caller is an employee assigned to that job (or a manager),
   refuses closed jobs, and applies the 5-per-hour rate limit.
3. A 6-digit code is generated with `crypto.getRandomValues`, salted with a UUID and
   hashed with SHA-256. Only the hash and salt are stored in `otp_challenges`.
4. The code is sent to the customer's phone through MSG91 (SMS) or the WhatsApp Cloud API.
   The response to the app contains only a masked number and the expiry time.
5. `verify-otp` looks up the newest unconsumed challenge, rejects expired rows, enforces
   three attempts, compares hashes, then marks the challenge consumed and sets
   `jobs.otp_verified_at` plus an audit row in `job_events`.

Rules enforced by the schema and functions:

- 5-minute expiry, single use, three attempts.
- Only one active challenge per job (trigger expires earlier rows).
- OTP rows are revoked from `anon` and `authenticated`; only the service role touches them.
- Work start is blocked in the UI until `otp_verified_at` is present.

### Demo mode

Without Supabase credentials the app runs `src/services/otp.ts`, which implements the
same state machine on-device and displays the code in a clearly labelled demo banner.
That path exists so the flow can be tested; it is not a security boundary.

## Live camera enforcement

The requirement is that a technician cannot attach a photo from the gallery.

**How it is enforced:** there is no file input anywhere in the app. A capture starts
`navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`, draws the
live frame to a canvas, burns the watermark into the pixels, and encodes JPEG. Because no
`<input type="file">` or picker exists, a gallery selection has no code path to travel.

This is asserted against the production bundle:

```bash
grep -o 'type:"file"' dist/assets/*.js | wc -l   # 0
grep -o 'accept:"image' dist/assets/*.js | wc -l # 0
```

**Watermark contents:** job code, service name, before/after marker, employee name,
capture timestamp, GPS latitude/longitude and accuracy. Text is drawn into the image
itself, so cropping or re-sharing keeps the evidence trail.

**Failure behaviour:** if permission is denied or the API is unavailable, the service
cannot be completed — the step does not offer an alternative upload path.

### Limits to state honestly

- A page cannot prevent OS-level screenshots of the live preview.
- A rooted device or a modified client can bypass any client-side rule; the server should
  treat `watermark` and GPS as reported metadata, not ground truth.
- GPS is requested at capture time and may be unavailable indoors. The photo still
  records "GPS unavailable" rather than failing silently.
- Native enforcement (and stronger device attestation) arrives with the Capacitor wrapper.
