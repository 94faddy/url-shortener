// /lib/scheduler.ts
import cron from 'node-cron'

let schedulerInitialized = false
const scheduledJobs = new Map<string, cron.ScheduledTask>()

export function initializeScheduler() {
  if (schedulerInitialized) {
    console.log('⏰ Scheduler already initialized')
    return {
      success: true,
      message: 'Scheduler already running',
      jobs: scheduledJobs.size
    }
  }

  console.log('🚀 Initializing internal scheduler...')

  try {
    // ตรวจสอบ environment variables ที่จำเป็น
    if (!process.env.CRON_SECRET) {
      console.error('❌ CRON_SECRET not configured')
      return {
        success: false,
        error: 'CRON_SECRET environment variable is required'
      }
    }

    const baseUrl = process.env.BASE_URL || process.env.NEXTAUTH_URL
    if (!baseUrl) {
      console.error('❌ BASE_URL or NEXTAUTH_URL not configured')
      return {
        success: false,
        error: 'BASE_URL or NEXTAUTH_URL environment variable is required'
      }
    }

    // 📊 Daily Analytics - รันทุกวันเวลา 01:00 น. (UTC+7)
    const dailyAnalyticsJob = cron.schedule('0 1 * * *', async () => {

      
      try {
        const startTime = Date.now()
        
        const response = await fetch(`${baseUrl}/api/cron/daily-analytics`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Internal-Scheduler/1.0'
          },
          timeout: 300000 // 5 minutes timeout
        })

        const executionTime = Date.now() - startTime

        if (response.ok) {
          const result = await response.json()
          console.log('✅ [CRON] Daily analytics completed successfully:', {
            processedDays: result.processedDays,
            totalRecords: result.totalUrlRecords,
            executionTime: result.executionTime,
            serverExecutionTime: `${executionTime}ms`,
            completedAt: new Date().toISOString()
          })
        } else {
          const errorText = await response.text()
          console.error('❌ [CRON] Analytics aggregation failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            executionTime: `${executionTime}ms`
          })
        }
      } catch (error) {
        console.error('💥 [CRON] Error running daily analytics:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        })
      }
    }, {
      scheduled: true,
      timezone: "Asia/Bangkok",
      name: 'daily-analytics'
    })

    scheduledJobs.set('daily-analytics', dailyAnalyticsJob)

    // 🧹 Weekly Cleanup - รันทุกวันอาทิตย์เวลา 02:00 น. (UTC+7)
    const weeklyCleanupJob = cron.schedule('0 2 * * 0', async () => {
      console.log('🧹 [CRON] Running weekly cleanup...')
      
      try {
        const startTime = Date.now()
        
        // ลบข้อมูล Click เก่าที่เก็บไว้เกิน 180 วัน (เพิ่มจาก 90 วัน)
        const cleanupDate = new Date()
        cleanupDate.setDate(cleanupDate.getDate() - 180)
        
        const { prisma } = await import('@/lib/db')
        
        // ลบ Click records เก่า
        const deletedClicks = await prisma.click.deleteMany({
          where: {
            clickedAt: {
              lt: cleanupDate
            }
          }
        })

        // ลบ Analytics records เก่าเกิน 1 ปี
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        
        const deletedAnalytics = await prisma.analytics.deleteMany({
          where: {
            date: {
              lt: oneYearAgo
            }
          }
        })

        const executionTime = Date.now() - startTime

        console.log('✅ [CRON] Weekly cleanup completed:', {
          deletedClicks: deletedClicks.count,
          deletedAnalytics: deletedAnalytics.count,
          cutoffDate: cleanupDate.toISOString(),
          executionTime: `${executionTime}ms`,
          completedAt: new Date().toISOString()
        })

      } catch (error) {
        console.error('💥 [CRON] Error running weekly cleanup:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        })
      }
    }, {
      scheduled: true,
      timezone: "Asia/Bangkok",
      name: 'weekly-cleanup'
    })

    scheduledJobs.set('weekly-cleanup', weeklyCleanupJob)

    // 📈 Health Check - รันทุก 30 นาที
    const healthCheckJob = cron.schedule('*/30 * * * *', async () => {
      console.log('💓 [CRON] System health check...')
      
      try {
        const startTime = Date.now()
        
        // เช็คว่า database connection ยังดีหรือไม่
        const { prisma } = await import('@/lib/db')
        await prisma.$queryRaw`SELECT 1 as health_check`
        
        // เช็คจำนวนข้อมูลพื้นฐาน
        const [urlCount, clickCount, analyticsCount] = await Promise.all([
          prisma.url.count(),
          prisma.click.count(),
          prisma.analytics.count()
        ])

        const executionTime = Date.now() - startTime

        console.log('✅ [CRON] System healthy:', {
          database: 'connected',
          urlsCount: urlCount,
          clicksCount: clickCount,
          analyticsCount: analyticsCount,
          executionTime: `${executionTime}ms`,
          checkTime: new Date().toISOString()
        })
        
      } catch (error) {
        console.error('🚨 [CRON] System health issue:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          type: 'database_connection_failed',
          timestamp: new Date().toISOString()
        })
      }
    }, {
      scheduled: true,
      timezone: "Asia/Bangkok",
      name: 'health-check'
    })

    scheduledJobs.set('health-check', healthCheckJob)

    // 🔄 Analytics Backfill - รันทุกวันเวลา 03:00 น. (เฉพาะวันจันทร์)
    const backfillJob = cron.schedule('0 3 * * 1', async () => {
      console.log('🔄 [CRON] Running weekly analytics backfill...')
      
      try {
        const startTime = Date.now()
        
        // รัน analytics สำหรับ 7 วันย้อนหลัง (เพื่อให้แน่ใจว่าไม่มีข้อมูลหลุด)
        const response = await fetch(`${baseUrl}/api/cron/daily-analytics?days=7&force=false`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Internal-Scheduler-Backfill/1.0'
          },
          timeout: 600000 // 10 minutes timeout for backfill
        })

        const executionTime = Date.now() - startTime

        if (response.ok) {
          const result = await response.json()
          console.log('✅ [CRON] Weekly backfill completed:', {
            processedDays: result.processedDays,
            totalRecords: result.totalUrlRecords,
            executionTime: result.executionTime,
            serverExecutionTime: `${executionTime}ms`,
            completedAt: new Date().toISOString()
          })
        } else {
          console.error('❌ [CRON] Backfill failed:', response.status)
        }
        
      } catch (error) {
        console.error('💥 [CRON] Error running backfill:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        })
      }
    }, {
      scheduled: true,
      timezone: "Asia/Bangkok",
      name: 'analytics-backfill'
    })

    scheduledJobs.set('analytics-backfill', backfillJob)

    schedulerInitialized = true

    return {
      success: true,
      message: 'Scheduler initialized successfully',
      jobs: scheduledJobs.size,
      environment: {
        timezone: 'Asia/Bangkok',
        baseUrl,
        cronSecretConfigured: !!process.env.CRON_SECRET
      }
    }

  } catch (error) {
    console.error('💥 Failed to initialize scheduler:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }
  }
}

export function getSchedulerStatus() {
  const jobs = [
    {
      name: 'Daily Analytics',
      key: 'daily-analytics',
      schedule: '0 1 * * *',
      description: 'Aggregate click data daily at 1:00 AM',
      timezone: 'Asia/Bangkok',
      frequency: 'Daily',
      active: scheduledJobs.has('daily-analytics')
    },
    {
      name: 'Weekly Cleanup', 
      key: 'weekly-cleanup',
      schedule: '0 2 * * 0',
      description: 'Clean old data every Sunday at 2:00 AM (180+ days)',
      timezone: 'Asia/Bangkok',
      frequency: 'Weekly (Sunday)',
      active: scheduledJobs.has('weekly-cleanup')
    },
    {
      name: 'Health Check',
      key: 'health-check', 
      schedule: '*/30 * * * *',
      description: 'System health check every 30 minutes',
      timezone: 'Asia/Bangkok',
      frequency: 'Every 30 minutes',
      active: scheduledJobs.has('health-check')
    },
    {
      name: 'Analytics Backfill',
      key: 'analytics-backfill',
      schedule: '0 3 * * 1', 
      description: 'Weekly analytics backfill every Monday at 3:00 AM',
      timezone: 'Asia/Bangkok',
      frequency: 'Weekly (Monday)',
      active: scheduledJobs.has('analytics-backfill')
    }
  ]

  return {
    initialized: schedulerInitialized,
    totalJobs: scheduledJobs.size,
    activeJobs: Array.from(scheduledJobs.keys()),
    jobs,
    timezone: 'Asia/Bangkok',
    nextRuns: {
      dailyAnalytics: getNextRunTime('0 1 * * *'),
      weeklyCleanup: getNextRunTime('0 2 * * 0'), 
      healthCheck: getNextRunTime('*/30 * * * *'),
      analyticsBackfill: getNextRunTime('0 3 * * 1')
    },
    systemInfo: {
      nodeEnv: process.env.NODE_ENV,
      uptime: process.uptime(),
      cronSecretConfigured: !!process.env.CRON_SECRET,
      baseUrlConfigured: !!(process.env.BASE_URL || process.env.NEXTAUTH_URL)
    }
  }
}

function getNextRunTime(cronPattern: string): string {
  try {
    // ใช้ node-cron เพื่อคำนวณเวลาถัดไป
    const task = cron.schedule(cronPattern, () => {}, { scheduled: false })
    
    // สำหรับการแสดงผล ใช้การคำนวณแบบง่าย
    const now = new Date()
    const bangkok = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}))
    
    switch (cronPattern) {
      case '0 1 * * *': // Daily at 1:00 AM
        const nextDaily = new Date(bangkok)
        nextDaily.setHours(1, 0, 0, 0)
        if (nextDaily <= bangkok) {
          nextDaily.setDate(nextDaily.getDate() + 1)
        }
        return nextDaily.toISOString()
        
      case '0 2 * * 0': // Sunday at 2:00 AM
        const nextSunday = new Date(bangkok)
        nextSunday.setHours(2, 0, 0, 0)
        const daysUntilSunday = (7 - nextSunday.getDay()) % 7
        if (daysUntilSunday === 0 && nextSunday <= bangkok) {
          nextSunday.setDate(nextSunday.getDate() + 7)
        } else {
          nextSunday.setDate(nextSunday.getDate() + daysUntilSunday)
        }
        return nextSunday.toISOString()
        
      case '*/30 * * * *': // Every 30 minutes
        const nextHalfHour = new Date(bangkok)
        const minutes = nextHalfHour.getMinutes()
        const nextMinute = minutes < 30 ? 30 : 0
        const nextHour = minutes < 30 ? nextHalfHour.getHours() : nextHalfHour.getHours() + 1
        nextHalfHour.setHours(nextHour, nextMinute, 0, 0)
        return nextHalfHour.toISOString()
        
      case '0 3 * * 1': // Monday at 3:00 AM  
        const nextMonday = new Date(bangkok)
        nextMonday.setHours(3, 0, 0, 0)
        const daysUntilMonday = (1 - nextMonday.getDay() + 7) % 7
        if (daysUntilMonday === 0 && nextMonday <= bangkok) {
          nextMonday.setDate(nextMonday.getDate() + 7)
        } else {
          nextMonday.setDate(nextMonday.getDate() + daysUntilMonday)
        }
        return nextMonday.toISOString()
        
      default:
        return 'Unable to calculate'
    }
  } catch (error) {
    console.error('Error calculating next run time:', error)
    return 'Calculation error'
  }
}

// ฟังก์ชันสำหรับ manual trigger jobs
export async function triggerJob(jobName: string) {
  console.log(`🔧 Manually triggering job: ${jobName}`)
  
  const baseUrl = process.env.BASE_URL || process.env.NEXTAUTH_URL
  if (!baseUrl || !process.env.CRON_SECRET) {
    return { 
      success: false, 
      error: 'BASE_URL or CRON_SECRET not configured' 
    }
  }

  try {
    switch (jobName) {
      case 'daily-analytics':
        const analyticsResponse = await fetch(`${baseUrl}/api/cron/daily-analytics`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Manual-Trigger/1.0'
          },
          timeout: 300000 // 5 minutes
        })
        
        return { 
          success: analyticsResponse.ok, 
          status: analyticsResponse.status,
          data: await analyticsResponse.json() 
        }

      case 'analytics-backfill':
        const backfillResponse = await fetch(`${baseUrl}/api/cron/daily-analytics?days=7&force=false`, {
          method: 'POST', 
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Manual-Trigger-Backfill/1.0'
          },
          timeout: 600000 // 10 minutes
        })
        
        return { 
          success: backfillResponse.ok,
          status: backfillResponse.status, 
          data: await backfillResponse.json() 
        }

      case 'health-check':
        const { prisma } = await import('@/lib/db')
        await prisma.$queryRaw`SELECT 1 as health_check`
        
        const [urlCount, clickCount] = await Promise.all([
          prisma.url.count(),
          prisma.click.count()
        ])

        return {
          success: true,
          data: {
            message: 'Health check completed',
            database: 'connected',
            urlsCount: urlCount,
            clicksCount: clickCount,
            timestamp: new Date().toISOString()
          }
        }

      case 'weekly-cleanup':
        // Manual cleanup trigger
        const { prisma: cleanupPrisma } = await import('@/lib/db')
        
        const cleanupDate = new Date()
        cleanupDate.setDate(cleanupDate.getDate() - 180)
        
        const deletedClicks = await cleanupPrisma.click.deleteMany({
          where: {
            clickedAt: {
              lt: cleanupDate
            }
          }
        })

        return {
          success: true,
          data: {
            message: 'Manual cleanup completed',
            deletedClicks: deletedClicks.count,
            cutoffDate: cleanupDate.toISOString(),
            timestamp: new Date().toISOString()
          }
        }
      
      default:
        return { 
          success: false, 
          error: `Unknown job name: ${jobName}`,
          availableJobs: ['daily-analytics', 'analytics-backfill', 'health-check', 'weekly-cleanup']
        }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }
  }
}

// ฟังก์ชันสำหรับหยุด scheduler (สำหรับ testing)
export function stopScheduler() {
  if (!schedulerInitialized) {
    return { success: false, message: 'Scheduler not initialized' }
  }

  scheduledJobs.forEach((job, name) => {
    job.stop()
    console.log(`⏹️ Stopped job: ${name}`)
  })
  
  scheduledJobs.clear()
  schedulerInitialized = false
  
  console.log('⏹️ Scheduler stopped')
  return { success: true, message: 'Scheduler stopped successfully' }
}

// ฟังก์ชันสำหรับ restart scheduler  
export function restartScheduler() {
  console.log('🔄 Restarting scheduler...')
  stopScheduler()
  return initializeScheduler()
}