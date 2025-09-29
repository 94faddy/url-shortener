'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function UrlShortenerForm() {
  const [formData, setFormData] = useState({
    originalUrl: '',
    customCode: '',
    title: '',
    description: '',
    expiresAt: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<any>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess(null)

    try {
      const response = await fetch('/api/urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'เกิดข้อผิดพลาด')
      }

      const result = await response.json()
      setSuccess(result)
      
      // Reset form
      setFormData({
        originalUrl: '',
        customCode: '',
        title: '',
        description: '',
        expiresAt: ''
      })

    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Show temporary success state
      const originalText = 'คัดลอก'
      const button = document.querySelector('.copy-btn') as HTMLElement
      if (button) {
        button.textContent = 'คัดลอกแล้ว!'
        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Original URL */}
        <div className="group">
          <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            URL ต้นฉบับ *
          </label>
          <div className="relative">
            <input
              type="url"
              name="originalUrl"
              value={formData.originalUrl}
              onChange={handleChange}
              placeholder="https://example.com/very-long-url"
              required
              className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm pl-12"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
        </div>

        {/* Custom Code */}
        <div className="group">
          <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            รหัสกำหนดเอง (ไม่บังคับ)
          </label>
          <div className="flex rounded-xl overflow-hidden">
            <span className="inline-flex items-center px-4 text-sm text-gray-300 bg-gray-800/50 border border-gray-700/50 border-r-0 rounded-l-xl">
              {typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}/
            </span>
            <input
              type="text"
              name="customCode"
              value={formData.customCode}
              onChange={handleChange}
              placeholder="my-link"
              pattern="[a-zA-Z0-9-_]+"
              className="flex-1 px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 rounded-r-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            ใช้ได้เฉพาะตัวอักษร ตัวเลข เครื่องหมาย - และ _
          </p>
        </div>

        {/* Title */}
        <div className="group">
          <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            ชื่อลิงก์ (ไม่บังคับ)
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="ชื่อที่ใช้จำลิงก์"
            className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm"
          />
        </div>

        {/* Description */}
        <div className="group">
          <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            คำอธิบาย (ไม่บังคับ)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="คำอธิบายเพิ่มเติม"
            rows={3}
            className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm resize-none"
          />
        </div>

        {/* Expiration Date */}
        <div className="group">
          <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            วันหมดอายุ (ไม่บังคับ)
          </label>
          <input
            type="datetime-local"
            name="expiresAt"
            value={formData.expiresAt}
            onChange={handleChange}
            className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700/50 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl group hover:scale-[1.02]"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
              กำลังสร้าง...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              สร้างลิงก์สั้น
            </span>
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl p-6 animate-fade-in-up">
          <div className="flex items-start">
            <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-6 animate-fade-in-up">
          <div className="flex items-start mb-4">
            <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-bold text-emerald-300 mb-2">สร้างลิงก์สำเร็จ! 🎉</h3>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-emerald-300 mb-2">ลิงก์สั้น:</label>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={typeof window !== 'undefined' ? `${window.location.origin}/${success.shortCode}` : ''}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-900/50 border border-emerald-500/30 rounded-xl text-emerald-100 font-mono text-sm backdrop-blur-sm"
                />
                <button
                  onClick={() => copyToClipboard(typeof window !== 'undefined' ? `${window.location.origin}/${success.shortCode}` : '')}
                  className="copy-btn bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  คัดลอก
                </button>
              </div>
            </div>
            
            {success.title && (
              <div>
                <label className="block text-sm font-semibold text-emerald-300 mb-1">ชื่อลิงก์:</label>
                <p className="text-emerald-100">{success.title}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center shadow-lg"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              ดูในแดชบอร์ด
            </button>
            <button
              onClick={() => window.open(typeof window !== 'undefined' ? `${window.location.origin}/${success.shortCode}` : '', '_blank')}
              className="bg-gray-800/50 border border-gray-700/50 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:bg-gray-700/50 flex items-center backdrop-blur-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              ทดสอบลิงก์
            </button>
          </div>
        </div>
      )}
    </div>
  )
}