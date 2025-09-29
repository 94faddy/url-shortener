import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const urlId = searchParams.get('urlId')
    const days = parseInt(searchParams.get('days') || '30')

    // สร้าง date range ที่แม่นยำ - ใช้ timezone ของ server
    const now = new Date()
    const dateFrom = new Date(now)
    dateFrom.setDate(dateFrom.getDate() - days)
    dateFrom.setHours(0, 0, 0, 0)

    // วันนี้เริ่มต้นที่ 00:00:00
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // วันพรุ่งนี้เริ่มต้นที่ 00:00:00
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    console.log('Analytics query params:', {
      urlId,
      days,
      dateFrom: dateFrom.toISOString(),
      today: today.toISOString(),
      tomorrow: tomorrow.toISOString()
    })

    // สำหรับ URL เฉพาะ
    if (urlId) {
      // ตรวจสอบ ownership
      const url = await prisma.url.findFirst({
        where: {
          id: urlId,
          userId: session.user.id
        }
      })

      if (!url) {
        return NextResponse.json({ error: 'URL not found' }, { status: 404 })
      }

      // **1. ดึงข้อมูลทั้งหมดจาก Click Table (เพื่อความแม่นยำ 100%)**
      const allClicks = await prisma.click.findMany({
        where: {
          urlId: urlId,
          clickedAt: {
            gte: dateFrom
          }
        },
        orderBy: {
          clickedAt: 'desc'
        }
      })

      console.log(`Found ${allClicks.length} total clicks for URL ${urlId}`)

      // **2. แยกข้อมูลวันนี้และวันก่อนหน้า**
      const todayClicks = allClicks.filter(click => 
        click.clickedAt >= today && click.clickedAt < tomorrow
      )

      const historicalClicks = allClicks.filter(click => 
        click.clickedAt < today
      )

      console.log(`Today: ${todayClicks.length}, Historical: ${historicalClicks.length}`)

      // **3. คำนวณ Total Stats**
      const totalClicks = allClicks.length
      const uniqueIPs = new Set(allClicks.map(c => c.ipAddress).filter(Boolean))
      const totalUniqueClicks = uniqueIPs.size

      // **4. สร้างข้อมูลรายวัน (Daily Stats)**
      const dailyStatsMap = new Map<string, { clicks: number; uniqueClicks: number }>()
      
      // Initialize ทุกวันด้วย 0
      for (let i = 0; i < days; i++) {
        const date = new Date(dateFrom)
        date.setDate(date.getDate() + i)
        const dateKey = date.toISOString().split('T')[0]
        dailyStatsMap.set(dateKey, { clicks: 0, uniqueClicks: 0 })
      }

      // กลุ่มคลิกตาม date
      allClicks.forEach(click => {
        const clickDate = new Date(click.clickedAt)
        clickDate.setHours(0, 0, 0, 0)
        const dateKey = clickDate.toISOString().split('T')[0]
        
        if (dailyStatsMap.has(dateKey)) {
          const current = dailyStatsMap.get(dateKey)!
          current.clicks += 1
        }
      })

      // คำนวณ unique clicks per day
      const clicksByDate = new Map<string, Set<string>>()
      allClicks.forEach(click => {
        const clickDate = new Date(click.clickedAt)
        clickDate.setHours(0, 0, 0, 0)
        const dateKey = clickDate.toISOString().split('T')[0]
        
        if (!clicksByDate.has(dateKey)) {
          clicksByDate.set(dateKey, new Set())
        }
        if (click.ipAddress) {
          clicksByDate.get(dateKey)!.add(click.ipAddress)
        }
      })

      // อัพเดท unique clicks
      clicksByDate.forEach((ips, dateKey) => {
        if (dailyStatsMap.has(dateKey)) {
          dailyStatsMap.get(dateKey)!.uniqueClicks = ips.size
        }
      })

      const clicksByDateArray = Array.from(dailyStatsMap.entries())
        .map(([date, stats]) => ({ 
          date, 
          clicks: stats.clicks,
          uniqueClicks: stats.uniqueClicks 
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // **5. สถิติประเทศ**
      const countriesMap = new Map<string, number>()
      allClicks.forEach(click => {
        if (click.country) {
          countriesMap.set(click.country, (countriesMap.get(click.country) || 0) + 1)
        }
      })

      const clicksByCountry = Array.from(countriesMap.entries())
        .map(([country, clicks]) => ({
          country,
          countryName: getCountryName(country),
          clicks
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10)

      // **6. สถิติ Location สำหรับแผนที่**
      const locationMap = new Map<string, { country: string; city: string; clicks: number }>()
      allClicks.forEach(click => {
        if (click.country) {
          const key = `${click.country}-${click.city || 'Unknown'}`
          const existing = locationMap.get(key) || { 
            country: click.country, 
            city: click.city || 'Unknown', 
            clicks: 0 
          }
          locationMap.set(key, { ...existing, clicks: existing.clicks + 1 })
        }
      })

      const clicksByLocation = Array.from(locationMap.values())
        .map(item => ({
          country: item.country,
          countryName: getCountryName(item.country),
          city: item.city,
          clicks: item.clicks,
          coordinates: getCountryCoordinates(item.country)
        }))
        .sort((a, b) => b.clicks - a.clicks)

      // **7. สถิติ Referrers**
      const referrersMap = new Map<string, number>()
      allClicks.forEach(click => {
        let referrer = 'direct'
        if (click.referer) {
          try {
            referrer = new URL(click.referer).hostname.replace('www.', '')
          } catch {
            referrer = 'direct'
          }
        }
        referrersMap.set(referrer, (referrersMap.get(referrer) || 0) + 1)
      })

      const clicksByReferer = Array.from(referrersMap.entries())
        .map(([referer, clicks]) => ({ referer: referer || 'Direct', clicks }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10)

      // **8. สถิติรายชั่วโมงของวันนี้**
      const hourlyStatsMap = new Map<number, number>()
      todayClicks.forEach(click => {
        const hour = new Date(click.clickedAt).getHours()
        hourlyStatsMap.set(hour, (hourlyStatsMap.get(hour) || 0) + 1)
      })

      const clicksByHour = Array.from({ length: 24 }, (_, hour) => ({
        hour: hour.toString().padStart(2, '0'),
        clicks: hourlyStatsMap.get(hour) || 0
      }))

      // **9. Recent clicks (50 รายการล่าสุด)**
      const recentClicks = allClicks
        .slice(0, 50)
        .map(click => ({
          id: click.id,
          clickedAt: click.clickedAt,
          country: click.country,
          countryName: click.countryName,
          city: click.city,
          referer: click.referer,
          userAgent: click.userAgent,
          ipAddress: click.ipAddress
        }))

      return NextResponse.json({
        // ข้อมูลรวม
        totalClicks,
        totalUniqueClicks,
        
        // Charts data
        clicksByDate: clicksByDateArray,
        clicksByCountry,
        clicksByLocation,
        clicksByHour,
        clicksByReferer,
        
        // Real-time data
        recentClicks,
        
        // Debug info
        debugInfo: {
          queryRange: {
            from: dateFrom.toISOString(),
            to: now.toISOString(),
            days
          },
          clicksBreakdown: {
            total: totalClicks,
            today: todayClicks.length,
            historical: historicalClicks.length
          },
          dataSource: 'click_table_direct_100_percent_accurate'
        }
      })
    }

    // **Dashboard overview - ใช้ Click Table โดยตรง**
    const userUrls = await prisma.url.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true,
        title: true,
        shortCode: true,
        originalUrl: true,
        createdAt: true
      }
    })

    const urlIds = userUrls.map(url => url.id)

    if (urlIds.length === 0) {
      return NextResponse.json({
        totalUrls: 0,
        totalClicks: 0,
        todayClicks: 0,
        topUrls: [],
        topCountries: [],
        clicksByDate: [],
        clicksByLocation: [],
        clicksByHour: Array.from({ length: 24 }, (_, hour) => ({
          hour: hour.toString().padStart(2, '0'),
          clicks: 0
        }))
      })
    }

    // ดึงข้อมูลทั้งหมดจาก Click table
    const allClicks = await prisma.click.findMany({
      where: {
        urlId: {
          in: urlIds
        },
        clickedAt: {
          gte: dateFrom
        }
      },
      orderBy: {
        clickedAt: 'desc'
      }
    })

    // แยกคลิกวันนี้
    const todayClicksData = allClicks.filter(click => 
      click.clickedAt >= today && click.clickedAt < tomorrow
    )

    console.log(`Dashboard: Total clicks: ${allClicks.length}, Today: ${todayClicksData.length}`)

    const totalClicks = allClicks.length
    const todayClicks = todayClicksData.length

    // สถิติรายวัน
    const dailyStats = new Map<string, number>()
    
    // Initialize ทุกวันด้วย 0
    for (let i = 0; i < days; i++) {
      const date = new Date(dateFrom)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      dailyStats.set(dateKey, 0)
    }

    // นับคลิกแต่ละวัน
    allClicks.forEach(click => {
      const clickDate = new Date(click.clickedAt)
      clickDate.setHours(0, 0, 0, 0)
      const dateKey = clickDate.toISOString().split('T')[0]
      
      if (dailyStats.has(dateKey)) {
        dailyStats.set(dateKey, (dailyStats.get(dateKey) || 0) + 1)
      }
    })

    const clicksByDate = Array.from(dailyStats.entries())
      .map(([date, clicks]) => ({ date, clicks }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Top Countries
    const countriesMap = new Map<string, number>()
    allClicks.forEach(click => {
      if (click.country) {
        countriesMap.set(click.country, (countriesMap.get(click.country) || 0) + 1)
      }
    })

    const topCountries = Array.from(countriesMap.entries())
      .map(([country, clicks]) => ({
        country,
        countryName: getCountryName(country),
        clicks
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)

    // Top URLs
    const urlStatsMap = new Map<string, number>()
    allClicks.forEach(click => {
      urlStatsMap.set(click.urlId, (urlStatsMap.get(click.urlId) || 0) + 1)
    })

    const topUrls = Array.from(urlStatsMap.entries())
      .map(([urlId, clicks]) => {
        const url = userUrls.find(u => u.id === urlId)
        return {
          id: urlId,
          title: url?.title || 'Untitled',
          shortCode: url?.shortCode,
          originalUrl: url?.originalUrl,
          clicks: clicks,
          _count: { clicks: clicks } // ใช้ค่าจริงจาก click table
        }
      })
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5)

    // Location data สำหรับแผนที่
    const locationMap = new Map<string, { country: string; city: string; clicks: number }>()
    allClicks.forEach(click => {
      if (click.country) {
        const key = `${click.country}-${click.city || 'Unknown'}`
        const existing = locationMap.get(key) || { 
          country: click.country, 
          city: click.city || 'Unknown', 
          clicks: 0 
        }
        locationMap.set(key, { ...existing, clicks: existing.clicks + 1 })
      }
    })

    const clicksByLocation = Array.from(locationMap.values())
      .map(item => ({
        country: item.country,
        countryName: getCountryName(item.country),
        city: item.city,
        clicks: item.clicks,
        coordinates: getCountryCoordinates(item.country)
      }))

    // สถิติรายชั่วโมงของวันนี้
    const hourlyStatsMap = new Map<number, number>()
    todayClicksData.forEach(click => {
      const hour = new Date(click.clickedAt).getHours()
      hourlyStatsMap.set(hour, (hourlyStatsMap.get(hour) || 0) + 1)
    })

    const clicksByHour = Array.from({ length: 24 }, (_, hour) => ({
      hour: hour.toString().padStart(2, '0'),
      clicks: hourlyStatsMap.get(hour) || 0
    }))

    return NextResponse.json({
      // Overview
      totalUrls: userUrls.length,
      totalClicks,
      todayClicks,
      
      // Charts data
      clicksByDate,
      topCountries,
      topUrls,
      clicksByLocation,
      clicksByHour,
      
      // Debug info
      debugInfo: {
        dataSource: 'click_table_direct_100_percent_accurate',
        queryRange: {
          from: dateFrom.toISOString(),
          to: now.toISOString(),
          today: today.toISOString(),
          tomorrow: tomorrow.toISOString()
        },
        totalUrlsInAccount: userUrls.length,
        clicksInRange: allClicks.length
      }
    })

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}

// Helper functions
function getCountryName(countryCode: string): string {
  const countries: { [key: string]: string } = {
    'TH': 'ประเทศไทย',
    'US': 'สหรัฐอเมริกา',
    'GB': 'สหราชอาณาจักร',
    'JP': 'ญี่ปุ่น',
    'CN': 'จีน',
    'KR': 'เกาหลีใต้',
    'SG': 'สิงคโปร์',
    'MY': 'มาเลเซีย',
    'ID': 'อินโดนีเซีย',
    'VN': 'เวียดนาม',
    'PH': 'ฟิลิปปินส์',
    'IN': 'อินเดีย',
    'AU': 'ออสเตรเลีย',
    'DE': 'เยอรมนี',
    'FR': 'ฝรั่งเศส',
    'CA': 'แคนาดา',
    'BR': 'บราซิล',
    'IT': 'อิตาลี',
    'ES': 'สเปน',
    'NL': 'เนเธอร์แลนด์',
    'RU': 'รัสเซีย',
    'KH': 'กัมพูชา',
    'LA': 'ลาว',
    'MM': 'พม่า',
    'BD': 'บังกลาเทศ',
    'PK': 'ปากีสถาน',
    'LK': 'ศรีลังกา',
    'NP': 'เนปาล',
    'BT': 'ภูฏาน',
    'MV': 'มัลดีฟส์'
  }
  return countries[countryCode] || countryCode
}

function getCountryCoordinates(countryCode: string): [number, number] | null {
  const coordinates: { [key: string]: [number, number] } = {
    'TH': [13.7563, 100.5018], // Bangkok
    'US': [39.8283, -98.5795], // Center of USA
    'CN': [35.8617, 104.1954], // Center of China
    'JP': [36.2048, 138.2529], // Center of Japan
    'KR': [35.9078, 127.7669], // Center of South Korea
    'SG': [1.3521, 103.8198], // Singapore
    'MY': [4.2105, 101.9758], // Kuala Lumpur
    'VN': [14.0583, 108.2772], // Center of Vietnam
    'ID': [-0.7893, 113.9213], // Center of Indonesia
    'PH': [12.8797, 121.7740], // Manila
    'IN': [20.5937, 78.9629], // Center of India
    'GB': [55.3781, -3.4360], // Center of UK
    'DE': [51.1657, 10.4515], // Center of Germany
    'FR': [46.2276, 2.2137], // Center of France
    'AU': [-25.2744, 133.7751], // Center of Australia
    'CA': [56.1304, -106.3468], // Center of Canada
    'BR': [-14.2350, -51.9253], // Center of Brazil
    'IT': [41.8719, 12.5674], // Rome
    'ES': [40.4637, -3.7492], // Madrid
    'NL': [52.1326, 5.2913], // Utrecht
    'RU': [61.5240, 105.3188], // Center of Russia
    'KH': [12.5657, 104.9910], // Phnom Penh
    'LA': [19.8563, 102.4955], // Vientiane
    'MM': [21.9162, 95.9560], // Naypyidaw
    'BD': [23.6850, 90.3563], // Dhaka
    'PK': [30.3753, 69.3451], // Center of Pakistan
    'LK': [7.8731, 80.7718], // Colombo
    'NP': [28.3949, 84.1240], // Kathmandu
    'BT': [27.5142, 90.4336], // Thimphu
    'MV': [3.2028, 73.2207]   // Male
  }
  return coordinates[countryCode] || null
}