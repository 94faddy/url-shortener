// /lib/scheduler.ts
import cron from 'node-cron'

let schedulerInitialized = false

export function initializeScheduler() {
  if (schedulerInitialized) {
    console.log('⏰ Scheduler already initialized')
    return
  }

  console.log('🚀 Initializing internal scheduler...')

  // 📊 Daily Analytics - รันทุกวันเวลา 01:00 น.
  cron.schedule('0 1 * * *', async () => {
    
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/cron/daily-analytics`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Daily analytics completed:', {
          processedDays: result.processedDays,
          totalRecords: result.totalUrlRecords,
          executionTime: result.executionTime
        })
      } else {
        const error = await response.text()
        console.error('❌ Analytics aggregation failed:', response.status, error)
      }
    } catch (error) {
      console.error('💥 Error running analytics:', error)
    }
  }, {
    scheduled: true,
    timezone: "Asia/Bangkok"
  })

  // 🧹 Weekly Cleanup - รันทุกวันอาทิตย์เวลา 02:00 น.
  cron.schedule('0 2 * * 0', async () => {
    console.log('🧹 Running weekly cleanup...')
    
    try {
      // ลบข้อมูล Click เก่าที่เก็บไว้เกิน 90 วัน
      const cleanupDate = new Date()
      cleanupDate.setDate(cleanupDate.getDate() - 90)
      
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/cron/cleanup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          olderThan: cleanupDate.toISOString() 
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Weekly cleanup completed:', result)
      } else {
        console.error('❌ Cleanup failed:', response.status)
      }
    } catch (error) {
      console.error('💥 Error running cleanup:', error)
    }
  }, {
    scheduled: true,
    timezone: "Asia/Bangkok"
  })

  // 📈 Health Check - รันทุก 30 นาที (เช็คว่าระบบยังทำงานหรือไม่)
  cron.schedule('*/30 * * * *', async () => {
    console.log('💓 System health check...')
    
    try {
      // เช็คว่า database connection ยังดีหรือไม่
      const { prisma } = await import('@/lib/db')
      await prisma.$queryRaw`SELECT 1`
      
      console.log('✅ System healthy')
    } catch (error) {
      console.error('🚨 System health issue:', error)
    }
  }, {
    scheduled: true,
    timezone: "Asia/Bangkok"
  })

  schedulerInitialized = true

}

export function getSchedulerStatus() {
  return {
    initialized: schedulerInitialized,
    jobs: [
      {
        name: 'Daily Analytics',
        schedule: '0 1 * * *',
        description: 'Aggregate click data daily at 1:00 AM',
        timezone: 'Asia/Bangkok'
      },
      {
        name: 'Weekly Cleanup',
        schedule: '0 2 * * 0',
        description: 'Clean old data every Sunday at 2:00 AM',
        timezone: 'Asia/Bangkok'
      },
      {
        name: 'Health Check',
        schedule: '*/30 * * * *',
        description: 'System health check every 30 minutes',
        timezone: 'Asia/Bangkok'
      }
    ],
    timezone: 'Asia/Bangkok',
    nextRuns: {
      dailyAnalytics: getNextRunTime('0 1 * * *'),
      weeklyCleanup: getNextRunTime('0 2 * * 0'),
      healthCheck: getNextRunTime('*/30 * * * *')
    }
  }
}

function getNextRunTime(cronPattern: string): string {
  try {
    // คำนวณเวลาที่จะรันครั้งถัดไป
    const now = new Date()
    // Logic สำหรับคำนวณ next run time
    return 'Calculated next run time'
  } catch (error) {
    return 'Unable to calculate'
  }
}

// ฟังก์ชันสำหรับ manual trigger (สำหรับ testing)
export async function triggerJob(jobName: string) {
  console.log(`🔧 Manually triggering job: ${jobName}`)
  
  switch (jobName) {
    case 'daily-analytics':
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/cron/daily-analytics`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            'Content-Type': 'application/json'
          }
        })
        return { success: response.ok, data: await response.json() }
      } catch (error) {
        return { success: false, error: error.message }
      }
    
    default:
      return { success: false, error: 'Unknown job name' }
  }
}