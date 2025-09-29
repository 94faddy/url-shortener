'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { UrlList } from '@/components/dashboard/url-list'
import { UrlShortenerForm } from '@/components/forms/url-shortener-form'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
        </div>
        
        <div className="relative z-10">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-4 border-transparent bg-gradient-to-r from-purple-500 to-blue-500 rounded-full p-1">
              <div className="bg-gray-900 rounded-full h-full w-full"></div>
            </div>
            <div className="absolute inset-0 rounded-full h-32 w-32 border-4 border-transparent bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
          </div>
          <div className="text-center mt-8">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">กำลังโหลด...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const tabs = [
    {
      id: 'overview',
      name: 'ภาพรวม',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'urls',
      name: 'ลิงก์ทั้งหมด',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    {
      id: 'create',
      name: 'สร้างลิงก์ใหม่',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 relative overflow-hidden">
      {/* Enhanced Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
        <div className="absolute top-3/4 right-1/3 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl animate-float" style={{animationDelay: '6s'}}></div>
      </div>

      <Navigation />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Enhanced Header */}
        <div className="mb-12 animate-fade-in-up">
          <div className="flex items-center space-x-6 mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/25">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-3">
                แดชบอร์ด
              </h1>
              <p className="text-gray-300 text-xl">
                ยินดีต้อนรับ, <span className="text-purple-300 font-semibold">{session.user?.name}</span> 
                <span className="ml-2">👋</span>
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-3xl mb-12 animate-slide-in-left shadow-2xl overflow-hidden">
          <div className="border-b border-white/10">
            <nav className="flex space-x-2 p-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-3 px-8 py-5 rounded-2xl font-semibold transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-white shadow-lg transform scale-105 shadow-purple-500/25'
                      : 'text-gray-300 hover:text-white hover:bg-white/10 hover:scale-102'
                  }`}
                >
                  <div className={`${activeTab === tab.id ? 'text-white' : 'text-gray-400'} transition-colors duration-300`}>
                    {tab.icon}
                  </div>
                  <span className="text-lg">{tab.name}</span>
                  {activeTab === tab.id && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="animate-fade-in-up">
              <DashboardStats />
            </div>
          )}

          {activeTab === 'urls' && (
            
            <div className="animate-slide-in-right">
              <UrlList />
            </div>
          )}

          {activeTab === 'create' && (
            <div className="glass-dark rounded-3xl p-10 card-hover animate-slide-in-left shadow-2xl relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/10 to-teal-500/10 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-full blur-2xl translate-y-24 -translate-x-24"></div>
              
              <div className="relative z-10">
                <div className="flex items-center mb-10">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mr-6 shadow-2xl shadow-green-500/25">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                      สร้างลิงก์สั้นใหม่
                    </h2>
                    <p className="text-gray-300 text-lg">
                      แปลง URL ยาวๆ ให้กลายเป็นลิงก์สั้นที่ใช้งานง่าย
                    </p>
                  </div>
                </div>
                <UrlShortenerForm />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}