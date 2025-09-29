import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Embed จาก next.config.ts ผ่าน env
const rawHosts = process.env.ALLOWED_HOSTS || ''
const ALLOWED_HOSTNAMES = rawHosts.split(',').map(h => h.trim().toLowerCase())

export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get('host') || ''
  const hostname = hostHeader.split(':')[0].toLowerCase()

  // Debug log (ดูได้ใน console ขณะรัน build/start)
  console.log('🌐 Host Header:', hostHeader)
  console.log('🔍 Extracted Hostname:', hostname)
  console.log('✅ Allowed Hostnames:', ALLOWED_HOSTNAMES)

  // บล็อกถ้า hostname ไม่อยู่ในรายการ
  if (!ALLOWED_HOSTNAMES.includes(hostname)) {
    return new NextResponse('❌ Access denied by domain policy.', { status: 403 })
  }

  return NextResponse.next()
}

// ให้ตรวจทุก route (ยกเว้น static/API)
export const config = {
  matcher: ['/', '/((?!_next|favicon.ico|api|static).*)'],
}
