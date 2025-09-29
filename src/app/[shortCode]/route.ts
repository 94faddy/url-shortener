import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// ดึง BASE_URL จาก environment variables
const BASE_URL = process.env.BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

// GET - Redirect และบันทึก click พร้อมข้อมูล location ที่ถูกต้อง
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params
    
    console.log('ShortCode received:', shortCode)

    // ค้นหา URL
    const url = await prisma.url.findUnique({
      where: {
        shortCode: shortCode
      }
    })

    if (!url) {
      console.log('ShortCode not found:', shortCode)
      return NextResponse.redirect(new URL('/404', BASE_URL))
    }

    console.log('URL found, redirecting to:', url.originalUrl)

    // ตรวจสอบว่า URL หมดอายุหรือไม่
    if (url.expiresAt && url.expiresAt < new Date()) {
      console.log('URL expired:', shortCode)
      return NextResponse.redirect(new URL('/expired', BASE_URL))
    }

    // ตรวจสอบว่า URL ถูก disable หรือไม่
    if (!url.isActive) {
      console.log('URL disabled:', shortCode)
      return NextResponse.redirect(new URL('/disabled', BASE_URL))
    }

    // ดึงข้อมูลสำหรับ analytics
    const userAgent = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    
    // ดึง IP address จากหลายแหล่ง (สำคัญสำหรับ production)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip')
    
    // หา IP address ที่แท้จริง (ลำดับความสำคัญ)
    let ipAddress = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || '127.0.0.1'
    ipAddress = ipAddress.trim()
    
    // แปลง IPv6 mapped IPv4 เป็น IPv4
    if (ipAddress.startsWith('::ffff:')) {
      ipAddress = ipAddress.substring(7)
    }

    // จัดการ IPv6 address
    const isIPv6 = ipAddress.includes(':') && !ipAddress.startsWith('::ffff:')
    let processedIP = ipAddress

    console.log('Detected IP:', ipAddress, 'IPv6:', isIPv6)

    // ดึงข้อมูล geolocation พร้อมการจัดการ timeout และ fallback
    let locationData = null
    
    try {
      // ตรวจสอบว่าเป็น IP ที่สามารถ geolocate ได้
      const isLocalIP = ipAddress === '127.0.0.1' || 
                       ipAddress === '::1' || 
                       ipAddress.startsWith('192.168.') || 
                       ipAddress.startsWith('10.') ||
                       ipAddress.startsWith('172.16.') ||
                       ipAddress.startsWith('172.17.') ||
                       ipAddress.startsWith('172.18.') ||
                       ipAddress.startsWith('172.19.') ||
                       ipAddress.startsWith('172.2') ||
                       ipAddress.startsWith('172.30.') ||
                       ipAddress.startsWith('172.31.')

      if (!isLocalIP && ipAddress) {
        console.log('Fetching location for IP:', ipAddress)
        
        // ลองใช้ geolocation services หลายตัว
        const geoServices = [
          {
            name: 'ip-api',
            url: `http://ip-api.com/json/${ipAddress}?fields=status,country,countryCode,region,regionName,city,timezone,lat,lon,isp,org`,
            timeout: 3000
          },
          {
            name: 'ipinfo',
            url: `https://ipinfo.io/${ipAddress}/json`,
            timeout: 4000
          },
          {
            name: 'ipapi',
            url: `https://ipapi.co/${ipAddress}/json/`,
            timeout: 5000
          }
        ]

        for (const service of geoServices) {
          try {
            console.log(`Trying ${service.name} for IP:`, ipAddress)
            
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), service.timeout)
            
            const headers: Record<string, string> = {
              'User-Agent': 'URL-Shortener/1.0'
            }

            // เพิ่ม API key สำหรับ ipinfo หากมี
            if (service.name === 'ipinfo' && process.env.IPINFO_TOKEN) {
              headers['Authorization'] = `Bearer ${process.env.IPINFO_TOKEN}`
            }
            
            const geoResponse = await fetch(service.url, {
              headers,
              signal: controller.signal
            })
            
            clearTimeout(timeoutId)
            
            if (geoResponse.ok) {
              const geoData = await geoResponse.json()
              console.log(`${service.name} response:`, geoData)
              
              // แปลงข้อมูลให้เป็นรูปแบบมาตรฐาน
              if (service.name === 'ip-api') {
                if (geoData.status === 'success') {
                  locationData = {
                    country_code: geoData.countryCode,
                    country_name: geoData.country,
                    region: geoData.regionName,
                    city: geoData.city,
                    timezone: geoData.timezone,
                    latitude: geoData.lat,
                    longitude: geoData.lon,
                    org: geoData.org || geoData.isp
                  }
                  break
                }
              } else if (service.name === 'ipinfo') {
                if (!geoData.error && geoData.country) {
                  const [lat, lon] = (geoData.loc || '0,0').split(',').map(Number)
                  locationData = {
                    country_code: geoData.country,
                    country_name: getCountryNameFromCode(geoData.country),
                    region: geoData.region,
                    city: geoData.city,
                    timezone: geoData.timezone,
                    latitude: lat || null,
                    longitude: lon || null,
                    org: geoData.org
                  }
                  break
                }
              } else if (service.name === 'ipapi') {
                if (!geoData.error && geoData.country_code) {
                  locationData = {
                    country_code: geoData.country_code,
                    country_name: geoData.country_name,
                    region: geoData.region,
                    city: geoData.city,
                    timezone: geoData.timezone,
                    latitude: geoData.latitude,
                    longitude: geoData.longitude,
                    org: geoData.org
                  }
                  break
                }
              }
            } else {
              console.log(`${service.name} API response not ok:`, geoResponse.status)
            }
          } catch (serviceError) {
            if (serviceError.name === 'AbortError') {
              console.log(`${service.name} request timed out`)
            } else {
              console.error(`${service.name} error:`, serviceError)
            }
            continue // ลองต่อกับ service ถัดไป
          }
        }

        // ถ้าทุก service ล้มเหลว แต่ไม่ใช่ local IP ให้ใส่ข้อมูลพื้นฐาน
        if (!locationData && !isLocalIP) {
          locationData = {
            country_code: null,
            country_name: null,
            region: null,
            city: null,
            timezone: null,
            latitude: null,
            longitude: null,
            org: 'Unknown'
          }
        }
      } else {
        console.log('Using local/private IP, setting to Thailand default')
        // สำหรับ localhost หรือ private network ให้ตั้งเป็นไทยเป็นค่าเริ่มต้น
        locationData = {
          country_code: 'TH',
          country_name: 'Thailand',
          city: 'Bangkok',
          region: 'Bangkok',
          timezone: 'Asia/Bangkok',
          latitude: 13.7563,
          longitude: 100.5018,
          org: 'Local Network'
        }
      }
    } catch (error) {
      console.error('Geolocation error:', error)
      locationData = null
    }

    // สร้าง timestamp ที่แม่นยำ (ใช้ timezone ของ server หรือ UTC)
    const clickedAt = new Date()

    // เตรียมข้อมูลสำหรับบันทึก
    const clickData = {
      urlId: url.id,
      userAgent: userAgent || null,
      referer: referer || null,
      ipAddress: ipAddress,
      country: locationData?.country_code || null,
      countryName: locationData?.country_name || null,
      region: locationData?.region || null,
      city: locationData?.city || null,
      timezone: locationData?.timezone || null,
      latitude: locationData?.latitude || null,
      longitude: locationData?.longitude || null,
      isp: locationData?.org || null,
      clickedAt: clickedAt
    }

    console.log('Saving click data:', clickData)

    // บันทึก click แบบ synchronous เพื่อให้แน่ใจว่าข้อมูลถูกบันทึก
    try {
      await prisma.click.create({
        data: clickData
      })
      console.log('Click recorded successfully for:', shortCode)
    } catch (clickError) {
      console.error('Error saving click:', clickError)
      // แม้จะบันทึกข้อมูลไม่ได้ก็ยัง redirect ต่อไป
    }

    // Redirect ไปยัง original URL
    return NextResponse.redirect(url.originalUrl, { status: 302 })

  } catch (error) {
    console.error('Error processing redirect:', error)
    return NextResponse.redirect(new URL('/?error=redirect-failed', BASE_URL))
  }
}

// Helper function สำหรับแปลง country code เป็น country name
function getCountryNameFromCode(countryCode: string): string {
  const countries: { [key: string]: string } = {
    'TH': 'Thailand',
    'US': 'United States',
    'GB': 'United Kingdom',
    'JP': 'Japan',
    'CN': 'China',
    'KR': 'South Korea',
    'SG': 'Singapore',
    'MY': 'Malaysia',
    'ID': 'Indonesia',
    'VN': 'Vietnam',
    'PH': 'Philippines',
    'IN': 'India',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'CA': 'Canada',
    'BR': 'Brazil',
    'IT': 'Italy',
    'ES': 'Spain',
    'NL': 'Netherlands',
    'RU': 'Russia'
  }
  return countries[countryCode] || countryCode
}