// /app/api/cron/daily-analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 🔐 Security: ตรวจสอบ Authorization header
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      console.log('❌ Unauthorized cron request')
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Invalid or missing CRON_SECRET' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const daysBack = Math.min(parseInt(searchParams.get('days') || '1'), 365) // จำกัดไม่เกิน 365 วัน
    const forceRecalculate = searchParams.get('force') === 'true'
    
    console.log(`🚀 Starting daily analytics aggregation for ${daysBack} days back (force: ${forceRecalculate})`)
    
    let processedCount = 0
    const results = []
    const errors = []

    // ประมวลผลทีละวัน ย้อนหลัง
    for (let i = 0; i < daysBack; i++) {
      // คำนวณวันที่เป้าหมาย (ใช้ UTC เพื่อความแม่นยำ)
      const targetDate = new Date()
      targetDate.setUTCDate(targetDate.getUTCDate() - (i + 1)) // เริ่มจากเมื่อวาน
      targetDate.setUTCHours(0, 0, 0, 0)
      
      const nextDay = new Date(targetDate)
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)

      const dateString = targetDate.toISOString().split('T')[0]
      console.log(`📅 Processing date: ${dateString}`)

      try {
        // ตรวจสอบว่ามีข้อมูลใน Analytics table แล้วหรือไม่
        if (!forceRecalculate) {
          const existingAnalytics = await prisma.analytics.findFirst({
            where: {
              date: targetDate
            }
          })

          if (existingAnalytics) {
            console.log(`✅ Analytics data already exists for ${dateString}, skipping...`)
            results.push({
              date: dateString,
              status: 'skipped',
              reason: 'data_already_exists',
              message: 'Use ?force=true to recalculate'
            })
            continue
          }
        }

        // หา URLs ที่มีการคลิกในวันนั้น
        const clicksInDay = await prisma.click.findMany({
          where: {
            clickedAt: {
              gte: targetDate,
              lt: nextDay
            }
          },
          select: {
            id: true,
            urlId: true,
            ipAddress: true,
            country: true,
            referer: true,
            userAgent: true,
            clickedAt: true
          }
        })

        if (clicksInDay.length === 0) {

          results.push({
            date: dateString,
            status: 'completed',
            urlsFound: 0,
            urlsProcessed: 0,
            totalClicks: 0,
            message: 'No clicks to process'
          })
          continue
        }

        // จัดกลุ่มคลิกตาม urlId
        const clicksByUrl = new Map<string, typeof clicksInDay>()
        clicksInDay.forEach(click => {
          if (!clicksByUrl.has(click.urlId)) {
            clicksByUrl.set(click.urlId, [])
          }
          clicksByUrl.get(click.urlId)!.push(click)
        })

        let urlProcessedCount = 0

        // ประมวลผลแต่ละ URL
        for (const [urlId, clicks] of clicksByUrl.entries()) {
          try {
            // 📊 คำนวณสถิติ
            const totalClicks = clicks.length
            
            // Unique clicks (based on IP address)
            const uniqueIPs = new Set<string>()
            clicks.forEach(click => {
              if (click.ipAddress) {
                uniqueIPs.add(click.ipAddress)
              }
            })
            const uniqueClicks = uniqueIPs.size

            // 🌍 สถิติประเทศ
            const countries: Record<string, number> = {}
            clicks.forEach(click => {
              if (click.country) {
                countries[click.country] = (countries[click.country] || 0) + 1
              }
            })

            // 🔗 สถิติ referrers
            const referrers: Record<string, number> = {}
            clicks.forEach(click => {
              let referrer = 'direct'
              if (click.referer && click.referer !== 'direct') {
                try {
                  const url = new URL(click.referer)
                  referrer = url.hostname.replace('www.', '')
                } catch {
                  referrer = 'direct'
                }
              }
              referrers[referrer] = (referrers[referrer] || 0) + 1
            })

            // 🌐 สถิติ user agents (browsers)
            const userAgents: Record<string, number> = {}
            clicks.forEach(click => {
              if (click.userAgent) {
                const browser = getBrowserName(click.userAgent)
                userAgents[browser] = (userAgents[browser] || 0) + 1
              }
            })

            // 📍 สถิติเวลา (รายชั่วโมง)
            const hourlyStats: Record<string, number> = {}
            clicks.forEach(click => {
              const hour = new Date(click.clickedAt).getUTCHours()
              const hourKey = hour.toString().padStart(2, '0')
              hourlyStats[hourKey] = (hourlyStats[hourKey] || 0) + 1
            })

            // 💾 บันทึกหรืออัปเดตข้อมูลใน Analytics table
            await prisma.analytics.upsert({
              where: {
                urlId_date: {
                  urlId: urlId,
                  date: targetDate
                }
              },
              create: {
                urlId: urlId,
                date: targetDate,
                clicks: totalClicks,
                uniqueClicks: uniqueClicks,
                countries: countries,
                referrers: referrers,
                userAgents: userAgents,
                hourlyStats: hourlyStats
              },
              update: {
                clicks: totalClicks,
                uniqueClicks: uniqueClicks,
                countries: countries,
                referrers: referrers,
                userAgents: userAgents,
                hourlyStats: hourlyStats
              }
            })

            urlProcessedCount++
            processedCount++
            
            console.log(`✅ Processed URL ${urlId}: ${totalClicks} clicks, ${uniqueClicks} unique`)
            
          } catch (urlError) {
            console.error(`❌ Error processing URL ${urlId} on ${dateString}:`, urlError)
            errors.push({
              urlId,
              date: dateString,
              error: urlError instanceof Error ? urlError.message : 'Unknown error'
            })
          }
        }

        // 📈 สรุปผลลัพธ์สำหรับวันนี้
        results.push({
          date: dateString,
          urlsFound: clicksByUrl.size,
          urlsProcessed: urlProcessedCount,
          totalClicks: clicksInDay.length,
          status: 'completed',
          processingTime: Date.now() - startTime
        })

        console.log(`✅ Completed ${dateString}: ${urlProcessedCount}/${clicksByUrl.size} URLs processed, ${clicksInDay.length} total clicks`)

      } catch (dateError) {
        console.error(`❌ Error processing date ${dateString}:`, dateError)
        errors.push({
          date: dateString,
          error: dateError instanceof Error ? dateError.message : 'Unknown error'
        })
        
        results.push({
          date: dateString,
          status: 'failed',
          error: dateError instanceof Error ? dateError.message : 'Unknown error'
        })
      }
    }

    const executionTime = Date.now() - startTime

    // 🧹 Cleanup: ลบข้อมูล Analytics ที่เก่าเกิน 1 ปี (เพื่อประสิทธิภาพ)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    try {
      const deletedOldData = await prisma.analytics.deleteMany({
        where: {
          date: {
            lt: oneYearAgo
          }
        }
      })
      console.log(`🧹 Cleaned up ${deletedOldData.count} old analytics records (>1 year)`)
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup old data:', cleanupError)
    }

    // 🎯 สรุปผลลัพธ์สุดท้าย
    const summary = {
      success: true,
      executionTime: `${executionTime}ms`,
      processedDays: daysBack,
      totalUrlRecords: processedCount,
      results: results,
      errors: errors.length > 0 ? errors : undefined,
      completedAt: new Date().toISOString(),
      performance: {
        avgTimePerDay: Math.round(executionTime / daysBack),
        recordsPerSecond: Math.round(processedCount / (executionTime / 1000)) || 0
      },
      settings: {
        forceRecalculate,
        maxDaysBack: 365,
        timezone: 'UTC'
      }
    }

    console.log('🎉 Analytics aggregation completed successfully:', {
      processedDays: daysBack,
      totalRecords: processedCount,
      executionTime: `${executionTime}ms`,
      errors: errors.length
    })
    
    return NextResponse.json(summary)

  } catch (error) {
    const executionTime = Date.now() - startTime
    
    console.error('💥 Analytics aggregation failed:', error)
    
    return NextResponse.json({ 
      success: false,
      executionTime: `${executionTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// 🔧 Helper function สำหรับแยก browser จาก user agent
function getBrowserName(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  
  // ตรวจสอบตามลำดับความสำคัญ
  if (ua.includes('edg/')) return 'Edge'
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'Chrome'
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari'
  if (ua.includes('firefox/')) return 'Firefox'
  if (ua.includes('opera/') || ua.includes('opr/')) return 'Opera'
  if (ua.includes('samsung')) return 'Samsung Browser'
  if (ua.includes('ucbrowser')) return 'UC Browser'
  if (ua.includes('instagram')) return 'Instagram'
  if (ua.includes('facebook')) return 'Facebook'
  if (ua.includes('line/')) return 'LINE'
  if (ua.includes('tiktok')) return 'TikTok'
  if (ua.includes('twitter')) return 'Twitter'
  
  return 'Other'
}

// 📖 GET endpoint สำหรับ documentation และการทดสอบ
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  // สำหรับการทดสอบ (เฉพาะ development)
  if (action === 'test' && process.env.NODE_ENV === 'development') {
    const testDate = new Date()
    testDate.setDate(testDate.getDate() - 1) // เมื่อวาน
    testDate.setHours(0, 0, 0, 0)
    
    const testClicks = await prisma.click.count({
      where: {
        clickedAt: {
          gte: testDate,
          lt: new Date(testDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    })
    
    return NextResponse.json({
      message: 'Test Mode - Development Only',
      testData: {
        testDate: testDate.toISOString(),
        clicksFound: testClicks,
        nextStep: testClicks > 0 ? 'POST with Authorization header to process' : 'No clicks to process'
      }
    })
  }
  
  // Documentation
  return NextResponse.json({
    name: 'Daily Analytics Aggregation Cron Job',
    version: '2.0',
    description: 'Aggregates click data from Click table to Analytics table for better performance with improved accuracy',
    
    usage: {
      method: 'POST',
      endpoint: '/api/cron/daily-analytics',
      headers: {
        'Authorization': 'Bearer YOUR_CRON_SECRET',
        'Content-Type': 'application/json'
      },
      parameters: {
        days: 'Number of days to process (default: 1, max: 365)',
        force: 'Set to "true" to recalculate existing data (default: false)'
      }
    },
    
    examples: {
      yesterday: `POST /api/cron/daily-analytics`,
      last7days: `POST /api/cron/daily-analytics?days=7`,
      last30days: `POST /api/cron/daily-analytics?days=30`,
      forceRecalculate: `POST /api/cron/daily-analytics?days=7&force=true`,
      testMode: `GET /api/cron/daily-analytics?action=test (dev only)`
    },
    
    schedule: {
      recommended: 'Daily at 1:00 AM UTC',
      cron: '0 1 * * *',
      vercel: 'Configure in vercel.json or use Vercel Cron',
      alternative: 'Can also be triggered manually or by external cron services'
    },
    
    features: {
      dataIntegrity: 'Uses UPSERT operations for safe re-execution',
      performance: 'Efficient batch processing with memory optimization',
      errorHandling: 'Individual URL failures don\'t stop entire process',
      smartSkipping: 'Skips days that already have analytics data (unless force=true)',
      autoCleanup: 'Automatically removes analytics data older than 1 year',
      timezone: 'Uses UTC for consistent date calculations',
      maxLimit: 'Limited to 365 days for performance protection'
    },
    
    monitoring: {
      successIndicator: 'HTTP 200 with detailed summary statistics',
      errorTypes: 'URL-level errors logged but process continues',
      retryPolicy: 'Safe to re-run multiple times',
      performance: 'Includes execution time and records per second metrics'
    },
    
    dataStructure: {
      analytics: {
        urlId: 'Foreign key to URLs table',
        date: 'UTC date (YYYY-MM-DD 00:00:00)',
        clicks: 'Total clicks for the day',
        uniqueClicks: 'Unique IP addresses',
        countries: 'JSON object with country codes and counts',
        referrers: 'JSON object with referrer domains and counts',
        userAgents: 'JSON object with browser names and counts',
        hourlyStats: 'JSON object with hour (00-23) and counts'
      }
    }
  })
}