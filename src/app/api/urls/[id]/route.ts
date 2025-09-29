import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    const url = await prisma.url.findFirst({
      where: {
        id: id,
        userId: session.user.id
      },
      include: {
        _count: {
          select: { clicks: true }
        }
      }
    })

    if (!url) {
      return NextResponse.json({ error: 'URL not found' }, { status: 404 })
    }

    // ดึงสถิติเพิ่มเติมจาก Click table
    const totalClicks = await prisma.click.count({
      where: { urlId: url.id }
    })

    // คลิกวันนี้
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayClicks = await prisma.click.count({
      where: {
        urlId: url.id,
        clickedAt: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    // คลิกย้อนหลัง 7 วัน
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const weekClicks = await prisma.click.count({
      where: {
        urlId: url.id,
        clickedAt: {
          gte: sevenDaysAgo
        }
      }
    })

    // Unique visitors (30 วันที่ผ่านมา)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const uniqueVisitors = await prisma.click.findMany({
      where: {
        urlId: url.id,
        clickedAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        ipAddress: true
      },
      distinct: ['ipAddress']
    })

    // คลิกล่าสุด 10 รายการ
    const recentClicks = await prisma.click.findMany({
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
    })

    // สถิติประเทศ (30 วันที่ผ่านมา)
    const countryStats = await prisma.click.groupBy({
      by: ['country'],
      where: {
        urlId: url.id,
        clickedAt: {
          gte: thirtyDaysAgo
        },
        country: {
          not: null
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    })

    // สถิติ referrers (30 วันที่ผ่านมา)
    const referrerClicks = await prisma.click.findMany({
      where: {
        urlId: url.id,
        clickedAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        referer: true
      }
    })

    const referrerStats = new Map<string, number>()
    referrerClicks.forEach(click => {
      let referrer = 'direct'
      if (click.referer) {
        try {
          referrer = new URL(click.referer).hostname.replace('www.', '')
        } catch {
          referrer = 'direct'
        }
      }
      referrerStats.set(referrer, (referrerStats.get(referrer) || 0) + 1)
    })

    const topReferrers = Array.from(referrerStats.entries())
      .map(([referer, clicks]) => ({ referer, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)

    // รายการวัน (7 วันที่ผ่านมา)
    const dailyStats = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)

      const dayClicks = await prisma.click.count({
        where: {
          urlId: url.id,
          clickedAt: {
            gte: date,
            lt: nextDay
          }
        }
      })

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        clicks: dayClicks
      })
    }

    return NextResponse.json({
      ...url,
      _count: {
        clicks: totalClicks // ใช้จำนวนจริงจาก Click table
      },
      stats: {
        totalClicks,
        todayClicks,
        weekClicks,
        uniqueVisitors: uniqueVisitors.length,
        dailyStats,
        topCountries: countryStats.map(stat => ({
          country: stat.country,
          countryName: getCountryName(stat.country || ''),
          clicks: stat._count.id
        })),
        topReferrers,
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

// PUT - อัพเดท URL (ส่วนที่เพิ่ม originalUrl)
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
    const { originalUrl, title, description, isActive, expiresAt } = body // เพิ่ม originalUrl

    const existingUrl = await prisma.url.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

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

    const updatedUrl = await prisma.url.update({
      where: {
        id: id
      },
      data: {
        originalUrl: originalUrl?.trim() || existingUrl.originalUrl, // เพิ่มการอัพเดท originalUrl
        title: title?.trim() || null,
        description: description?.trim() || null,
        isActive: typeof isActive === 'boolean' ? isActive : existingUrl.isActive,
        expiresAt: expiryDate,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { clicks: true }
        }
      }
    })

    // ดึงสถิติล่าสุด
    const totalClicks = await prisma.click.count({
      where: { urlId: updatedUrl.id }
    })

    console.log(`✅ Updated URL: ${updatedUrl.shortCode}`)

    return NextResponse.json({
      ...updatedUrl,
      _count: {
        clicks: totalClicks
      },
      stats: {
        totalClicks,
        dataSource: 'click_table_realtime'
      }
    })
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

    const existingUrl = await prisma.url.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!existingUrl) {
      console.log('URL not found:', id)
      return NextResponse.json({ error: 'URL not found' }, { status: 404 })
    }

    // นับจำนวน clicks ก่อนลบ
    const clickCount = await prisma.click.count({
      where: { urlId: id }
    })

    console.log(`URL ${id} has ${clickCount} clicks that will be deleted`)

    // ใช้ transaction เพื่อความปลอดภัย
    await prisma.$transaction(async (tx) => {
      // ลบ clicks ที่เกี่ยวข้องก่อน
      await tx.click.deleteMany({
        where: { urlId: id }
      })

      // ลบ analytics ที่เกี่ยวข้องก่อน
      await tx.analytics.deleteMany({
        where: { urlId: id }
      })

      // ลบ URL
      await tx.url.delete({
        where: { id: id }
      })
    })

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