'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from 'recharts'
import { formatDate, getCountryName } from '@/lib/utils'
import { QRCodeGenerator } from '@/components/qr-code-generator'

interface UrlData {
  id: string
  originalUrl: string
  shortCode: string
  title?: string
  description?: string
  createdAt: string
  isActive: boolean
  _count: {
    clicks: number
  }
}

interface AnalyticsData {
  url: UrlData
  totalClicks: number
  totalUniqueClicks?: number
  clicksByDate: { date: string; clicks: number; uniqueClicks?: number }[]
  clicksByCountry: { country: string; countryName: string; clicks: number }[]
  clicksByLocation: { country: string; countryName: string; city: string; clicks: number; coordinates: [number, number] | null }[]
  clicksByHour: { hour: string; clicks: number }[]
  clicksByReferer: { referer: string; clicks: number }[]
  recentClicks: {
    id: string
    clickedAt: string
    country?: string
    countryName?: string
    city?: string
    referer?: string
    userAgent?: string
    ipAddress?: string
  }[]
  dataSource?: {
    historical: string
    today?: string
    performance: string
  }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316']

export default function AnalyticsDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const urlId = params.id as string
  
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30')
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session && urlId) {
      fetchAnalytics()
    }
  }, [session, urlId, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Fetch analytics data from the updated API
      const analyticsResponse = await fetch(`/api/analytics?urlId=${urlId}&days=${timeRange}`)
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        
        // Fetch URL data separately using the existing URL API
        const urlResponse = await fetch(`/api/urls/${urlId}`)
        if (urlResponse.ok) {
          const urlData = await urlResponse.json()
          setData({
            url: urlData,
            ...analyticsData
          })
        } else {
          throw new Error('ไม่สามารถโหลดข้อมูลลิงก์ได้')
        }
      } else {
        throw new Error('ไม่สามารถโหลดข้อมูลสถิติได้')
      }
      
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      setError(error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <div className="absolute inset-0 rounded-full h-32 w-32 border-t-2 border-purple-500 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 text-center">
              <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-white mb-2">เกิดข้อผิดพลาด</h3>
              <p className="text-gray-400 mb-4">{error}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105"
              >
                กลับไปแดชบอร์ด
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const shortUrl = `${window.location.origin}/${data.url.shortCode}`

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Show toast notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300'
      notification.textContent = 'คัดลอกแล้ว!'
      document.body.appendChild(notification)
      setTimeout(() => {
        notification.remove()
      }, 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Format chart data for better display
  const chartData = data.clicksByDate.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('th-TH', { 
      month: 'short', 
      day: 'numeric' 
    })
  }))

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-400 hover:text-white transition-all duration-200 hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              กลับไปแดชบอร์ด
            </button>

            <div className="flex items-center space-x-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 text-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="7">7 วันที่ผ่านมา</option>
                <option value="30">30 วันที่ผ่านมา</option>
                <option value="90">90 วันที่ผ่านมา</option>
              </select>
            </div>
          </div>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            สถิติรายละเอียด
          </h1>
          <p className="text-gray-400 text-lg">
            วิเคราะห์การใช้งานลิงก์ของคุณแบบ Real-time + ประวัติศาสตร์
          </p>
          
          {/* Performance Badge */}
          {data.dataSource && (
            <div className="mt-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {data.dataSource.performance === 'hybrid_approach' ? 'Hybrid Performance Mode' : 'High Performance Mode'}
              </span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:shadow-blue-500/10 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Clicks</p>
                <p className="text-3xl font-bold text-white">{data.totalClicks.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                </svg>
              </div>
            </div>
          </div>

          {data.totalUniqueClicks !== undefined && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:shadow-emerald-500/10 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Unique Visitors</p>
                  <p className="text-3xl font-bold text-white">{data.totalUniqueClicks.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:shadow-purple-500/10 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Countries</p>
                <p className="text-3xl font-bold text-white">{data.clicksByCountry.length}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:shadow-amber-500/10 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Referrers</p>
                <p className="text-3xl font-bold text-white">{data.clicksByReferer.length}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* URL Info Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl p-8 mb-8 hover:shadow-blue-500/10 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-3 mb-6">
                <h2 className="text-2xl font-semibold text-white">
                  {data.url.title || 'ไม่มีชื่อ'}
                </h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-all duration-200 ${
                  data.url.isActive 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {data.url.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                </span>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-gray-400 font-medium">ลิงก์สั้น:</span>
                  <button
                    onClick={() => copyToClipboard(shortUrl)}
                    className="text-blue-400 hover:text-blue-300 font-mono bg-gray-900/50 border border-gray-700/50 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all duration-200 hover:scale-105"
                  >
                    {shortUrl}
                  </button>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-medium mt-0.5">ลิงก์เดิม:</span>
                  <a
                    href={data.url.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-blue-400 break-all transition-colors duration-200"
                  >
                    {data.url.originalUrl}
                  </a>
                </div>

                <div className="flex items-center flex-wrap gap-6 text-xs text-gray-400 pt-2">
                  <span className="flex items-center bg-gray-900/30 px-3 py-1 rounded-lg">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    สร้างเมื่อ: {formatDate(new Date(data.url.createdAt))}
                  </span>
                  <span className="flex items-center bg-gray-900/30 px-3 py-1 rounded-lg">
                    <svg className="w-4 h-4 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <span className="text-emerald-400 font-medium">{data.totalClicks.toLocaleString()}</span> คลิก
                    {data.totalUniqueClicks !== undefined && (
                      <span className="text-gray-500 ml-2">({data.totalUniqueClicks.toLocaleString()} unique)</span>
                    )}
                  </span>
                </div>

                {data.url.description && (
                  <div className="mt-4 p-4 bg-gray-900/30 rounded-lg">
                    <p className="text-gray-300">{data.url.description}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 ml-6">
              <QRCodeGenerator url={shortUrl} title={data.url.title} />
              
              <button
                onClick={() => copyToClipboard(shortUrl)}
                className="p-3 text-gray-400 hover:text-blue-400 transition-all duration-200 hover:scale-110 hover:bg-blue-500/10 rounded-lg"
                title="คัดลอกลิงก์"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Clicks Over Time - Enhanced */}
          <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              การคลิกตามเวลา {data.totalUniqueClicks !== undefined && '(Total & Unique)'}
            </h3>
            {data.clicksByDate.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                      {data.totalUniqueClicks !== undefined && (
                        <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      )}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="displayDate" 
                      tick={{ fontSize: 12, fill: '#9CA3AF' }}
                      stroke="#6B7280"
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} stroke="#6B7280" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      labelFormatter={(value) => `วันที่: ${value}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorClicks)"
                      name="Total Clicks"
                    />
                    {data.totalUniqueClicks !== undefined && data.clicksByDate[0]?.uniqueClicks !== undefined && (
                      <Area 
                        type="monotone" 
                        dataKey="uniqueClicks" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorUnique)"
                        name="Unique Visitors"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-gray-500">ยังไม่มีข้อมูลการคลิก</p>
                </div>
              </div>
            )}
          </div>

          {/* Countries */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
              ประเทศ
            </h3>
            {data.clicksByCountry.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.clicksByCountry.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="countryName" 
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      stroke="#6B7280"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} stroke="#6B7280" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      formatter={(value) => [`${value} คลิก`, 'จำนวน']}
                    />
                    <Bar dataKey="clicks" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500">ยังไม่มีข้อมูลประเทศ</p>
                </div>
              </div>
            )}
          </div>

          {/* Hour Distribution */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <div className="w-2 h-2 bg-amber-500 rounded-full mr-3"></div>
              การใช้งานตามชั่วโมง (วันนี้)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.clicksByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                    tickFormatter={(value) => `${value}:00`}
                    stroke="#6B7280"
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    labelFormatter={(value) => `${value}:00 น.`}
                    formatter={(value) => [`${value} คลิก`, 'จำนวน']}
                  />
                  <Bar dataKey="clicks" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Referrers */}
          {data.clicksByReferer.length > 0 && (
            <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-2xl -translate-y-16 translate-x-16"></div>
              <h3 className="text-2xl font-bold text-white mb-8 flex items-center relative z-10">
                <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-4 animate-pulse"></div>
                แหล่งที่มา (Referrers)
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="h-72 relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.clicksByReferer.slice(0, 8)}
                        dataKey="clicks"
                        nameKey="referer"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelStyle={{ fill: '#F9FAFB', fontSize: '12px', fontWeight: 'bold' }}
                      >
                        {data.clicksByReferer.slice(0, 8).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB'
                        }}
                        formatter={(value, name) => [`${value} คลิก`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-white mb-4">รายละเอียด</h4>
                  {data.clicksByReferer.slice(0, 10).map((item, index) => (
                    <div key={item.referer} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg hover:bg-gray-700/30 transition-colors duration-200">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-gray-300 text-sm font-medium">
                          {item.referer === 'direct' ? 'เข้าตรง (Direct)' : item.referer}
                        </span>
                      </div>
                      <span className="text-white font-semibold">{item.clicks.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Clicks */}
        {data.recentClicks.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-700/50">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <div className="w-2 h-2 bg-pink-500 rounded-full mr-3"></div>
                การคลิกล่าสุด (Real-time)
              </h3>
            </div>
            <div className="divide-y divide-gray-700/50 max-h-96 overflow-y-auto">
              {data.recentClicks.slice(0, 20).map((click) => (
                <div key={click.id} className="p-6 flex items-center justify-between hover:bg-gray-700/20 transition-colors duration-200">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        {click.country && (
                          <span className="text-sm font-medium text-white">
                            {click.countryName || getCountryName(click.country)}
                          </span>
                        )}
                        {click.city && (
                          <span className="text-sm text-gray-400">• {click.city}</span>
                        )}
                        {!click.country && !click.city && (
                          <span className="text-sm text-gray-400">ไม่ระบุตำแหน่ง</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <span>{formatDate(new Date(click.clickedAt))}</span>
                        {click.referer && (
                          <span>• จาก: {(() => {
                            try {
                              return new URL(click.referer).hostname
                            } catch {
                              return 'Direct'
                            }
                          })()}</span>
                        )}
                        {!click.referer && <span>• Direct</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {click.ipAddress && (
                      <div className="font-mono">
                        {click.ipAddress.replace(/(\d+\.\d+\.\d+\.)\d+/, '$1***')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Data Message */}
        {data.totalClicks === 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl p-12 text-center">
            <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">ยังไม่มีการคลิก</h3>
            <p className="text-gray-400 mb-6">ลิงก์นี้ยังไม่มีใครคลิก ลองแชร์ดูสิ!</p>
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => copyToClipboard(shortUrl)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                คัดลอกลิงก์
              </button>
              <QRCodeGenerator url={shortUrl} title={data.url.title} />
            </div>
          </div>
        )}

        {/* Performance Footer */}
        {data.dataSource && (
          <div className="mt-8 bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4 text-gray-400">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Data Source: {data.dataSource.historical}
                </span>
                {data.dataSource.today && (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Today: {data.dataSource.today}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                Updated: {new Date().toLocaleString('th-TH')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}