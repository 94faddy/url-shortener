'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export function DashboardStats() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(30)

  useEffect(() => {
    if (session) {
      fetchStats()
    }
  }, [session, timeRange])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?days=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        console.log('Stats loaded:', data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-dark rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass-dark rounded-2xl p-6 animate-pulse">
              <div className="h-96 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">ไม่สามารถโหลดข้อมูลได้</div>
        <button
          onClick={fetchStats}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          ลองใหม่
        </button>
      </div>
    )
  }

  // Format data for charts
  const chartData = stats.clicksByDate?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('th-TH', { 
      month: 'short', 
      day: 'numeric' 
    }),
    clicks: item.clicks,
    fullDate: item.date
  })) || []

  const hourlyData = stats.clicksByHour?.map((item: any) => ({
    hour: `${item.hour}:00`,
    clicks: item.clicks
  })) || Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    clicks: 0
  }))

  return (
    <div className="space-y-8">
      {/* Time Range Selector */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[7, 30, 90].map((days) => (
          <button
            key={days}
            onClick={() => setTimeRange(days)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              timeRange === days
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            {days} วันล่าสุด
          </button>
        ))}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-dark rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold gradient-text">{stats.totalUrls?.toLocaleString() || 0}</p>
              <p className="text-gray-400 text-sm">ลิงก์ทั้งหมด</p>
            </div>
          </div>
        </div>

        <div className="glass-dark rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold gradient-text">{stats.totalClicks?.toLocaleString() || 0}</p>
              <p className="text-gray-400 text-sm">คลิกทั้งหมด</p>
            </div>
          </div>
        </div>

        <div className="glass-dark rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold gradient-text">{stats.todayClicks?.toLocaleString() || 0}</p>
              <p className="text-gray-400 text-sm">คลิกวันนี้</p>
            </div>
          </div>
        </div>

        <div className="glass-dark rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold gradient-text">
                {stats.totalUrls > 0 ? Math.round(stats.totalClicks / stats.totalUrls) : 0}
              </p>
              <p className="text-gray-400 text-sm">เฉลี่ย/ลิงก์</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Daily Activity Chart */}
        <div className="glass-dark rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            กิจกรรมรายวัน ({timeRange} วันล่าสุด)
          </h3>
          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#065F46' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-400">ยังไม่มีข้อมูลคลิก</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Hourly Activity Chart */}
        <div className="glass-dark rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
            กิจกรรมรายชั่วโมง
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#9CA3AF"
                  fontSize={12}
                  interval={3}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Bar 
                  dataKey="clicks" 
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top URLs */}
      {stats.topUrls && stats.topUrls.length > 0 && (
        <div className="glass-dark rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
            ลิงก์ยอดนิยม
          </h3>
          <div className="space-y-4">
            {stats.topUrls.map((url: any, index: number) => (
              <div key={url.id} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl hover:bg-gray-700/30 transition-colors">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {url.title || url.originalUrl}
                    </p>
                    <p className="text-gray-400 text-sm truncate">
                      /{url.shortCode}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-yellow-400">
                    {url._count.clicks.toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm">คลิก</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Countries Table */}
      {stats.topCountries && stats.topCountries.length > 0 && (
        <div className="glass-dark rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
            ประเทศที่คลิกมากที่สุด
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">อันดับ</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">ประเทศ</th>
                  <th className="text-right py-3 px-4 text-gray-300 font-semibold">คลิก</th>
                  <th className="text-right py-3 px-4 text-gray-300 font-semibold">เปอร์เซ็นต์</th>
                </tr>
              </thead>
              <tbody>
                {stats.topCountries.map((country: any, index: number) => {
                  const percentage = stats.totalClicks > 0 ? (country.clicks / stats.totalClicks * 100) : 0
                  const countryName = stats.clicksByLocation?.find((loc: any) => loc.country === country.country)?.countryName || country.country
                  return (
                    <tr key={country.country} className="border-b border-gray-800 hover:bg-gray-800/30">
                      <td className="py-3 px-4 text-gray-300">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                            {country.country}
                          </div>
                          <span className="text-white font-medium">
                            {countryName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-blue-400 font-bold">
                        {country.clicks.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-300">
                        {percentage.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Info */}
      <div className="glass-dark rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">📈 สรุปผลการใช้งาน</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-800/30 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{stats.totalUrls || 0}</div>
            <div className="text-gray-400 text-sm">ลิงก์ที่สร้าง</div>
          </div>
          <div className="text-center p-4 bg-gray-800/30 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{stats.totalClicks || 0}</div>
            <div className="text-gray-400 text-sm">คลิกทั้งหมด</div>
          </div>
          <div className="text-center p-4 bg-gray-800/30 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">
              {stats.topCountries ? stats.topCountries.length : 0}
            </div>
            <div className="text-gray-400 text-sm">ประเทศที่เข้าถึง</div>
          </div>
        </div>
      </div>
    </div>
  )
}