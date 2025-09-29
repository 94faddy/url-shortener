'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { EditUrlModal } from './edit-url-modal'
import { QRCodeGenerator } from '../qr-code-generator'
import Link from 'next/link'

interface Url {
  id: string
  originalUrl: string
  shortCode: string
  title?: string
  description?: string
  createdAt: string
  isActive: boolean
  expiresAt?: string
  _count: {
    clicks: number
  }
}

export function UrlList() {
  const [urls, setUrls] = useState<Url[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editingUrl, setEditingUrl] = useState<Url | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchUrls = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/urls?page=${page}&limit=10`)
      if (response.ok) {
        const result = await response.json()
        setUrls(result.urls)
        setTotalPages(result.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching URLs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUrls()
  }, [page])

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบลิงก์นี้?')) {
      return
    }

    try {
      const response = await fetch(`/api/urls/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setUrls(urls.filter(url => url.id !== id))
        alert('ลบลิงก์สำเร็จ')
      } else {
        alert('เกิดข้อผิดพลาดในการลบลิงก์')
      }
    } catch (error) {
      console.error('Error deleting URL:', error)
      alert('เกิดข้อผิดพลาดในการลบลิงก์')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Show a toast or notification instead of alert
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300'
      notification.textContent = 'คัดลอกลิงก์แล้ว!'
      document.body.appendChild(notification)
      setTimeout(() => {
        notification.remove()
      }, 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const toggleStatus = async (url: Url) => {
    try {
      const response = await fetch(`/api/urls/${url.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !url.isActive
        })
      })

      if (response.ok) {
        const updatedUrl = await response.json()
        setUrls(urls.map(u => u.id === url.id ? updatedUrl : u))
      }
    } catch (error) {
      console.error('Error toggling URL status:', error)
    }
  }

  const filteredUrls = urls.filter(url =>
    url.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    url.shortCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    url.originalUrl.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-700/50">
          <div className="h-6 bg-gray-700 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-700/50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-gray-700 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/30 to-gray-700/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              ลิงก์ทั้งหมด 
              <span className="ml-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-sm">
                {urls.length}
              </span>
            </h2>
            
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาลิงก์..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {/* URL List */}
        {filteredUrls.length > 0 ? (
          <div className="divide-y divide-gray-700/50">
            {filteredUrls.map((url) => (
              <div key={url.id} className="p-6 hover:bg-gray-700/20 transition-all duration-200 group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* URL Title/Description */}
                    <div className="flex items-center flex-wrap gap-3 mb-3">
                      <h3 className="text-sm font-medium text-white truncate">
                        {url.title || 'ไม่มีชื่อ'}
                      </h3>
                      
                      {/* Status Badge */}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                        url.isActive 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {url.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>

                      {/* Expiry Badge */}
                      {url.expiresAt && new Date(url.expiresAt) < new Date() && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          หมดอายุ
                        </span>
                      )}
                    </div>

                    {/* URLs */}
                    <div className="space-y-2">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs text-gray-400 font-medium">ลิงก์สั้น:</span>
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/${url.shortCode}`)}
                          className="text-sm text-blue-400 hover:text-blue-300 font-mono bg-gray-900/50 border border-gray-700/50 px-3 py-1 rounded-lg hover:bg-gray-800/50 transition-all duration-200 hover:scale-105"
                        >
                          {window.location.host}/{url.shortCode}
                        </button>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 font-medium mt-0.5">ลิงก์เดิม:</span>
                        <a
                          href={url.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-300 hover:text-blue-400 transition-colors duration-200 break-all max-w-md"
                        >
                          {url.originalUrl}
                        </a>
                      </div>
                    </div>

                    {/* Stats and Meta */}
                    <div className="flex items-center flex-wrap gap-4 mt-4 text-xs text-gray-400">
                      <span className="flex items-center bg-gray-900/30 px-2 py-1 rounded-lg">
                        <svg className="w-4 h-4 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                        <span className="text-emerald-400 font-medium">{url._count.clicks}</span> คลิก
                      </span>
                      
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(new Date(url.createdAt))}
                      </span>

                      {url.expiresAt && (
                        <span className="flex items-center text-amber-400">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          หมดอายุ: {formatDate(new Date(url.expiresAt))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                    <QRCodeGenerator 
                      url={`${window.location.origin}/${url.shortCode}`} 
                      title={url.title}
                    />

                    <Link
                      href={`/analytics/${url.id}`}
                      className="p-2 text-gray-400 hover:text-emerald-400 transition-all duration-200 hover:scale-110 hover:bg-emerald-500/10 rounded-lg"
                      title="ดูสถิติ"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </Link>

                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/${url.shortCode}`)}
                      className="p-2 text-gray-400 hover:text-blue-400 transition-all duration-200 hover:scale-110 hover:bg-blue-500/10 rounded-lg"
                      title="คัดลอกลิงก์"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => toggleStatus(url)}
                      className={`p-2 transition-all duration-200 hover:scale-110 rounded-lg ${
                        url.isActive 
                          ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' 
                          : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title={url.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    >
                      {url.isActive ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>

                    <button
                      onClick={() => setEditingUrl(url)}
                      className="p-2 text-gray-400 hover:text-blue-400 transition-all duration-200 hover:scale-110 hover:bg-blue-500/10 rounded-lg"
                      title="แก้ไข"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleDelete(url.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-all duration-200 hover:scale-110 hover:bg-red-500/10 rounded-lg"
                      title="ลบ"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="bg-gray-900/30 rounded-2xl p-8 max-w-md mx-auto">
              <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-2">ยังไม่มีลิงก์</h3>
              <p className="text-gray-400">สร้างลิงก์สั้นแรกของคุณเพื่อเริ่มต้น</p>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-between bg-gray-800/30">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 border border-gray-600/50 rounded-lg hover:bg-gray-600/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              ← ก่อนหน้า
            </button>
            
            <span className="text-sm text-gray-300 font-medium">
              หน้า <span className="text-blue-400">{page}</span> จาก <span className="text-blue-400">{totalPages}</span>
            </span>
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 border border-gray-600/50 rounded-lg hover:bg-gray-600/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              ถัดไป →
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUrl && (
        <EditUrlModal
          url={editingUrl}
          onClose={() => setEditingUrl(null)}
          onUpdate={(updatedUrl) => {
            setUrls(urls.map(u => u.id === updatedUrl.id ? updatedUrl : u))
            setEditingUrl(null)
          }}
        />
      )}
    </>
  )
}