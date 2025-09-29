'use client'

import { useState } from 'react'

interface BulkActionsProps {
  selectedUrls: string[]
  onClearSelection: () => void
  onBulkDelete: (ids: string[]) => void
  onBulkToggleStatus: (ids: string[], isActive: boolean) => void
}

export function BulkActions({ 
  selectedUrls, 
  onClearSelection, 
  onBulkDelete, 
  onBulkToggleStatus 
}: BulkActionsProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (selectedUrls.length === 0) {
    return null
  }

  const handleBulkDelete = async () => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบลิงก์ ${selectedUrls.length} รายการ?`)) {
      return
    }

    setIsLoading(true)
    try {
      await onBulkDelete(selectedUrls)
      onClearSelection()
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkToggleStatus = async (isActive: boolean) => {
    const action = isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะ${action}ลิงก์ ${selectedUrls.length} รายการ?`)) {
      return
    }

    setIsLoading(true)
    try {
      await onBulkToggleStatus(selectedUrls, isActive)
      onClearSelection()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-300">
              เลือกแล้ว <span className="text-blue-400 font-bold">{selectedUrls.length}</span> รายการ
            </span>
          </div>
          
          <button
            onClick={onClearSelection}
            className="text-sm text-gray-400 hover:text-gray-200 transition-all duration-200 hover:underline"
          >
            ยกเลิกการเลือก
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleBulkToggleStatus(true)}
            disabled={isLoading}
            className="group flex items-center px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all duration-200 disabled:opacity-50 hover:scale-105"
          >
            <svg className="w-4 h-4 mr-2 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            เปิดใช้งาน
          </button>

          <button
            onClick={() => handleBulkToggleStatus(false)}
            disabled={isLoading}
            className="group flex items-center px-4 py-2 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all duration-200 disabled:opacity-50 hover:scale-105"
          >
            <svg className="w-4 h-4 mr-2 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
            ปิดใช้งาน
          </button>

          <button
            onClick={handleBulkDelete}
            disabled={isLoading}
            className="group flex items-center px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all duration-200 disabled:opacity-50 hover:scale-105"
          >
            {isLoading ? (
              <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            ลบ
          </button>
        </div>
      </div>
    </div>
  )
}