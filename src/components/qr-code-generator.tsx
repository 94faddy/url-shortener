'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface QRCodeGeneratorProps {
  url: string
  title?: string
}

export function QRCodeGenerator({ url, title }: QRCodeGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [qrSize, setQrSize] = useState(256)
  const [downloading, setDownloading] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)

  // ตรวจสอบว่า component ถูก mount แล้ว
  useEffect(() => {
    setMounted(true)
  }, [])

  // จัดการ ESC key และ body scroll
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
      }
    }

    // ป้องกันการ scroll
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'
    
    // เพิ่ม event listener
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = originalStyle
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const generateQRCodeUrl = useCallback((size: number = 256) => {
    const encodedUrl = encodeURIComponent(url)
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}&format=png&margin=10&bgcolor=FFFFFF&color=000000&qzone=2&ecc=M`
  }, [url])

  const downloadQRCode = async () => {
    try {
      setDownloading(true)
      const response = await fetch(generateQRCodeUrl(512))
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `qr-code-${title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'link'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(downloadUrl)
      
      showNotification('ดาวน์โหลด QR Code สำเร็จ!', 'success')
    } catch (error) {
      console.error('Error downloading QR code:', error)
      showNotification('เกิดข้อผิดพลาดในการดาวน์โหลด', 'error')
    } finally {
      setDownloading(false)
    }
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url)
      showNotification('คัดลอกลิงก์แล้ว!', 'success')
    } catch (error) {
      console.error('Failed to copy URL:', error)
      showNotification('ไม่สามารถคัดลอกลิงก์ได้', 'error')
    }
  }

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div')
    const bgColor = type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-xl shadow-2xl transition-all duration-300 transform translate-x-full opacity-0`
    notification.style.zIndex = '99999'
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${type === 'success' 
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
          }
        </svg>
        <span class="font-medium">${message}</span>
      </div>
    `
    document.body.appendChild(notification)
    
    // Animate in
    setTimeout(() => {
      notification.className = notification.className.replace('translate-x-full opacity-0', 'translate-x-0 opacity-100')
    }, 100)
    
    // Animate out and remove
    setTimeout(() => {
      notification.className = notification.className.replace('translate-x-0 opacity-100', 'translate-x-full opacity-0')
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
  }

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setImageLoaded(false)
  }, [])

  const openModal = useCallback(() => {
    setIsOpen(true)
    setImageLoaded(false)
  }, [])

  // ปุ่มเปิด modal
  if (!isOpen) {
    return (
      <button
        onClick={openModal}
        className="p-2 text-gray-400 hover:text-purple-400 transition-all duration-200 hover:scale-110 hover:bg-purple-500/10 rounded-lg group"
        title="สร้าง QR Code"
      >
        <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      </button>
    )
  }

  // ไม่แสดง modal จนกว่าจะ mounted
  if (!mounted) {
    return null
  }

  const modalContent = (
    <div className="fixed inset-0" style={{ zIndex: 99999 }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={closeModal}
      />
      
      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 animate-fade-in">
        <div 
          className="rounded-3xl shadow-2xl max-w-lg w-full transform transition-all duration-300 animate-scale-in relative border border-gray-700/50"
style={{background: 'linear-gradient(135deg, #111827 0%, #581c87 50%, #1e3a8a 100%)'}}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 p-6 rounded-t-3xl">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 via-blue-600/90 to-cyan-600/90 rounded-t-3xl backdrop-blur-sm"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">QR Code Generator</h3>
                  <p className="text-white/80 text-sm">สร้าง QR Code สำหรับลิงก์ของคุณ</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-10 h-10 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl transition-all duration-200 hover:scale-110 hover:rotate-90 flex items-center justify-center shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* QR Code Display */}
            <div className="mb-8">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-700/50 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/20 to-blue-900/20 opacity-30"></div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full opacity-30"></div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full opacity-20"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-600/30 mb-4 relative">
                    {!imageLoaded && (
                      <div 
                        className="absolute inset-0 flex items-center justify-center bg-white rounded-2xl"
                        style={{ width: qrSize, height: qrSize }}
                      >
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                    )}
                    <img
                      src={generateQRCodeUrl(qrSize)}
                      alt="QR Code"
                      className={`transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                      style={{ width: qrSize, height: qrSize }}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageLoaded(true)}
                    />
                  </div>
                  
                  <div className="text-center">
                    <h4 className="font-semibold text-white mb-2 flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {title || 'ลิงก์สั้น'}
                    </h4>
                    <button
                      onClick={copyUrl}
                      className="text-xs text-gray-400 hover:text-blue-400 transition-colors duration-200 bg-gray-900/50 hover:bg-gray-800/50 px-3 py-2 rounded-lg font-mono max-w-full truncate border border-gray-700/50"
                      title="คลิกเพื่อคัดลอก"
                    >
                      {url}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Size Selector */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-300 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                เลือกขนาด QR Code
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 200, label: 'เล็ก', size: '200×200px', desc: 'เหมาะสำหรับ Web' },
                  { value: 256, label: 'กลาง', size: '256×256px', desc: 'ขนาดมาตรฐาน' },
                  { value: 300, label: 'ใหญ่', size: '300×300px', desc: 'เหมาะสำหรับพิมพ์' },
                  { value: 400, label: 'ใหญ่มาก', size: '400×400px', desc: 'คุณภาพสูงสุด' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setQrSize(option.value)
                      setImageLoaded(false)
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-105 ${
                      qrSize === option.value
                        ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/50 shadow-lg'
                        : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600/50 hover:shadow-md'
                    }`}
                  >
                    <div className={`font-semibold text-sm mb-1 ${qrSize === option.value ? 'text-purple-300' : 'text-gray-300'}`}>
                      {option.label}
                    </div>
                    <div className={`text-xs mb-1 ${qrSize === option.value ? 'text-purple-400' : 'text-gray-400'}`}>
                      {option.size}
                    </div>
                    <div className={`text-xs ${qrSize === option.value ? 'text-purple-500' : 'text-gray-500'}`}>
                      {option.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                onClick={downloadQRCode}
                disabled={downloading || !imageLoaded}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 hover:scale-105 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
              >
                {downloading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>กำลังดาวน์โหลด...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>ดาวน์โหลด PNG</span>
                  </>
                )}
              </button>
              
              <button
                onClick={closeModal}
                className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl border border-gray-700/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>ปิด</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ใช้ Portal เพื่อให้ modal แสดงผลที่ document.body
  return createPortal(modalContent, document.body)
}