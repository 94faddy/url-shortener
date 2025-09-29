// /app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

// 🔧 เปลี่ยนเป็น force initialize (ไม่เช็ค NODE_ENV)
if (typeof window === 'undefined') {
  console.log('🏁 Starting application...')
  
  import('@/lib/scheduler').then(({ initializeScheduler }) => {
    console.log('📦 Scheduler module loaded, initializing...')
    initializeScheduler()
  }).catch((error) => {
    console.error('❌ Failed to initialize scheduler:', error)
  })
}

export const metadata: Metadata = {
  title: 'URL Shortener - ระบบย่อลิงก์',
  description: 'ระบบย่อลิงก์ที่มีการจัดการและสถิติการใช้งาน',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}