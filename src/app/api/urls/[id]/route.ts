import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, executeWithRetry } from '@/lib/db'

// GET - ดึงข้อมูล URL แต่ละตัวพร้อมสถิติที่แม่นยำ
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const url = await executeWithRetry(
      () => prisma.url.findFirst({
        where: {
          id: id,
          userId: session.user.id
        },
        include: {
          _count: {
            select: { clicks: true }
          }
        }
      }),
      { operationName: 'Fetch URL details' }
    )

    if (!url) {
      return NextResponse.json({ error: 'URL not found' }, { status: 404 })
    }

    // ดึงสถิติเพิ่มเติมจาก Click table
    const [totalClicks, todayClicks, weekClicks, uniqueVisitors, recentClicks, countryStats] = await Promise.all([
      executeWithRetry(
        () => prisma.click.count({ where: { urlId: url.id } }),
        { operationName: 'Count total clicks' }
      ),
      
      // คลิกวันนี้
      executeWithRetry(
        () => {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          
          return prisma.click.count({
            where: {
              urlId: url.id,
              clickedAt: { gte: today, lt: tomorrow }
            }
          })
        },
        { operationName: 'Count today clicks' }
      ),
      
      // คลิกย้อนหลัง 7 วัน
      executeWithRetry(
        () => {
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          sevenDaysAgo.setHours(0, 0, 0, 0)
          
          return prisma.click.count({
            where: {
              urlId: url.id,
              clickedAt: { gte: sevenDaysAgo }
            }
          })
        },
        { operationName: 'Count week clicks' }
      ),
      
      // Unique visitors (30 วันที่ผ่านมา)
      executeWithRetry(
        () => {
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          thirtyDaysAgo.setHours(0, 0, 0, 0)
          
          return prisma.click.findMany({
            where: {
              urlId: url.id,
              clickedAt: { gte: thirtyDaysAgo }
            },
            select: { ipAddress: true },
            distinct: ['ipAddress']
          })
        },
        { operationName: 'Fetch unique visitors' }
      ),
      
      // คลิกล่าสุด 10 รายการ
      executeWithRetry(
        () => prisma.click.findMany({
          where: { urlId: url.id },
          orderBy: { clickedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            clickedAt: true,
            country: true,
            countryName: true,
            city: true,
            referer: true,
            userAgent: true,
            ipAddress: true
          }
        }),
        { operationName: 'Fetch recent clicks' }
      ),
      
      // สถิติประเทศ (30 วันที่ผ่านมา)
      executeWithRetry(
        () => {
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          thirtyDaysAgo.setHours(0, 0, 0, 0)
          
          return prisma.click.groupBy({
            by: ['country'],
            where: {
              urlId: url.id,
              clickedAt: { gte: thirtyDaysAgo },
              country: { not: null }
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
          })
        },
        { operationName: 'Fetch country stats' }
      )
    ])

    return NextResponse.json({
      ...url,
      _count: { clicks: totalClicks },
      stats: {
        totalClicks,
        todayClicks,
        weekClicks,
        uniqueVisitors: uniqueVisitors.length,
        topCountries: countryStats.map(stat => ({
          country: stat.country,
          countryName: getCountryName(stat.country || ''),
          clicks: stat._count.id
        })),
        recentClicks,
        dataSource: 'click_table_realtime'
      }
    })
  } catch (error) {
    console.error('Error fetching URL:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}

// PUT - อัพเดท URL
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { originalUrl, title, description, isActive, expiresAt } = body

    const existingUrl = await executeWithRetry(
      () => prisma.url.findFirst({
        where: {
          id: id,
          userId: session.user.id
        }
      }),
      { operationName: 'Find existing URL for update' }
    )

    if (!existingUrl) {
      return NextResponse.json({ error: 'URL not found' }, { status: 404 })
    }

    // ตรวจสอบ originalUrl ถ้ามีการส่งมา
    if (originalUrl) {
      try {
        const url = new URL(originalUrl)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return NextResponse.json({ 
            error: 'URL must start with http:// or https://' 
          }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ 
          error: 'Invalid URL format' 
        }, { status: 400 })
      }
    }

    // ตรวจสอบวันหมดอายุ
    let expiryDate = null
    if (expiresAt) {
      expiryDate = new Date(expiresAt)
      if (expiryDate <= new Date()) {
        return NextResponse.json({ 
          error: 'Expiry date must be in the future' 
        }, { status: 400 })
      }
    }

    const updatedUrl = await executeWithRetry(
      () => prisma.url.update({
        where: { id: id },
        data: {
          originalUrl: originalUrl?.trim() || existingUrl.originalUrl,
          title: title?.trim() || null,
          description: description?.trim() || null,
          isActive: typeof isActive === 'boolean' ? isActive : existingUrl.isActive,
          expiresAt: expiryDate,
          updatedAt: new Date()
        },
        include: {
          _count: { select: { clicks: true } }
        }
      }),
      { operationName: 'Update URL' }
    )

    console.log(`✅ Updated URL: ${updatedUrl.shortCode}`)

    return NextResponse.json(updatedUrl)
  } catch (error) {
    console.error('Error updating URL:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}

// DELETE - ลบ URL
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    console.log('Attempting to delete URL:', id, 'for user:', session.user.id)

    const existingUrl = await executeWithRetry(
      () => prisma.url.findFirst({
        where: {
          id: id,
          userId: session.user.id
        }
      }),
      { operationName: 'Find URL for deletion' }
    )

    if (!existingUrl) {
      console.log('URL not found:', id)
      return NextResponse.json({ error: 'URL not found' }, { status: 404 })
    }

    // นับจำนวน clicks ก่อนลบ
    const clickCount = await executeWithRetry(
      () => prisma.click.count({ where: { urlId: id } }),
      { operationName: 'Count clicks before deletion' }
    )

    console.log(`URL ${id} has ${clickCount} clicks that will be deleted`)

    // ใช้ transaction พร้อม retry เพื่อความปลอดภัย
    await executeWithRetry(
      () => prisma.$transaction(async (tx) => {
        // ลบ clicks ที่เกี่ยวข้องก่อน
        await tx.click.deleteMany({
          where: { urlId: id }
        })

        // ลบ analytics ที่เกี่ยวข้อง
        await tx.analytics.deleteMany({
          where: { urlId: id }
        })

        // ลบ URL
        await tx.url.delete({
          where: { id: id }
        })
      }),
      { operationName: 'Delete URL transaction', maxRetries: 3, delay: 1000 }
    )

    console.log(`✅ URL deleted successfully: ${id} (removed ${clickCount} clicks)`)
    
    return NextResponse.json({ 
      message: 'URL deleted successfully',
      deletedData: {
        urlId: id,
        shortCode: existingUrl.shortCode,
        clicksRemoved: clickCount
      }
    })

  } catch (error) {
    console.error('Error deleting URL:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}

// Helper function สำหรับแปลง country code เป็น country name
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
    'MM': 'พม่า'
  }
  return countries[countryCode] || countryCode
}