import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./db"
import bcrypt from "bcryptjs"

// สร้าง custom adapter สำหรับ hybrid approach
const createHybridAdapter = () => {
  const baseAdapter = PrismaAdapter(prisma)
  
  return {
    ...baseAdapter,
    // Override สำหรับ credentials - ไม่สร้าง session ใน database
    createSession: async (session: any) => {
      // ถ้าเป็น credentials provider ให้ใช้ JWT แทน
      console.log('🔧 Custom adapter: createSession called')
      return baseAdapter.createSession!(session)
    }
  }
}

export const authOptions: NextAuthOptions = {
  // ใช้ custom adapter เฉพาะ OAuth providers
  adapter: createHybridAdapter(),
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        }
      },
      httpOptions: {
        timeout: 10000,
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user || !user.password) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error("❌ Database error in authorize:", error)
          return null
        }
      }
    })
  ],
  
  // กำหนด session strategy แบบ conditional
  session: {
    strategy: "jwt", // ใช้ JWT เป็นหลัก (รองรับ credentials)
    maxAge: parseInt(process.env.SESSION_MAX_AGE || "7200"), // 2 hours
    updateAge: parseInt(process.env.SESSION_UPDATE_AGE || "1800"), // 30 minutes
  },
  
  jwt: {
    secret: process.env.NEXTAUTH_SECRET, // กำหนด secret อย่างชัดเจน
    maxAge: parseInt(process.env.SESSION_MAX_AGE || "7200"),
    // เพิ่ม encoding options เพื่อหลีกเลี่ยง JWE error
    encode: async ({ secret, token, maxAge }) => {
      const { encode } = await import("next-auth/jwt")
      return encode({ secret, token, maxAge })
    },
    decode: async ({ secret, token }) => {
      try {
        const { decode } = await import("next-auth/jwt")
        return await decode({ secret, token })
      } catch (error) {
        console.error("❌ JWT decode error:", error)
        // Return null แทน throw error เพื่อให้ NextAuth สร้าง session ใหม่
        return null
      }
    }
  },
  
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        const now = new Date()
        console.log(`🔐 SignIn attempt: ${user.email} via ${account?.provider} at ${now.toISOString()}`)
        
        // สำหรับ Google OAuth - ใช้ database session
        if (account?.provider === "google" && profile) {
          try {
            const existingUser = await prisma.user.findUnique({
              where: { email: user.email! }
            })

            if (existingUser) {
              await prisma.user.update({
                where: { email: user.email! },
                data: {
                  name: user.name,
                  image: user.image,
                  emailVerified: now,
                  updatedAt: now,
                }
              })
              user.id = existingUser.id
            }
            
            // ลบ sessions เก่าที่หมดอายุ
            if (user.id) {
              await prisma.session.deleteMany({
                where: {
                  userId: user.id,
                  expires: { lte: now }
                }
              })
              
            }
          } catch (dbError) {
            console.error("❌ Database error in Google OAuth:", dbError)
          }
        }
        
        // สำหรับ Credentials - จะใช้ JWT session
        if (account?.provider === "credentials") {
          console.log(`🎫 Credentials login will use JWT session for user: ${user.id}`)
        }
        
        console.log(`✅ SignIn successful: ${user.email} (ID: ${user.id})`)
        return true
      } catch (error) {
        console.error("❌ Error in signIn callback:", error)
        return false
      }
    },
    
    async session({ session, token, user }) {
      if (!session?.user) return session

      try {
        // สำหรับ database sessions (OAuth providers)
        if (user && !token) {
          session.user.id = user.id
          
          // ดึงข้อมูลล่าสุดจาก database
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              emailVerified: true,
            }
          })
          
          if (dbUser) {
            session.user.name = dbUser.name
            session.user.email = dbUser.email
            session.user.image = dbUser.image
          }
        } 
        // สำหรับ JWT sessions (Credentials provider)
        else if (token?.sub) {
          session.user.id = token.sub
          console.log(`🎫 Using JWT session for user: ${token.sub}`)
          
          // ดึงข้อมูลจาก database เพื่อ sync ข้อมูลล่าสุด
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.sub },
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                emailVerified: true,
              }
            })
            
            if (dbUser) {
              session.user.name = dbUser.name
              session.user.email = dbUser.email
              session.user.image = dbUser.image
            }
          } catch (dbError) {
            console.error("❌ Error fetching user data for JWT session:", dbError)
            // ใช้ข้อมูลจาก token แทน
            session.user.name = token.name as string
            session.user.email = token.email as string
          }
        }
        
        // กำหนดเวลาหมดอายุให้ชัดเจน
        if (!session.expires) {
          const maxAge = parseInt(process.env.SESSION_MAX_AGE || "7200")
          session.expires = new Date(Date.now() + (maxAge * 1000)).toISOString()
        }
        
      } catch (error) {
        console.error("❌ Error in session callback:", error)
      }
      
      return session
    },
    
    async jwt({ token, user, account, trigger }) {
      // เมื่อ user เข้าสู่ระบบครั้งแรก
      if (user && account) {
        const now = Math.floor(Date.now() / 1000)
        const maxAge = parseInt(process.env.SESSION_MAX_AGE || "7200")
        
        token.sub = user.id
        token.name = user.name
        token.email = user.email
        token.picture = user.image
        token.provider = account.provider
        token.iat = now
        token.exp = now + maxAge
        
        console.log(`🎫 JWT token created for ${user.email} via ${account.provider}`)
      }
      
      // สำหรับ update trigger
      if (trigger === "update" && token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            }
          })
          
          if (dbUser) {
            token.name = dbUser.name
            token.email = dbUser.email
            token.picture = dbUser.image
          }
        } catch (error) {
          console.error("❌ Error updating JWT token:", error)
        }
      }
      
      return token
    },
    
    async redirect({ url, baseUrl }) {
      const redirectUrl = url.startsWith("/") ? `${baseUrl}${url}` 
                        : new URL(url).origin === baseUrl ? url 
                        : baseUrl + "/dashboard"
      
      console.log(`🔄 Redirecting to: ${redirectUrl}`)
      return redirectUrl
    },
  },
  
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  
  events: {
    async signIn({ user, account, isNewUser }) {
      const now = new Date()
      console.log(`🔐 [${now.toISOString()}] User ${user.email} signed in via ${account?.provider}${isNewUser ? ' (new user)' : ''}`)
    },
    
    async signOut({ token }) {
      const now = new Date()
      console.log(`🚪 [${now.toISOString()}] User signed out`)
    },
    
    async createUser({ user }) {
      console.log(`✨ New user created: ${user.email}`)
    },
  },
  
  // Production-specific settings
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? ".ngrok-free.app" : undefined,
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Host-" : ""}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  
  debug: process.env.NODE_ENV === "development" || process.env.NEXTAUTH_DEBUG === "true",
  
  // กำหนด secret อย่างชัดเจนเพื่อหลีกเลี่ยง JWT errors
  secret: process.env.NEXTAUTH_SECRET,
}