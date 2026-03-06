import { NextRequest, NextResponse } from 'next/server'

const SCRIPT_URL = process.env.GOOGLE_SHEETS_SCRIPT_URL

export async function POST(req: NextRequest) {
  if (!SCRIPT_URL) {
    console.warn('[transactions] GOOGLE_SHEETS_SCRIPT_URL not configured — skipping')
    return NextResponse.json({ success: true, skipped: true })
  }

  const body = await req.json()

  try {
    // Google Apps Script executes doPost() the moment it receives the POST.
    // It then returns a 302 redirect to a cached "response URL".
    // Following that redirect (GET) returns a stale cached response — NOT a fresh execution.
    // Fix: use redirect:'manual' so we stop at the 302.
    // A 302 means GAS accepted the POST and ran the script successfully.
    // We add ?t=timestamp to prevent any upstream HTTP caching.
    const url = `${SCRIPT_URL}?t=${Date.now()}`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache, no-store',
      },
      body: JSON.stringify(body),
      redirect: 'manual',
    })

    console.log('[transactions] GAS status:', res.status)

    // 302 = script received + executed the POST, redirecting to response URL
    // 200 = direct response (no redirect, also fine)
    if (res.status === 302 || res.status === 200) {
      return NextResponse.json({ success: true })
    }

    // Anything else is a real error
    const text = await res.text().catch(() => '')
    console.error('[transactions] unexpected status:', res.status, text.slice(0, 200))
    return NextResponse.json(
      { success: false, error: `GAS returned ${res.status}` },
      { status: 502 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[transactions] fetch error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 502 })
  }
}
