import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const dir = join(process.cwd(), 'public')
    mkdirSync(dir, { recursive: true })
    const filePath = join(dir, 'nexpos-bootstrap.json')
    writeFileSync(filePath, JSON.stringify(data))
    return NextResponse.json({ ok: true, keys: Object.keys(data).length })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
