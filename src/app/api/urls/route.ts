import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateShortCode, isValidUrl, formatUrl } from '@/lib/utils'

// GET - ดึงรายการ URL ของ user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const urls = await prisma.url.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        _count: {
          select: { clicks: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    const total = await prisma.url.count({
      where: {
        userId: session.user.id
      }
    })

    return NextResponse.json({
      urls,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching URLs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - สร้าง URL ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { originalUrl, customCode, title, description, expiresAt } = body

    // ตรวจสอบ URL
    if (!originalUrl || !isValidUrl(originalUrl)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // สร้าง short code
    let shortCode = customCode
    if (!shortCode) {
      do {
        shortCode = generateShortCode(6)
      } while (await prisma.url.findUnique({ where: { shortCode } }))
    } else {
      // ตรวจสอบว่า custom code ซ้ำหรือไม่
      const existingUrl = await prisma.url.findUnique({ where: { shortCode } })
      if (existingUrl) {
        return NextResponse.json({ error: 'Short code already exists' }, { status: 400 })
      }
    }

    const url = await prisma.url.create({
      data: {
        originalUrl: formatUrl(originalUrl),
        shortCode,
        title,
        description,
        userId: session.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      include: {
        _count: {
          select: { clicks: true }
        }
      }
    })

    return NextResponse.json(url, { status: 201 })
  } catch (error) {
    console.error('Error creating URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}