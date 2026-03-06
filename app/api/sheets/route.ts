import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy GET endpoint — fetches data from Google Apps Script on the server side
 * (avoids browser CORS restrictions on GAS deployments).
 *
 * Usage: GET /api/sheets?action=getProducts
 *        GET /api/sheets?action=getIngredients
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const scriptUrl = process.env.GOOGLE_SHEETS_SCRIPT_URL

  if (!scriptUrl || !action) {
    return NextResponse.json([])
  }

  try {
    const res = await fetch(`${scriptUrl}?action=${action}`, {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'application/json' },
      // next.js server-side fetch — no CORS, no browser restrictions
    })

    if (!res.ok) return NextResponse.json([])

    const data: unknown = await res.json()
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch {
    return NextResponse.json([])
  }
}
