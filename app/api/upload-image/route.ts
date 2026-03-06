import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/upload-image
 *
 * Receives a multipart form with:
 *   - file       : the image File (jpg/png/webp)
 *   - scriptUrl  : the Google Apps Script Web App URL for this store
 *
 * Forwards the image as base64 to GAS → Google Drive, and returns the public URL.
 * Running server-side avoids CORS restrictions that block browser → GAS responses.
 *
 * GAS web apps execute doPost on the initial POST, then return a 302 redirect to
 * script.googleusercontent.com which serves the pre-computed response as static content.
 * We POST first (so doPost runs), then follow the redirect with GET (standard 302 behavior).
 */

async function postToGAS(url: string, body: string): Promise<Response> {
  // Step 1: POST to GAS — doPost executes here
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body,
    redirect: 'manual',
  })

  // Step 2: follow the 302 redirect with GET to fetch the pre-computed JSON response
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location')
    if (location) {
      return fetch(location, { redirect: 'follow' })
    }
  }

  return res
}

/**
 * Converts any Google Drive URL to a directly embeddable image URL.
 * Handles: /file/d/ID/view, /open?id=ID, /uc?id=ID, and lh3 URLs.
 */
function toEmbeddableDriveUrl(url: string): string {
  // Already a direct googleusercontent URL — use as-is
  if (url.includes('googleusercontent.com')) return url

  // Extract file ID from /file/d/FILE_ID/...
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`

  // Extract file ID from ?id=FILE_ID or &id=FILE_ID (including uc?export=view&id=...)
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idMatch) return `https://lh3.googleusercontent.com/d/${idMatch[1]}`

  // Unknown format — return as-is and hope for the best
  return url
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const scriptUrl = formData.get('scriptUrl') as string | null

    if (!file || !scriptUrl) {
      return NextResponse.json({ error: 'Missing file or scriptUrl' }, { status: 400 })
    }

    // Validate type and size (max 2 MB)
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG and WebP images are allowed' }, { status: 400 })
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 2 MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64Data = Buffer.from(bytes).toString('base64')

    const gasBody = JSON.stringify({
      action: 'uploadImage',
      filename: file.name,
      mimeType: file.type,
      base64Data,
    })

    const gasRes = await postToGAS(scriptUrl, gasBody)
    const text = await gasRes.text()

    let data: { success?: boolean; url?: string; error?: string }
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json(
        { error: `GAS returned unexpected response (HTTP ${gasRes.status}): ${text.slice(0, 300)}` },
        { status: 502 }
      )
    }

    if (!data.success || !data.url) {
      return NextResponse.json({ error: data.error ?? 'GAS upload failed' }, { status: 502 })
    }

    // Convert any Google Drive URL to a directly embeddable format
    const embeddableUrl = toEmbeddableDriveUrl(data.url)
    return NextResponse.json({ url: embeddableUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
