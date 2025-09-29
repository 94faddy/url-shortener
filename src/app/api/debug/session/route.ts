import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    const now = new Date()
    
    // ข้อมูล session จาก NextAuth
    const sessionInfo = {
      session: session,
      jwt_token: token,
      timestamp: now.toISOString(),
      hasUser: !!session?.user,
      userId: session?.user?.id,
      expires: session?.expires,
      sessionStrategy: session?.user?.id ? (token ? 'hybrid' : 'database') : (token ? 'jwt' : 'none'),
    }
    
    // ถ้ามี user ให้ดึงข้อมูลจาก database
    let dbInfo = null
    if (session?.user?.id || token?.sub) {
      const userId = session?.user?.id || token?.sub
      
      try {
        // ข้อมูล user จาก database
        const user = await prisma.user.findUnique({
          where: { id: userId as string },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
          }
        })
        
        // ข้อมูล sessions จาก database (สำหรับ OAuth)
        const sessions = await prisma.session.findMany({
          where: { userId: userId as string },
          select: {
            id: true,
            sessionToken: true,
            expires: true,
          }
        })
        
        // ข้อมูล accounts
        const accounts = await prisma.account.findMany({
          where: { userId: userId as string },
          select: {
            id: true,
            provider: true,
            type: true,
            providerAccountId: true,
          }
        })
        
        dbInfo = {
          user,
          sessions: sessions.map(s => ({
            id: s.id,
            expires: s.expires.toISOString(),
            expired: s.expires <= now,
            sessionToken: s.sessionToken.substring(0, 20) + '...'
          })),
          accounts,
          validSessionCount: sessions.filter(s => s.expires > now).length,
          expiredSessionCount: sessions.filter(s => s.expires <= now).length,
          loginMethod: accounts.length > 0 ? accounts.map(a => a.provider).join(', ') : 'credentials',
        }
      } catch (error) {
        dbInfo = { error: error.message }
      }
    }
    
    return NextResponse.json({ 
      ...sessionInfo,
      database: dbInfo,
      explanation: {
        jwt_strategy: "Used for credentials provider - stores session data in encrypted cookie",
        database_strategy: "Used for OAuth providers - stores session in database with session ID in cookie", 
        hybrid_approach: "OAuth uses database sessions, credentials use JWT sessions",
        current_session_type: sessionInfo.sessionStrategy
      }
    }, { 
      status: 200 
    })
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: error.message,
        timestamp: new Date().toISOString() 
      }, 
      { status: 500 }
    )
  }
}