import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"

export async function POST() {
  try {
    const now = new Date()
    
    // ลบ expired sessions จาก database
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        expires: {
          lte: now
        }
      }
    })
    
    // สร้าง response
    const response = NextResponse.json({ 
      success: true,
      message: "Sessions cleared successfully",
      deletedSessions: deletedSessions.count,
      timestamp: now.toISOString()
    })
    
    // ลบ NextAuth cookies
    const cookieStore = cookies()
    const cookiesToClear = [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.callback-url", 
      "__Secure-next-auth.callback-url",
      "next-auth.csrf-token",
      "__Host-next-auth.csrf-token",
      "next-auth.state",
      "next-auth.pkce.code_verifier"
    ]
    
    cookiesToClear.forEach(cookieName => {
      try {
        response.cookies.set(cookieName, '', {
          expires: new Date(0),
          path: '/',
          domain: process.env.NODE_ENV === "production" ? ".ngrok-free.app" : undefined,
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          sameSite: 'lax'
        })
      } catch (error) {
        console.log(`Could not clear cookie: ${cookieName}`)
      }
    })
    
    console.log(`🧹 Cleared ${deletedSessions.count} expired sessions and cookies`)
    
    return response
    
  } catch (error) {
    console.error("❌ Error clearing sessions:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString() 
      }, 
      { status: 500 }
    )
  }
}