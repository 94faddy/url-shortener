'use client'

import { useRouter } from 'next/navigation'

export default function DisabledPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-6">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">ลิงก์ถูกปิดใช้งาน</h1>
          <p className="text-gray-400 text-lg mb-8">
            ลิงก์ที่คุณพยายามเข้าถึงถูกปิดใช้งานโดยเจ้าของ
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
          >
            กลับหน้าหลัก
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 bg-transparent"
          >
            ไปที่แดชบอร์ด
          </button>
        </div>
      </div>
    </div>
  )
}